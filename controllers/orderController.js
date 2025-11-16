import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import { calcOrderPrice } from '../utils/pricing.js';
import { io } from '../index.js';

/**
 * HÀM HELPER: Kiểm tra xe của tài xế có thể nhận đơn của loại xe yêu cầu không
 * Logic: Xe lớn hơn có thể nhận đơn của xe nhỏ hơn
 * 
 * @param {string} orderVehicleType - Loại xe yêu cầu trong đơn hàng
 * @param {string} driverVehicleType - Loại xe của tài xế
 * @returns {boolean} - true nếu có thể nhận
 */
function canVehicleAcceptOrderType(orderVehicleType, driverVehicleType) {
   // Nếu cùng loại -> OK
   if (orderVehicleType === driverVehicleType) {
      return true;
   }

   // Định nghĩa thứ tự ưu tiên (từ nhỏ đến lớn)
   const vehicleHierarchy = {
      'PickupTruck': 1,    // Nhỏ nhất
      'TruckSmall': 2,
      'TruckMedium': 3,
      'TruckBox': 4,
      'TruckLarge': 5,
      'DumpTruck': 5,      // Cùng cấp với TruckLarge
      'Trailer': 6         // Lớn nhất
   };

   const orderLevel = vehicleHierarchy[orderVehicleType] || 999;
   const driverLevel = vehicleHierarchy[driverVehicleType] || 0;

   // Xe lớn hơn (driverLevel cao hơn) có thể nhận đơn của xe nhỏ hơn (orderLevel thấp hơn)
   return driverLevel >= orderLevel;
}

/**
 * LUỒNG 1: KHÁCH HÀNG TẠO ĐƠN HÀNG
 * Khách hàng đặt xe -> Tạo đơn hàng với trạng thái "Created" -> Hiển thị trong "Đơn có sẵn" của tài xế
 * - Tính toán giá cả dựa trên loại xe, khoảng cách, trọng lượng
 * - Kiểm tra có xe phù hợp không
 * - Phát tín hiệu realtime cho tài xế về đơn mới
 */
export const createOrder = async (req, res) => {
   try {
      console.log('\n🚀 ========== [FLOW] KHÁCH HÀNG ĐẶT ĐƠN ==========');
      console.log('📥 [createOrder] Nhận request từ khách hàng:', {
         customerId: req.user._id,
         customerName: req.user.name,
         body: req.body
      });

      const { 
         pickupAddress, 
         dropoffAddress, 
         items, 
         customerNote, 
         paymentMethod = 'Cash', 
         paymentBy = 'sender',
         pickupLocation,
         dropoffLocation
      } = req.body;

      console.log('📋 [createOrder] Dữ liệu đơn hàng:', {
         pickupAddress,
         dropoffAddress,
         itemsCount: items?.length,
         items: items,
         customerNote,
         paymentMethod
      });

      // Validate địa chỉ
      if (!pickupAddress || !dropoffAddress) {
         console.log('❌ [createOrder] Validation failed: Thiếu địa chỉ');
         return res.status(400).json({ success: false, message: 'Thiếu địa chỉ lấy/giao' });
      }

      // Validate danh sách items
      if (!Array.isArray(items) || items.length === 0) {
         console.log('❌ [createOrder] Validation failed: Thiếu danh sách items');
         return res.status(400).json({ success: false, message: 'Thiếu danh sách items' });
      }

      const mapped = [];
      let totalPrice = 0;

      // Xử lý từng item trong đơn hàng
      console.log(`\n📦 [createOrder] Bắt đầu xử lý ${items.length} items...`);
      for (let idx = 0; idx < items.length; idx++) {
         const it = items[idx];
         const { vehicleType, vehicleId, pricePerKm, weightKg, distanceKm, loadingService, insurance, itemPhotos } = it || {};

         console.log(`\n  🔸 [createOrder] Xử lý Item ${idx + 1}/${items.length}:`, {
            vehicleType,
            vehicleId,
            pricePerKm,
            weightKg,
            distanceKm,
            loadingService,
            insurance
         });

         // Validate thông tin item
         // vehicleType có thể null (theo luồng mới không cần chọn loại xe cụ thể)
         if (!weightKg || !distanceKm) {
            console.log(`❌ [createOrder] Item ${idx + 1} thiếu thông tin:`, { vehicleType, weightKg, distanceKm });
            return res.status(400).json({ success: false, message: 'Item thiếu weightKg hoặc distanceKm' });
         }

         // Lấy pricePerKm từ request hoặc tính theo loại xe
         let finalPricePerKm = null;
         if (pricePerKm && pricePerKm > 0) {
            // Ưu tiên dùng pricePerKm từ request
            finalPricePerKm = Number(pricePerKm);
            console.log(`  💰 [createOrder] Sử dụng pricePerKm từ request: ${finalPricePerKm}`);
         } else if (vehicleId) {
            // Nếu có vehicleId, lấy pricePerKm từ xe đó
            const selectedVehicle = await Vehicle.findById(vehicleId);
            if (selectedVehicle && selectedVehicle.pricePerKm > 0) {
               finalPricePerKm = Number(selectedVehicle.pricePerKm);
               console.log(`  💰 [createOrder] Lấy pricePerKm từ vehicleId ${vehicleId}: ${finalPricePerKm}`);
            }
         }

         // Nếu chưa có pricePerKm, tính giá mặc định theo loại xe và trọng lượng
         if (!finalPricePerKm || finalPricePerKm <= 0) {
            // Tính giá mặc định dựa trên trọng lượng (tấn)
            const ton = weightKg / 1000;
            if (ton <= 1) {
               finalPricePerKm = 40000;
            } else if (ton <= 3) {
               finalPricePerKm = 60000;
            } else if (ton <= 5) {
               finalPricePerKm = 80000;
            } else if (ton <= 10) {
               finalPricePerKm = 100000;
            } else {
               finalPricePerKm = 150000;
            }
            console.log(`  💰 [createOrder] Sử dụng pricePerKm mặc định theo trọng lượng (${ton.toFixed(2)} tấn): ${finalPricePerKm}`);
         }

         // KHÔNG kiểm tra xe cụ thể nữa - tài xế sẽ tự quyết định có nhận đơn hay không
         // Đơn hàng sẽ được gửi cho tất cả tài xế online gần, họ sẽ tự filter theo xe của mình
         console.log(`  ✅ [createOrder] Đã xác định pricePerKm: ${finalPricePerKm} VND/km`);

         // Lưu ý: vehicleType được lưu từ request, không phải từ anyVehicle
         // Điều này đảm bảo vehicleType trong đơn hàng khớp với vehicleType mà khách hàng chọn
         console.log(`  📝 [createOrder] vehicleType sẽ lưu vào đơn hàng: "${vehicleType}"`);

         // Tính toán giá cả
         // Công thức: Tổng = (Số km × Giá/km) + Phí bốc xếp + Phí bảo hiểm
         const insuranceFee = insurance ? 100000 : 0; // 100k phí bảo hiểm
         const loadingFee = 50000; // 50k phí bốc xếp (chỉ áp dụng nếu có dịch vụ)
         const breakdown = calcOrderPrice({
            weightKg,
            distanceKm,
            loadingService: !!loadingService,
            loadingFee,
            insuranceFee,
            pricePerKm: finalPricePerKm // Sử dụng pricePerKm từ xe hoặc request
         });

         // Kiểm tra tính toán
         console.log('💰 Tính giá item:', {
            vehicleType,
            weightKg,
            distanceKm,
            basePerKm: breakdown.basePerKm,
            distanceCost: breakdown.distanceCost,
            loadCost: breakdown.loadCost,
            insuranceFee: breakdown.insuranceFee,
            total: breakdown.total,
            expected: (breakdown.distanceCost + breakdown.loadCost + breakdown.insuranceFee)
         });

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
            driverId: null, // QUAN TRỌNG: Chưa có tài xế nhận
            itemPhotos: Array.isArray(itemPhotos) ? itemPhotos : []
         });
      }

      // Tạo đơn hàng với status = 'Created' và items có driverId = null
      console.log('\n💾 [createOrder] Tạo đơn hàng trong database...');
      console.log('📝 [createOrder] Dữ liệu đơn hàng sẽ tạo:', {
         customerId: req.user._id,
         pickupAddress,
         dropoffAddress,
         itemsCount: mapped.length,
         items: mapped.map(m => ({
            vehicleType: m.vehicleType,
            weightKg: m.weightKg,
            distanceKm: m.distanceKm,
            status: m.status,
            driverId: m.driverId,
            priceTotal: m.priceBreakdown?.total
         })),
         totalPrice,
         status: 'Created'
      });

      const orderData = {
         customerId: req.user._id,
         pickupAddress,
         dropoffAddress,
         items: mapped,
         totalPrice,
         customerNote,
         paymentMethod,
         paymentBy, // Người trả tiền: "sender" hoặc "receiver"
         paymentStatus: 'Pending',
         status: 'Created' // Đảm bảo order status = Created
      };

      // Thêm tọa độ nếu có (để hiển thị trên bản đồ)
      if (pickupLocation && pickupLocation.coordinates && pickupLocation.coordinates.length === 2) {
         orderData.pickupLocation = {
            type: 'Point',
            coordinates: pickupLocation.coordinates // [longitude, latitude]
         };
      }
      if (dropoffLocation && dropoffLocation.coordinates && dropoffLocation.coordinates.length === 2) {
         orderData.dropoffLocation = {
            type: 'Point',
            coordinates: dropoffLocation.coordinates // [longitude, latitude]
         };
      }

      const order = await Order.create(orderData);

      console.log('✅ [createOrder] Đơn hàng đã được tạo trong database:', {
         orderId: order._id,
         orderStatus: order.status,
         itemsCount: order.items.length,
         items: order.items.map(item => ({
            itemId: item._id,
            vehicleType: item.vehicleType,
            weightKg: item.weightKg,
            status: item.status,
            driverId: item.driverId,
            driverIdType: typeof item.driverId,
            driverIdIsNull: item.driverId === null
         }))
      });

      // Tìm tài xế gần và gửi đơn cho họ (không tự động gán)
      if (order.pickupLocation && order.pickupLocation.coordinates && order.pickupLocation.coordinates.length === 2) {
         console.log('\n🔍 [createOrder] Bắt đầu tìm tài xế gần trong bán kính 2km...');
         const [pickupLng, pickupLat] = order.pickupLocation.coordinates;

         // Lấy trọng tải yêu cầu từ items (lấy max weightKg trong tất cả items)
         const maxWeightKg = Math.max(...order.items.map(item => Number(item.weightKg) || 0));
         console.log(`  ⚖️ [createOrder] Trọng tải yêu cầu: ${maxWeightKg}kg`);

         // Tìm tất cả tài xế online trong bán kính 2km
         try {
            const nearbyDrivers = await Driver.find({
               isOnline: true,
               status: 'Active',
               currentLocation: {
                  $near: {
                     $geometry: {
                        type: 'Point',
                        coordinates: [pickupLng, pickupLat]
                     },
                     $maxDistance: 2000 // 2km = 2000 mét
                  }
               }
            });

            console.log(`  📊 [createOrder] Tìm thấy ${nearbyDrivers.length} tài xế online trong bán kính 2km`);

            // Lọc tài xế có xe phù hợp với trọng tải yêu cầu
            const suitableDrivers = [];
            for (const driver of nearbyDrivers) {
               // Tìm tất cả xe của tài xế này
               const driverVehicles = await Vehicle.find({
                  driverId: driver._id,
                  status: 'Active'
               });

               // Kiểm tra xem có xe nào có maxWeightKg >= weightKg yêu cầu không
               const hasSuitableVehicle = driverVehicles.some(vehicle => 
                  vehicle.maxWeightKg && Number(vehicle.maxWeightKg) >= maxWeightKg
               );

               if (hasSuitableVehicle) {
                  suitableDrivers.push(driver);
                  console.log(`  ✅ [createOrder] Tài xế ${driver._id} có xe phù hợp (maxWeightKg >= ${maxWeightKg}kg)`);
               } else {
                  console.log(`  ❌ [createOrder] Tài xế ${driver._id} không có xe phù hợp (tất cả xe có maxWeightKg < ${maxWeightKg}kg)`);
               }
            }

            console.log(`  🎯 [createOrder] Có ${suitableDrivers.length}/${nearbyDrivers.length} tài xế có xe phù hợp với trọng tải yêu cầu`);

            // Lưu danh sách tài xế phù hợp để emit socket sau
            // (sẽ được sử dụng ở phần emit socket bên dưới)
            order.suitableDriverIds = suitableDrivers.map(d => d._id.toString());
         } catch (locationError) {
            console.error(`  ❌ [createOrder] Lỗi khi tìm tài xế:`, locationError);
         }
      } else {
         console.log('⚠️ [createOrder] Không có tọa độ điểm đón, vẫn gửi đơn cho tất cả tài xế online');
      }

      // Populate customer để trả về đầy đủ thông tin
      const populatedOrder = await Order.findById(order._id)
         .populate('customerId', 'name phone email')
         .populate({
            path: 'items.driverId',
            populate: {
               path: 'userId',
               select: 'name phone avatarUrl'
            }
         });

      // Phát tín hiệu realtime cho tài xế: Có đơn mới trong "Đơn có sẵn"
      console.log('\n📡 [createOrder] Chuẩn bị phát tín hiệu Socket.IO...');
      try {
         const socketPayload = {
            orderId: order._id.toString(),
            pickupAddress: order.pickupAddress,
            dropoffAddress: order.dropoffAddress,
            totalPrice: order.totalPrice,
            createdAt: order.createdAt,
            itemsCount: order.items.length,
            vehicleTypes: order.items.map(item => item.vehicleType),
            items: order.items.map(item => ({
               _id: item._id,
               vehicleType: item.vehicleType,
               weightKg: item.weightKg,
               distanceKm: item.distanceKm,
               status: item.status,
               driverId: item.driverId
            }))
         };

         console.log('📤 [createOrder] Socket payload:', JSON.stringify(socketPayload, null, 2));
         
         // Chỉ gửi đơn cho tài xế có xe phù hợp với trọng tải
         if (order.suitableDriverIds && order.suitableDriverIds.length > 0) {
            // Emit cho từng tài xế phù hợp qua room riêng
            for (const driverId of order.suitableDriverIds) {
               io.to(`driver:${driverId}`).emit('order:available:new', socketPayload);
            }
            console.log(`✅ [createOrder] Đã emit socket event "order:available:new" đến ${order.suitableDriverIds.length} tài xế phù hợp`);
         } else {
            // Nếu không có tài xế phù hợp (không có tọa độ hoặc lỗi), vẫn emit cho tất cả (fallback)
            io.to('drivers').emit('order:available:new', socketPayload);
            console.log('⚠️ [createOrder] Không có tài xế phù hợp, emit cho tất cả tài xế (fallback)');
         }
         console.log('📡 [Socket] Chi tiết đơn hàng trong socket:', {
            orderId: order._id,
            itemsCount: order.items.length,
            vehicleTypes: order.items.map(item => item.vehicleType),
            itemsStatus: order.items.map(item => ({
               id: item._id,
               status: item.status,
               driverId: item.driverId,
               driverIdType: typeof item.driverId,
               vehicleType: item.vehicleType
            }))
         });
      } catch (emitError) {
         console.error('❌ [createOrder] Lỗi phát tín hiệu socket:', emitError);
      }

      console.log('\n✅ [createOrder] ========== TẠO ĐƠN HÀNG THÀNH CÔNG ==========');
      console.log('📊 [createOrder] Tổng kết:', {
         orderId: order._id,
         customerId: order.customerId,
         customerName: populatedOrder.customerId?.name,
         totalPrice: order.totalPrice,
         orderStatus: order.status,
         itemsCount: order.items.length,
         items: order.items.map(item => ({
            _id: item._id,
            vehicleType: item.vehicleType,
            weightKg: item.weightKg,
            distanceKm: item.distanceKm,
            status: item.status,
            driverId: item.driverId,
            driverIdIsNull: item.driverId === null,
            total: item.priceBreakdown?.total
         }))
      });
      console.log('✅ [createOrder] ============================================\n');

      return res.status(201).json({ success: true, data: populatedOrder });
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

      // QUAN TRỌNG: Kiểm tra khoảng cách từ tài xế đến điểm đón (phải <= 2km)
      if (driver.currentLocation && driver.currentLocation.coordinates && 
          order.pickupLocation && order.pickupLocation.coordinates) {
         const [driverLng, driverLat] = driver.currentLocation.coordinates;
         const [pickupLng, pickupLat] = order.pickupLocation.coordinates;
         
         // Tính khoảng cách bằng Haversine formula
         const R = 6371e3; // Bán kính Trái Đất (mét)
         const φ1 = driverLat * Math.PI / 180;
         const φ2 = pickupLat * Math.PI / 180;
         const Δφ = (pickupLat - driverLat) * Math.PI / 180;
         const Δλ = (pickupLng - driverLng) * Math.PI / 180;

         const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                   Math.cos(φ1) * Math.cos(φ2) *
                   Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
         const distance = R * c; // Khoảng cách tính bằng mét

         console.log(`📍 [acceptOrderItem] Khoảng cách từ tài xế đến điểm đón: ${(distance / 1000).toFixed(2)} km`);

         // Chỉ cho phép nhận đơn nếu khoảng cách <= 2km (2000 mét)
         if (distance > 2000) {
            console.log(`❌ [acceptOrderItem] Tài xế không thể nhận đơn vì cách xa ${(distance / 1000).toFixed(2)} km (> 2km)`);
            return res.status(400).json({ 
               success: false, 
               message: `Đơn hàng này cách bạn ${(distance / 1000).toFixed(2)} km, vượt quá bán kính 2km. Vui lòng chọn đơn hàng gần hơn.` 
            });
         }
      } else {
         console.log('⚠️ [acceptOrderItem] Không có vị trí tài xế hoặc tọa độ điểm đón, bỏ qua kiểm tra khoảng cách');
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

      // Gửi socket event cho customer: tài xế đã nhận đơn
      try {
         const acceptedItem = updatedOrder.items.find(i => String(i._id) === String(itemId));
         const customerSocketPayload = {
            orderId: order._id.toString(),
            itemId: itemId,
            driverId: driver._id.toString(),
            driverName: acceptedItem?.driverId?.userId?.name || 'Tài xế',
            driverPhone: acceptedItem?.driverId?.userId?.phone || '',
            driverAvatar: acceptedItem?.driverId?.userId?.avatarUrl || '',
            status: 'Accepted',
            acceptedAt: item.acceptedAt
         };

         // Gửi đến room của customer
         io.to(`customer:${order.customerId.toString()}`).emit('order:accepted', customerSocketPayload);
         console.log(`📤 [acceptOrderItem] Đã emit socket event "order:accepted" đến customer ${order.customerId}`);
      } catch (socketError) {
         console.error('❌ [acceptOrderItem] Lỗi phát tín hiệu socket:', socketError);
      }

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

      // Xử lý thanh toán và tạo giao dịch thu nhập cho tài xế
      // Logic thanh toán:
      // - Nếu paymentBy = "sender": Thanh toán khi status = "PickedUp" (đã lấy hàng)
      // - Nếu paymentBy = "receiver": Thanh toán khi status = "Delivered" (đã giao hàng)
      const item = order.items.find(i => String(i._id) === String(itemId));
      const shouldProcessPayment =
         (order.paymentBy === 'sender' && status === 'PickedUp') ||
         (order.paymentBy === 'receiver' && status === 'Delivered');

      if (shouldProcessPayment && item && item.priceBreakdown && item.priceBreakdown.total) {
         // Kiểm tra xem đã có giao dịch cho item này chưa (tránh thanh toán trùng lặp)
         const existingTransaction = await DriverTransaction.findOne({
            orderId: order._id,
            orderItemId: itemId,
            type: 'OrderEarning',
            status: 'Completed'
         });

         if (existingTransaction) {
            console.log('⚠️ Giao dịch đã tồn tại cho item này, bỏ qua thanh toán:', {
               orderId: order._id,
               itemId,
               transactionId: existingTransaction._id
            });
         } else {
            const amount = item.priceBreakdown.total;
            const fee = Math.round(amount * 0.2); // 20% hoa hồng cho hệ thống
            const netAmount = amount - fee; // Số tiền tài xế nhận được

            // Cập nhật trạng thái thanh toán của đơn hàng (chỉ cập nhật nếu chưa Paid)
            if (order.paymentStatus !== 'Paid') {
               await Order.findByIdAndUpdate(order._id, {
                  paymentStatus: 'Paid'
               });
            }

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
               description: `Thu nhập từ đơn hàng #${order._id} (${order.paymentBy === 'sender' ? 'Người đặt trả' : 'Người nhận trả'})`
            });

            // Cập nhật số dư và số chuyến của tài xế
            await Driver.findByIdAndUpdate(driver._id, {
               $inc: { incomeBalance: netAmount, totalTrips: 1 }
            });

            console.log('💰 Đã xử lý thanh toán và tạo giao dịch thu nhập cho tài xế:', {
               driverId: driver._id,
               paymentBy: order.paymentBy,
               status,
               amount,
               netAmount
            });
         }
      }

      // Cập nhật trạng thái tổng của đơn hàng
      await updateOrderStatus(orderId);

      // Gửi socket event cho customer khi tài xế cập nhật trạng thái
      try {
         const customerSocketPayload = {
            orderId: order._id.toString(),
            itemId: itemId,
            status: status,
            updatedAt: new Date()
         };

         // Gửi đến room của customer
         io.to(`customer:${order.customerId.toString()}`).emit('order:status:updated', customerSocketPayload);
         console.log(`📤 [updateOrderItemStatus] Đã emit socket event "order:status:updated" đến customer ${order.customerId}`);
      } catch (socketError) {
         console.error('❌ [updateOrderItemStatus] Lỗi phát tín hiệu socket:', socketError);
      }

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
      console.log('\n🚀 ========== [FLOW] TÀI XẾ XEM ĐƠN CÓ SẴN ==========');
      console.log('📥 [getAvailableOrders] Nhận request từ tài xế:', {
         userId: req.user._id,
         userName: req.user.name,
         query: req.query
      });

      const { page = 1, limit = 10 } = req.query;
      const driver = await Driver.findOne({ userId: req.user._id });

      if (!driver) {
         console.log('❌ [getAvailableOrders] Không tìm thấy hồ sơ tài xế');
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      console.log('👤 [getAvailableOrders] Thông tin tài xế:', {
         driverId: driver._id,
         userId: driver.userId,
         status: driver.status,
         isOnline: driver.isOnline
      });

      // Lấy thông tin xe của tài xế
      const vehicle = await Vehicle.findOne({ driverId: driver._id, status: 'Active' });

      if (!vehicle) {
         console.log('❌ [getAvailableOrders] Tài xế chưa có xe hoạt động');
         return res.status(400).json({ success: false, message: 'Bạn chưa có xe hoạt động' });
      }

      console.log(`\n🔍 [getAvailableOrders] Thông tin xe của tài xế:`, {
         vehicleId: vehicle._id,
         vehicleType: vehicle.type,
         maxWeightKg: vehicle.maxWeightKg,
         pricePerKm: vehicle.pricePerKm,
         status: vehicle.status
      });

      // Tìm TẤT CẢ đơn có status = 'Created' (đơn mới tạo, chưa có tài xế nhận)
      // Sau đó filter items ở application level để match với xe của tài xế
      const baseQuery = {
         status: 'Created' // Đơn hàng ở trạng thái Created
      };

      console.log('\n🔍 [getAvailableOrders] Query MongoDB:', {
         query: baseQuery,
         page,
         limit
      });

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      // Lấy tất cả đơn có status = 'Created' (không filter theo items ở query level)
      // Vì MongoDB query nested array có thể không hoạt động đúng
      console.log('📊 [getAvailableOrders] Đang query database...');
      const [allOrders, allTotal] = await Promise.all([
         Order.find(baseQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum * 3) // Lấy nhiều hơn để có đủ sau khi filter
            .populate('customerId', 'name phone'),
         Order.countDocuments(baseQuery)
      ]);

      console.log(`\n📦 [getAvailableOrders] Kết quả query database:`, {
         totalOrdersFound: allOrders.length,
         totalInDB: allTotal,
         query: baseQuery
      });

      // Debug: Log tất cả vehicleType trong orders
      console.log('\n📋 [getAvailableOrders] Phân tích tất cả items trong đơn hàng...');
      const allVehicleTypes = new Set();
      const allItemsInfo = [];
      const availableItemsInfo = []; // Items có thể nhận (status = Created, driverId = null)

      allOrders.forEach((order, orderIdx) => {
         if (order.items && Array.isArray(order.items)) {
            console.log(`  📦 Đơn ${orderIdx + 1} (${order._id}): ${order.items.length} items`);
            order.items.forEach((item, itemIdx) => {
               if (item) {
                  const itemInfo = {
                     orderId: order._id,
                     orderIndex: orderIdx + 1,
                     itemId: item._id,
                     itemIndex: itemIdx + 1,
                     vehicleType: item.vehicleType,
                     vehicleTypeString: String(item.vehicleType || ''),
                     weightKg: item.weightKg,
                     weightKgNumber: Number(item.weightKg) || 0,
                     status: item.status,
                     driverId: item.driverId,
                     driverIdType: typeof item.driverId,
                     driverIdIsNull: item.driverId === null,
                     driverIdString: String(item.driverId)
                  };
                  allItemsInfo.push(itemInfo);

                  // Chỉ thêm vào availableItemsInfo nếu status = Created và driverId = null
                  if (item.status === 'Created' && (!item.driverId || item.driverId === null)) {
                     allVehicleTypes.add(item.vehicleType);
                     availableItemsInfo.push(itemInfo);
                  }
                  console.log(`    🔸 Item ${itemIdx + 1}:`, itemInfo);
               }
            });
         } else {
            console.log(`  ⚠️ Đơn ${orderIdx + 1} không có items hoặc items không phải array`);
         }
      });

      console.log(`\n🚗 [getAvailableOrders] Tổng kết vehicle types:`, {
         vehicleTypesInOrders: Array.from(allVehicleTypes),
         driverVehicleType: vehicle.type,
         driverVehicleTypeString: String(vehicle.type || ''),
         match: Array.from(allVehicleTypes).includes(vehicle.type),
         availableItemsCount: availableItemsInfo.length
      });
      console.log(`📋 [getAvailableOrders] Tổng số items: ${allItemsInfo.length}`);
      console.log(`✅ [getAvailableOrders] Items có thể nhận (status=Created, driverId=null): ${availableItemsInfo.length}`);

      // Log chi tiết các items có thể nhận
      if (availableItemsInfo.length > 0) {
         console.log(`\n📊 [getAvailableOrders] Chi tiết items có thể nhận:`, availableItemsInfo.map(item => ({
            orderId: item.orderId,
            itemId: item.itemId,
            vehicleType: item.vehicleType,
            weightKg: item.weightKg,
            willMatchVehicle: canVehicleAcceptOrderType(item.vehicleType, vehicle.type),
            willMatchWeight: Number(item.weightKg) <= Number(vehicle.maxWeightKg)
         })));
      } else {
         console.log(`\n⚠️ [getAvailableOrders] KHÔNG CÓ ITEMS NÀO CÓ THỂ NHẬN (status=Created, driverId=null)`);
      }

      // Lọc items trong mỗi đơn: chỉ giữ lại items có thể nhận (status = Created, driverId = null, phù hợp với xe)
      console.log('\n🔍 [getAvailableOrders] Bắt đầu filter items...');
      const filteredOrders = [];

      // Kiểm tra vị trí hiện tại của tài xế
      const driverLocation = driver.currentLocation;
      const hasDriverLocation = driverLocation && 
                                driverLocation.coordinates && 
                                driverLocation.coordinates.length === 2 &&
                                driverLocation.coordinates[0] !== 0 && 
                                driverLocation.coordinates[1] !== 0;

      if (hasDriverLocation) {
         console.log('📍 [getAvailableOrders] Tài xế có vị trí hiện tại:', {
            coordinates: driverLocation.coordinates,
            locationUpdatedAt: driver.locationUpdatedAt
         });
      } else {
         console.log('⚠️ [getAvailableOrders] Tài xế chưa có vị trí hiện tại, sắp xếp theo thời gian tạo');
      }

      // Hàm tính khoảng cách giữa 2 điểm (Haversine formula)
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
         const R = 6371e3; // Bán kính Trái Đất (mét)
         const φ1 = lat1 * Math.PI / 180;
         const φ2 = lat2 * Math.PI / 180;
         const Δφ = (lat2 - lat1) * Math.PI / 180;
         const Δλ = (lon2 - lon1) * Math.PI / 180;

         const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                   Math.cos(φ1) * Math.cos(φ2) *
                   Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

         return R * c; // Khoảng cách tính bằng mét
      };

      for (let orderIdx = 0; orderIdx < allOrders.length; orderIdx++) {
         const order = allOrders[orderIdx];
         try {
            console.log(`\n  📦 [getAvailableOrders] Xử lý đơn ${orderIdx + 1}/${allOrders.length} (${order._id}):`);
            const availableItems = (order.items || []).filter((item, itemIdx) => {
               if (!item) {
                  console.log(`    ❌ Item ${itemIdx + 1}: item is null/undefined`);
                  return false;
               }

               const isCreated = item.status === 'Created';
               const hasNoDriver = !item.driverId || item.driverId === null || String(item.driverId) === 'null';

               // So sánh vehicleType: Nếu item không có vehicleType (null), chỉ cần kiểm tra trọng tải
               const itemVehicleType = item.vehicleType ? String(item.vehicleType).trim() : null;
               const driverVehicleType = String(vehicle.type || '').trim();
               
               // Nếu item không có vehicleType (theo luồng mới), chỉ cần kiểm tra trọng tải
               let matchesVehicle = true; // Mặc định true nếu không có vehicleType
               if (itemVehicleType) {
                  // Nếu có vehicleType, kiểm tra theo hierarchy
                  matchesVehicle = canVehicleAcceptOrderType(itemVehicleType, driverVehicleType);
               }

               // So sánh weight (chuyển về number để so sánh chính xác)
               // QUAN TRỌNG: vehicleMaxWeight phải >= itemWeight (xe phải chở được hàng)
               const itemWeight = Number(item.weightKg) || 0;
               const vehicleMaxWeight = Number(vehicle.maxWeightKg) || 0;
               const matchesWeight = itemWeight > 0 && vehicleMaxWeight > 0 && vehicleMaxWeight >= itemWeight;

               const canAccept = isCreated && hasNoDriver && matchesVehicle && matchesWeight;

               // Debug từng item - CHI TIẾT HƠN
               console.log(`    🔸 Item ${itemIdx + 1} (${item._id}):`, {
                  itemVehicleType: itemVehicleType,
                  driverVehicleType: driverVehicleType,
                  vehicleTypeMatch: matchesVehicle,
                  itemWeight: itemWeight,
                  vehicleMaxWeight: vehicleMaxWeight,
                  weightMatch: matchesWeight,
                  status: item.status,
                  driverId: item.driverId,
                  driverIdIsNull: item.driverId === null,
                  driverIdString: String(item.driverId),
                  checks: {
                     isCreated: `${item.status} === 'Created' = ${isCreated}`,
                     hasNoDriver: `!${item.driverId} || null = ${hasNoDriver}`,
                     matchesVehicle: `canVehicleAcceptOrderType("${itemVehicleType}", "${driverVehicleType}") = ${matchesVehicle}`,
                     matchesWeight: `${itemWeight} <= ${vehicleMaxWeight} = ${matchesWeight}`
                  },
                  canAccept: canAccept,
                  reason: !canAccept ? (
                     !isCreated ? 'Status không phải Created' :
                        !hasNoDriver ? 'Đã có tài xế nhận' :
                           !matchesVehicle ? `Xe ${driverVehicleType} không thể nhận đơn ${itemVehicleType}` :
                              !matchesWeight ? 'Weight vượt quá maxWeight' : 'OK'
                  ) : 'OK'
               });

               return canAccept;
            });

            console.log(`    ✅ Đơn ${orderIdx + 1}: Tìm thấy ${availableItems.length} items có thể nhận`);

            // Chỉ trả về đơn nếu còn ít nhất 1 item có thể nhận
            if (availableItems.length === 0) {
               console.log(`    ⏭️ Đơn ${orderIdx + 1}: Bỏ qua vì không có items phù hợp`);
               continue;
            }

            // Tính lại giá cho từng item dựa trên pricePerKm của xe tài xế
            const itemsWithCorrectPrice = availableItems.map(item => {
               // Tính lại giá với pricePerKm từ xe của tài xế
               const insuranceFee = item.insurance ? 100000 : 0;
               const loadingFee = 50000;
               const recalculatedBreakdown = calcOrderPrice({
                  weightKg: item.weightKg,
                  distanceKm: item.distanceKm,
                  loadingService: item.loadingService,
                  loadingFee,
                  insuranceFee,
                  pricePerKm: vehicle.pricePerKm // Sử dụng pricePerKm từ xe của tài xế
               });

               console.log(`    💰 [getAvailableOrders] Tính lại giá cho item ${item._id}:`, {
                  oldPrice: item.priceBreakdown?.total,
                  newPrice: recalculatedBreakdown.total,
                  pricePerKm: vehicle.pricePerKm,
                  distanceKm: item.distanceKm
               });

               return {
                  ...item.toObject ? item.toObject() : item,
                  priceBreakdown: recalculatedBreakdown // Cập nhật giá với pricePerKm từ xe
               };
            });

            // Convert order to plain object safely
            const orderObj = order.toObject ? order.toObject() : order;

            // Tính khoảng cách từ tài xế đến điểm đón (nếu có)
            let distanceFromDriver = null;
            if (hasDriverLocation && order.pickupLocation && order.pickupLocation.coordinates) {
               const [pickupLng, pickupLat] = order.pickupLocation.coordinates;
               const [driverLng, driverLat] = driverLocation.coordinates;
               distanceFromDriver = calculateDistance(driverLat, driverLng, pickupLat, pickupLng);
               console.log(`    📍 [getAvailableOrders] Khoảng cách từ tài xế đến điểm đón: ${(distanceFromDriver / 1000).toFixed(2)} km`);
               
               // QUAN TRỌNG: Chỉ hiển thị đơn hàng trong bán kính 2km (2000 mét)
               if (distanceFromDriver > 2000) {
                  console.log(`    ❌ [getAvailableOrders] Đơn ${orderIdx + 1} cách xa ${(distanceFromDriver / 1000).toFixed(2)} km (> 2km), bỏ qua`);
                  continue; // Bỏ qua đơn hàng này
               }
            } else {
               // Nếu không có vị trí tài xế hoặc không có tọa độ điểm đón, vẫn hiển thị (fallback)
               console.log(`    ⚠️ [getAvailableOrders] Không có vị trí để tính khoảng cách, vẫn hiển thị đơn`);
            }

            filteredOrders.push({
               ...orderObj,
               items: itemsWithCorrectPrice, // Chỉ trả về items có thể nhận với giá đã tính lại
               distanceFromDriver: distanceFromDriver ? Math.round(distanceFromDriver) : null // Khoảng cách tính bằng mét
            });
            console.log(`    ✅ Đơn ${orderIdx + 1}: Đã thêm vào danh sách filteredOrders với ${itemsWithCorrectPrice.length} items (khoảng cách: ${distanceFromDriver ? (distanceFromDriver / 1000).toFixed(2) + ' km' : 'N/A'})`);
         } catch (orderError) {
            console.error(`❌ [getAvailableOrders] Lỗi xử lý đơn ${order._id}:`, orderError);
            // Bỏ qua đơn lỗi, tiếp tục với đơn khác
            continue;
         }
      }

      // Sắp xếp đơn hàng theo khoảng cách (nếu có vị trí tài xế)
      if (hasDriverLocation) {
         filteredOrders.sort((a, b) => {
            // Ưu tiên đơn có khoảng cách (gần hơn)
            if (a.distanceFromDriver !== null && b.distanceFromDriver !== null) {
               return a.distanceFromDriver - b.distanceFromDriver;
            }
            // Đơn có khoảng cách luôn ưu tiên hơn đơn không có
            if (a.distanceFromDriver !== null) return -1;
            if (b.distanceFromDriver !== null) return 1;
            // Nếu cả 2 đều không có khoảng cách, sắp xếp theo thời gian tạo
            return new Date(b.createdAt) - new Date(a.createdAt);
         });
         console.log('📍 [getAvailableOrders] Đã sắp xếp đơn hàng theo khoảng cách từ vị trí tài xế');
      } else {
         // Nếu không có vị trí, giữ nguyên sắp xếp theo thời gian tạo
         console.log('⚠️ [getAvailableOrders] Không có vị trí tài xế, sắp xếp theo thời gian tạo');
      }

      console.log(`\n✅ [getAvailableOrders] ========== KẾT QUẢ FILTER ==========`);
      console.log(`📊 [getAvailableOrders] Tổng kết:`, {
         totalOrdersBeforeFilter: allOrders.length,
         filteredOrdersCount: filteredOrders.length,
         driverVehicleType: vehicle.type,
         driverMaxWeight: vehicle.maxWeightKg,
         hasDriverLocation: hasDriverLocation,
         orders: filteredOrders.map(o => ({
            orderId: o._id,
            customerName: o.customerId?.name,
            itemsCount: o.items.length,
            distanceFromDriver: o.distanceFromDriver ? `${(o.distanceFromDriver / 1000).toFixed(2)} km` : 'N/A',
            items: o.items.map(i => ({
               id: i._id,
               vehicleType: i.vehicleType,
               weightKg: i.weightKg,
               status: i.status,
               driverId: i.driverId
            }))
         }))
      });
      console.log(`✅ [getAvailableOrders] =====================================\n`);

      // Nếu không có đơn nào, thử query đơn giản hơn để debug
      if (filteredOrders.length === 0 && allOrders.length > 0) {
         console.log(`⚠️ [getAvailableOrders] Có ${allOrders.length} đơn nhưng không match với xe ${vehicle.type}`);
         try {
            const debugOrders = allOrders.map(o => {
               try {
                  return {
                     orderId: o._id,
                     items: (o.items || []).map(i => ({
                        id: i?._id,
                        vehicleType: i?.vehicleType,
                        weightKg: i?.weightKg,
                        status: i?.status,
                        driverId: i?.driverId
                     }))
                  };
               } catch (e) {
                  return { orderId: o._id, error: e.message };
               }
            });
            console.log(`⚠️ [getAvailableOrders] Chi tiết các đơn:`, debugOrders);
         } catch (debugError) {
            console.error(`❌ Lỗi khi debug orders:`, debugError);
         }
      }

      // Thêm cache-control headers để tránh cache (304 Not Modified)
      res.set({
         'Cache-Control': 'no-cache, no-store, must-revalidate',
         'Pragma': 'no-cache',
         'Expires': '0'
      });

      return res.json({
         success: true,
         data: filteredOrders,
         meta: {
            page: pageNum,
            limit: limitNum,
            total: filteredOrders.length,
            totalPages: Math.ceil(filteredOrders.length / limitNum),
            debug: {
               totalOrdersBeforeFilter: allOrders.length,
               vehicleType: vehicle.type,
               maxWeightKg: vehicle.maxWeightKg
            }
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
      // Công thức: Tổng = (Số km × Giá/km) + Phí bốc xếp + Phí bảo hiểm
      // Sử dụng pricePerKm từ priceBreakdown hiện tại (nếu có), nếu không thì tính theo trọng lượng
      const insuranceFee = insurance ? 100000 : 0; // 100k phí bảo hiểm
      const loadingFee = 50000; // 50k phí bốc xếp (chỉ áp dụng nếu có dịch vụ)
      const existingPricePerKm = item.priceBreakdown?.basePerKm || null;
      const breakdown = calcOrderPrice({
         weightKg: item.weightKg,
         distanceKm: item.distanceKm,
         loadingService: item.loadingService,
         loadingFee,
         insuranceFee,
         pricePerKm: existingPricePerKm // Giữ nguyên pricePerKm đã tính từ trước
      });

      console.log('💰 Tính lại giá với bảo hiểm mới:', {
         itemId,
         weightKg: item.weightKg,
         distanceKm: item.distanceKm,
         loadingService: item.loadingService,
         insurance,
         basePerKm: breakdown.basePerKm,
         distanceCost: breakdown.distanceCost,
         loadCost: breakdown.loadCost,
         insuranceFee: breakdown.insuranceFee,
         total: breakdown.total
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