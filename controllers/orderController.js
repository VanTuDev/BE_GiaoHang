import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import { calcOrderPrice } from '../utils/pricing.js';

// Customer tạo đơn (nhiều item)
export const createOrder = async (req, res) => {
   try {
      const { pickupAddress, dropoffAddress, items, customerNote, paymentMethod = 'Cash' } = req.body;
      if (!pickupAddress || !dropoffAddress) {
         return res.status(400).json({ success: false, message: 'Thiếu địa chỉ lấy/giao' });
      }

      if (!Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ success: false, message: 'Thiếu danh sách items' });
      }

      const mapped = [];
      let totalPrice = 0;
      for (const it of items) {
         const { vehicleType, weightKg, distanceKm, loadingService, insurance, itemPhotos } = it || {};
         if (!vehicleType || !weightKg || !distanceKm) {
            return res.status(400).json({ success: false, message: 'Item thiếu vehicleType/weightKg/distanceKm' });
         }

         // optional: kiểm tra có xe phù hợp
         const anyVehicle = await Vehicle.findOne({ type: vehicleType, maxWeightKg: { $gte: weightKg }, status: 'Active' });
         if (!anyVehicle) return res.status(400).json({ success: false, message: `Không có xe phù hợp cho trọng lượng ${weightKg}kg (type ${vehicleType})` });

         const insuranceFee = insurance ? 100000 : 0; // 100k-200k tuỳ chính sách
         const loadingFee = loadingService ? 50000 : 0; // phụ phí bốc dỡ mẫu
         const breakdown = calcOrderPrice({ weightKg, distanceKm, loadingService, loadingFee, insuranceFee });
         totalPrice += breakdown.total;

         mapped.push({
            vehicleType,
            weightKg,
            distanceKm,
            loadingService: !!loadingService,
            insurance: !!insurance,
            priceBreakdown: breakdown,
            status: 'Created',
            itemPhotos: Array.isArray(itemPhotos) ? itemPhotos : []
         });
      }

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

      return res.status(201).json({ success: true, data: order });
   } catch (error) {
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

// Driver nhận đơn (mỗi lần chỉ 1 đơn đang active)
export const acceptOrderItem = async (req, res) => {
   try {
      const { orderId, itemId } = req.params;
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) return res.status(400).json({ success: false, message: 'Chưa có hồ sơ tài xế' });

      // Chỉ cho phép 1 item đang active mỗi lần
      const concurrent = await Order.findOne({
         'items.driverId': driver._id,
         'items.status': { $in: ['Accepted', 'PickedUp', 'Delivering'] }
      });

      if (concurrent) {
         return res.status(400).json({ success: false, message: 'Bạn đang có đơn hoạt động, không thể nhận thêm' });
      }

      const order = await Order.findOneAndUpdate(
         { _id: orderId, 'items._id': itemId, 'items.status': 'Created' },
         {
            $set: {
               'items.$.status': 'Accepted',
               'items.$.driverId': driver._id,
               'items.$.acceptedAt': new Date(),
               'status': 'InProgress'
            }
         },
         { new: true }
      );

      if (!order) {
         return res.status(400).json({ success: false, message: 'Item không khả dụng' });
      }

      return res.json({ success: true, data: order });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi nhận đơn', error: error.message });
   }
};

// Driver cập nhật trạng thái
export const updateOrderItemStatus = async (req, res) => {
   try {
      const { orderId, itemId } = req.params;
      const { status } = req.body; // PickedUp | Delivering | Delivered | Cancelled
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) return res.status(400).json({ success: false, message: 'Chưa có hồ sơ tài xế' });

      const allowed = ['PickedUp', 'Delivering', 'Delivered', 'Cancelled'];
      if (!allowed.includes(status)) {
         return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }

      const updateFields = {};
      updateFields['items.$.status'] = status;

      // Cập nhật thời gian tương ứng với trạng thái
      if (status === 'PickedUp') updateFields['items.$.pickedUpAt'] = new Date();
      if (status === 'Delivered') updateFields['items.$.deliveredAt'] = new Date();
      if (status === 'Cancelled') updateFields['items.$.cancelledAt'] = new Date();

      const order = await Order.findOneAndUpdate(
         { _id: orderId, 'items._id': itemId, 'items.driverId': driver._id },
         { $set: updateFields },
         { new: true }
      );

      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy item phù hợp' });
      }

      // Nếu đã giao hàng thành công, tạo giao dịch thu nhập cho tài xế
      if (status === 'Delivered') {
         const item = order.items.find(i => String(i._id) === String(itemId));
         if (item && item.priceBreakdown && item.priceBreakdown.total) {
            const amount = item.priceBreakdown.total;
            const fee = Math.round(amount * 0.2); // 20% hoa hồng
            const netAmount = amount - fee;

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

            // Cập nhật số dư tài xế
            await Driver.findByIdAndUpdate(driver._id, {
               $inc: { incomeBalance: netAmount, totalTrips: 1 }
            });
         }
      }

      // Kiểm tra và cập nhật trạng thái đơn hàng tổng
      await updateOrderStatus(orderId);

      return res.json({ success: true, data: order });
   } catch (error) {
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

      if (status && ['Accepted', 'PickedUp', 'Delivering', 'Delivered', 'Cancelled'].includes(status)) {
         query['items.status'] = status;
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
         Order.find(query)
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

// Customer huỷ đơn hàng
export const cancelOrder = async (req, res) => {
   try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      // Kiểm tra quyền huỷ đơn (chỉ customer sở hữu đơn mới được huỷ)
      if (String(order.customerId) !== String(req.user._id)) {
         return res.status(403).json({ success: false, message: 'Không có quyền huỷ đơn hàng này' });
      }

      // Kiểm tra trạng thái đơn hàng (chỉ cho phép huỷ đơn ở trạng thái Created hoặc InProgress)
      if (!['Created', 'InProgress'].includes(order.status)) {
         return res.status(400).json({
            success: false,
            message: 'Không thể huỷ đơn hàng ở trạng thái này'
         });
      }

      // Kiểm tra các items đã được tài xế nhận chưa
      const acceptedItems = order.items.filter(item =>
         ['Accepted', 'PickedUp', 'Delivering'].includes(item.status)
      );

      if (acceptedItems.length > 0) {
         return res.status(400).json({
            success: false,
            message: 'Không thể huỷ đơn hàng đã được tài xế nhận. Vui lòng liên hệ tài xế để huỷ.'
         });
      }

      // Cập nhật trạng thái tất cả items thành Cancelled
      const updatePromises = order.items.map(item => {
         return Order.findOneAndUpdate(
            { _id: orderId, 'items._id': item._id },
            {
               $set: {
                  'items.$.status': 'Cancelled',
                  'items.$.cancelledAt': new Date(),
                  'items.$.cancelReason': reason || 'Khách hàng huỷ đơn'
               }
            }
         );
      });

      await Promise.all(updatePromises);

      // Cập nhật trạng thái đơn hàng tổng
      await Order.findByIdAndUpdate(orderId, {
         status: 'Cancelled',
         customerNote: order.customerNote ?
            `${order.customerNote}\n\nLý do huỷ: ${reason || 'Khách hàng huỷ đơn'}` :
            `Lý do huỷ: ${reason || 'Khách hàng huỷ đơn'}`
      });

      const updatedOrder = await Order.findById(orderId);

      return res.json({
         success: true,
         message: 'Huỷ đơn hàng thành công',
         data: updatedOrder
      });
   } catch (error) {
      return res.status(500).json({
         success: false,
         message: 'Lỗi huỷ đơn hàng',
         error: error.message
      });
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

// Hàm helper để cập nhật trạng thái đơn hàng tổng
async function updateOrderStatus(orderId) {
   try {
      const order = await Order.findById(orderId);
      if (!order) return;

      // Nếu tất cả items đều đã hoàn thành
      const allDelivered = order.items.every(item => item.status === 'Delivered');
      if (allDelivered) {
         order.status = 'Completed';
         await order.save();
         return;
      }

      // Nếu tất cả items đều đã hủy
      const allCancelled = order.items.every(item => item.status === 'Cancelled');
      if (allCancelled) {
         order.status = 'Cancelled';
         await order.save();
         return;
      }

      // Nếu có ít nhất 1 item đang active
      const anyActive = order.items.some(item =>
         ['Accepted', 'PickedUp', 'Delivering'].includes(item.status)
      );
      if (anyActive) {
         order.status = 'InProgress';
         await order.save();
      }
   } catch (error) {
      console.error('Lỗi cập nhật trạng thái đơn hàng:', error);
   }
}