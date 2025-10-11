import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import { calcOrderPrice } from '../utils/pricing.js';
import { io } from '../index.js';

/**
 * LUỒNG 1: KHÁCH HÀNG TẠO ĐƠN HÀNG
 * Khách hàng đặt xe -> Tạo đơn hàng với trạng thái "Created" -> Hiển thị trong "Đơn có sẵn" của tài xế
 * - Tính toán giá cả dựa trên loại xe, khoảng cách, trọng lượng
 * - Kiểm tra có xe phù hợp không
 * - Phát tín hiệu realtime cho tài xế về đơn mới
 */
export const createOrder = async (req, res) => {
   try {
      const { pickupAddress, dropoffAddress, items, customerNote, paymentMethod = 'Cash' } = req.body;

      // Validate địa chỉ
      if (!pickupAddress || !dropoffAddress) {
         return res.status(400).json({ success: false, message: 'Thiếu địa chỉ lấy/giao' });
      }

      // Validate danh sách items
      if (!Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ success: false, message: 'Thiếu danh sách items' });
      }

      const mapped = [];
      let totalPrice = 0;

      // Xử lý từng item trong đơn hàng
      for (const it of items) {
         const { vehicleType, weightKg, distanceKm, loadingService, insurance, itemPhotos } = it || {};

         // Validate thông tin item
         if (!vehicleType || !weightKg || !distanceKm) {
            return res.status(400).json({ success: false, message: 'Item thiếu vehicleType/weightKg/distanceKm' });
         }

         // Kiểm tra có xe phù hợp với yêu cầu không
         const anyVehicle = await Vehicle.findOne({
            type: vehicleType,
            maxWeightKg: { $gte: weightKg },
            status: 'Active'
         });
         if (!anyVehicle) {
            return res.status(400).json({
               success: false,
               message: `Không có xe phù hợp cho trọng lượng ${weightKg}kg (type ${vehicleType})`
            });
         }

         // Tính toán giá cả
         const insuranceFee = insurance ? 100000 : 0; // 100k phí bảo hiểm
         const loadingFee = loadingService ? 50000 : 0; // 50k phí bốc xếp
         const breakdown = calcOrderPrice({ weightKg, distanceKm, loadingService, loadingFee, insuranceFee });
         totalPrice += breakdown.total;

         // Tạo item với trạng thái "Created" (Đơn có sẵn)
         mapped.push({
            vehicleType,
            weightKg,
            distanceKm,
            loadingService: !!loadingService,
            insurance: !!insurance,
            priceBreakdown: breakdown,
            status: 'Created', // Trạng thái ban đầu: Đơn có sẵn
            itemPhotos: Array.isArray(itemPhotos) ? itemPhotos : []
         });
      }

      // Tạo đơn hàng
      const order = await Order.create({
         customerId: req.user._id,
         pickupAddress,
         dropoffAddress,
         items: mapped,
         totalPrice,
         customerNote,
         paymentMethod,
         paymentStatus: 'Pending'
      });

      // Phát tín hiệu realtime cho tài xế: Có đơn mới trong "Đơn có sẵn"
      try {
         io.to('drivers').emit('order:available:new', {
            orderId: order._id,
            pickupAddress: order.pickupAddress,
            dropoffAddress: order.dropoffAddress,
            totalPrice: order.totalPrice,
            createdAt: order.createdAt
         });
         console.log('📡 Đã phát tín hiệu đơn mới cho tài xế');
      } catch (emitError) {
         console.error('Lỗi phát tín hiệu:', emitError);
      }

      console.log('✅ Tạo đơn hàng thành công:', order._id);
      return res.status(201).json({ success: true, data: order });
   } catch (error) {
      console.error('❌ Lỗi tạo đơn:', error);
      return res.status(500).json({ success: false, message: 'Lỗi tạo đơn', error: error.message });
   }
};

// Driver bật/tắt online
export const setDriverOnline = async (req, res) => {
   try {
      const { online } = req.body;
      const driver = await Driver.findOneAndUpdate(
         { userId: req.user._id },
         { $set: { isOnline: !!online, lastOnlineAt: new Date() } },
         { new: true }
      );

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      return res.json({ success: true, data: driver });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái tài xế', error: error.message });
   }
};

/**
 * LUỒNG 2: TÀI XẾ NHẬN ĐƠN HÀNG
 * Khi tài xế nhận đơn từ "Đơn có sẵn" -> chuyển sang "Đơn đã nhận"
 * - Item status: Created -> Accepted
 * - Gán driverId cho item
 * - Cập nhật trạng thái tổng của đơn hàng
 */
export const acceptOrderItem = async (req, res) => {
   try {
      const { orderId, itemId } = req.params;

      // Tìm thông tin tài xế từ user đã đăng nhập
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      // Tìm đơn hàng
      const order = await Order.findById(orderId);
      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      // Tìm item trong đơn hàng
      const item = order.items.id(itemId);
      if (!item) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy mục hàng' });
      }

      // Kiểm tra item phải ở trạng thái "Created" mới có thể nhận
      if (item.status !== 'Created') {
         return res.status(400).json({ success: false, message: 'Mục hàng này không thể nhận' });
      }

      // Cập nhật thông tin item: gán tài xế và chuyển trạng thái sang "Accepted"
      item.driverId = driver._id;
      item.status = 'Accepted';
      item.acceptedAt = new Date();

      await order.save();

      // Cập nhật trạng thái tổng của đơn hàng (Created -> InProgress)
      console.log('🔄 Đang cập nhật trạng thái tổng của đơn hàng...');
      await updateOrderStatus(orderId);

      // Lấy lại đơn hàng đã cập nhật để trả về
      const updatedOrder = await Order.findById(orderId)
         .populate('customerId', 'name phone email')
         .populate({
            path: 'items.driverId',
            populate: {
               path: 'userId',
               select: 'name phone avatarUrl'
            }
         });

      console.log('✅ Tài xế nhận đơn thành công:', {
         orderId,
         itemId,
         driverId: driver._id,
         orderStatus: updatedOrder.status
      });

      return res.json({ success: true, data: updatedOrder });
   } catch (error) {
      console.error('❌ Lỗi nhận đơn hàng:', error);
      return res.status(500).json({ success: false, message: 'Lỗi nhận đơn hàng', error: error.message });
   }
};

/**
 * LUỒNG 3: TÀI XẾ CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
 * Từ "Đơn đã nhận" -> "Đơn đang giao" -> "Đã hoàn thành" hoặc "Đơn hủy"
 * 
 * Trạng thái có thể cập nhật:
 * - PickedUp: Đã lấy hàng
 * - Delivering: Đang giao hàng (hiển thị trong "Đơn đang giao")
 * - Delivered: Đã giao hàng (hiển thị trong "Đã hoàn thành")
 * - Cancelled: Hủy đơn (hiển thị trong "Đơn hủy")
 */
export const updateOrderItemStatus = async (req, res) => {
   try {
      const { orderId, itemId } = req.params;
      const { status } = req.body;

      // Tìm thông tin tài xế
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(400).json({ success: false, message: 'Chưa có hồ sơ tài xế' });
      }

      // Kiểm tra trạng thái hợp lệ
      const allowed = ['PickedUp', 'Delivering', 'Delivered', 'Cancelled'];
      if (!allowed.includes(status)) {
         return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }

      // Chuẩn bị fields cần cập nhật
      const updateFields = {};
      updateFields['items.$.status'] = status;

      // Cập nhật thời gian tương ứng với từng trạng thái
      if (status === 'PickedUp') updateFields['items.$.pickedUpAt'] = new Date();
      if (status === 'Delivered') updateFields['items.$.deliveredAt'] = new Date();
      if (status === 'Cancelled') updateFields['items.$.cancelledAt'] = new Date();

      // Cập nhật item trong đơn hàng
      const order = await Order.findOneAndUpdate(
         { _id: orderId, 'items._id': itemId, 'items.driverId': driver._id },
         { $set: updateFields },
         { new: true }
      );

      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy item phù hợp' });
      }

      // Nếu đã giao hàng thành công -> Tạo giao dịch thu nhập cho tài xế
      if (status === 'Delivered') {
         const item = order.items.find(i => String(i._id) === String(itemId));
         if (item && item.priceBreakdown && item.priceBreakdown.total) {
            const amount = item.priceBreakdown.total;
            const fee = Math.round(amount * 0.2); // 20% hoa hồng cho hệ thống
            const netAmount = amount - fee; // Số tiền tài xế nhận được

            // Tạo giao dịch thu nhập
            await DriverTransaction.create({
               driverId: driver._id,
               orderId: order._id,
               orderItemId: itemId,
               amount,
               fee,
               netAmount,
               type: 'OrderEarning',
               status: 'Completed',
               description: `Thu nhập từ đơn hàng #${order._id}`
            });

            // Cập nhật số dư và số chuyến của tài xế
            await Driver.findByIdAndUpdate(driver._id, {
               $inc: { incomeBalance: netAmount, totalTrips: 1 }
            });

            console.log('💰 Đã tạo giao dịch thu nhập cho tài xế:', {
               driverId: driver._id,
               amount,
               netAmount
            });
         }
      }

      // Cập nhật trạng thái tổng của đơn hàng
      await updateOrderStatus(orderId);

      console.log(`✅ Cập nhật trạng thái thành công: ${status}`, { orderId, itemId });
      return res.json({ success: true, data: order });
   } catch (error) {
      console.error('❌ Lỗi cập nhật trạng thái:', error);
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đơn', error: error.message });
   }
};

// Lấy danh sách đơn hàng cho khách hàng
export const getCustomerOrders = async (req, res) => {
   try {
      const { status, page = 1, limit = 10 } = req.query;
      const query = { customerId: req.user._id };

      if (status && ['Created', 'InProgress', 'Completed', 'Cancelled'].includes(status)) {
         query.status = status;
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
         Order.find(query)
            .populate({
               path: 'items.driverId',
               select: 'userId rating totalTrips avatarUrl',
               populate: {
                  path: 'userId',
                  select: 'name phone avatarUrl'
               }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         Order.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: orders,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng', error: error.message });
   }
};

// Lấy chi tiết đơn hàng
export const getOrderDetail = async (req, res) => {
   try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId)
         .populate('customerId', 'name phone email')
         .populate('items.driverId', 'userId rating totalTrips');

      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      // Kiểm tra quyền xem đơn
      const isCustomer = String(order.customerId._id) === String(req.user._id);
      const isDriver = order.items.some(item =>
         item.driverId && String(item.driverId.userId) === String(req.user._id)
      );
      const isAdmin = req.user.role === 'Admin' || (Array.isArray(req.user.roles) && req.user.roles.includes('Admin'));

      if (!isCustomer && !isDriver && !isAdmin) {
         return res.status(403).json({ success: false, message: 'Không có quyền xem đơn hàng này' });
      }

      return res.json({ success: true, data: order });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đơn hàng', error: error.message });
   }
};

// Lấy danh sách đơn hàng cho tài xế
export const getDriverOrders = async (req, res) => {
   try {
      const { status, page = 1, limit = 10 } = req.query;
      const driver = await Driver.findOne({ userId: req.user._id });

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      const query = { 'items.driverId': driver._id };

      if (status) {
         const statusArray = status.split(',');
         query['items.status'] = { $in: statusArray };
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
         Order.find(query)
            .populate('customerId', 'name phone email avatarUrl')
            .populate({
               path: 'items.driverId',
               populate: {
                  path: 'userId',
                  select: 'name phone avatarUrl'
               }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         Order.countDocuments(query)
      ]);

      console.log(`📦 [getDriverOrders] Lấy đơn hàng cho tài xế:`, {
         driverId: driver._id,
         status: status || 'all',
         count: orders.length,
         total
      });

      return res.json({
         success: true,
         data: orders,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng', error: error.message });
   }
};

// Lấy danh sách đơn hàng có sẵn cho tài xế
export const getAvailableOrders = async (req, res) => {
   try {
      const { page = 1, limit = 10 } = req.query;
      const driver = await Driver.findOne({ userId: req.user._id });

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      // Kiểm tra tài xế có đang có đơn active không
      const hasActiveOrder = await Order.findOne({
         'items.driverId': driver._id,
         'items.status': { $in: ['Accepted', 'PickedUp', 'Delivering'] }
      });

      if (hasActiveOrder) {
         return res.status(400).json({ success: false, message: 'Bạn đang có đơn hoạt động, không thể nhận thêm' });
      }

      // Lấy thông tin xe của tài xế
      const vehicle = await Vehicle.findOne({ driverId: driver._id, status: 'Active' });

      if (!vehicle) {
         return res.status(400).json({ success: false, message: 'Bạn chưa có xe hoạt động' });
      }

      // Tìm các đơn phù hợp với loại xe và trọng tải
      const query = {
         'items.status': 'Created',
         'items.vehicleType': vehicle.type,
         'items.weightKg': { $lte: vehicle.maxWeightKg }
      };

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
         Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('customerId', 'name'),
         Order.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: orders,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng', error: error.message });
   }
};

// Khách hàng hủy đơn hàng nếu chưa có tài xế nhận
export const cancelOrder = async (req, res) => {
   try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      // Kiểm tra quyền hủy đơn hàng
      if (String(order.customerId) !== String(req.user._id)) {
         return res.status(403).json({ success: false, message: 'Không có quyền hủy đơn hàng này' });
      }

      // Kiểm tra trạng thái đơn hàng
      const hasAcceptedItems = order.items.some(item => item.status !== 'Created');
      if (hasAcceptedItems) {
         return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng đã có tài xế nhận' });
      }

      // Xóa đơn hàng nếu chưa có tài xế nhận
      await Order.findByIdAndDelete(orderId);

      return res.json({ success: true, message: 'Đơn hàng đã được hủy và xóa thành công' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi hủy đơn hàng', error: error.message });
   }
};

// Customer cập nhật thông tin bảo hiểm cho đơn hàng
export const updateOrderInsurance = async (req, res) => {
   try {
      const { orderId } = req.params;
      const { itemId, insurance } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      // Kiểm tra quyền cập nhật (chỉ customer sở hữu đơn)
      if (String(order.customerId) !== String(req.user._id)) {
         return res.status(403).json({ success: false, message: 'Không có quyền cập nhật đơn hàng này' });
      }

      // Kiểm tra trạng thái đơn hàng (chỉ cho phép cập nhật khi đơn ở trạng thái Created)
      if (order.status !== 'Created') {
         return res.status(400).json({
            success: false,
            message: 'Chỉ có thể cập nhật bảo hiểm khi đơn hàng ở trạng thái Created'
         });
      }

      // Tìm item cần cập nhật
      const item = order.items.find(item => String(item._id) === String(itemId));
      if (!item) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy item trong đơn hàng' });
      }

      // Kiểm tra item chưa được tài xế nhận
      if (item.status !== 'Created') {
         return res.status(400).json({
            success: false,
            message: 'Không thể cập nhật bảo hiểm cho item đã được tài xế nhận'
         });
      }

      // Tính lại giá với bảo hiểm mới
      const insuranceFee = insurance ? 100000 : 0;
      const loadingFee = item.loadingService ? 50000 : 0;
      const breakdown = calcOrderPrice({
         weightKg: item.weightKg,
         distanceKm: item.distanceKm,
         loadingService: item.loadingService,
         loadingFee,
         insuranceFee
      });

      // Cập nhật item
      await Order.findOneAndUpdate(
         { _id: orderId, 'items._id': itemId },
         {
            $set: {
               'items.$.insurance': !!insurance,
               'items.$.priceBreakdown': breakdown
            }
         }
      );

      // Tính lại tổng giá đơn hàng
      const updatedOrder = await Order.findById(orderId);
      const newTotalPrice = updatedOrder.items.reduce((total, item) => {
         return total + (item.priceBreakdown?.total || 0);
      }, 0);

      await Order.findByIdAndUpdate(orderId, { totalPrice: newTotalPrice });

      const finalOrder = await Order.findById(orderId);

      return res.json({
         success: true,
         message: 'Cập nhật bảo hiểm thành công',
         data: finalOrder
      });
   } catch (error) {
      return res.status(500).json({
         success: false,
         message: 'Lỗi cập nhật bảo hiểm',
         error: error.message
      });
   }
};

/**
 * HÀM HELPER: CẬP NHẬT TRẠNG THÁI TỔNG CỦA ĐƠN HÀNG
 * Tự động cập nhật trạng thái tổng của đơn hàng dựa trên trạng thái của các items
 * 
 * Logic:
 * - Nếu TẤT CẢ items đã hoàn thành -> Đơn hàng "Completed"
 * - Nếu TẤT CẢ items đã hủy -> Đơn hàng "Cancelled"
 * - Nếu có ÍT NHẤT 1 item đang active (Accepted/PickedUp/Delivering) -> Đơn hàng "InProgress"
 * - Mặc định -> "Created"
 */
async function updateOrderStatus(orderId) {
   try {
      const order = await Order.findById(orderId);
      if (!order) return;

      // Kiểm tra: Tất cả items đã hoàn thành -> Đơn "Completed"
      const allDelivered = order.items.every(item => item.status === 'Delivered');
      if (allDelivered) {
         order.status = 'Completed';
         await order.save();
         console.log(`🎉 Đơn hàng ${orderId} đã hoàn thành tất cả items`);
         return;
      }

      // Kiểm tra: Tất cả items đã hủy -> Đơn "Cancelled"
      const allCancelled = order.items.every(item => item.status === 'Cancelled');
      if (allCancelled) {
         order.status = 'Cancelled';
         await order.save();
         console.log(`❌ Đơn hàng ${orderId} đã bị hủy toàn bộ`);
         return;
      }

      // Kiểm tra: Có ít nhất 1 item đang hoạt động -> Đơn "InProgress"
      const anyActive = order.items.some(item =>
         ['Accepted', 'PickedUp', 'Delivering'].includes(item.status)
      );
      if (anyActive) {
         order.status = 'InProgress';
         await order.save();
         console.log(`🚚 Đơn hàng ${orderId} đang được xử lý`);
      }
   } catch (error) {
      console.error('❌ Lỗi cập nhật trạng thái đơn hàng:', error);
   }
}