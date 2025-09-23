import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import { calcOrderPrice } from '../utils/pricing.js';

// Customer tạo đơn (nhiều item)
export const createOrder = async (req, res) => {
   try {
      const { pickupAddress, dropoffAddress, items } = req.body;
      if (!pickupAddress || !dropoffAddress) {
         return res.status(400).json({ success: false, message: 'Thiếu địa chỉ lấy/giao' });
      }

      if (!Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ success: false, message: 'Thiếu danh sách items' });
      }

      const mapped = [];
      let totalPrice = 0;
      for (const it of items) {
         const { vehicleType, weightKg, distanceKm, loadingService, insurance } = it || {};
         if (!vehicleType || !weightKg || !distanceKm) {
            return res.status(400).json({ success: false, message: 'Item thiếu vehicleType/weightKg/distanceKm' });
         }

         // optional: kiểm tra có xe phù hợp
         const anyVehicle = await Vehicle.findOne({ type: vehicleType, maxWeightKg: { $gte: weightKg } });
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
            status: 'Created'
         });
      }

      const order = await Order.create({
         customerId: req.user._id,
         pickupAddress,
         dropoffAddress,
         items: mapped,
         totalPrice
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
      const driver = await Driver.findOneAndUpdate({ userId: req.user._id }, { $set: { isOnline: !!online, lastOnlineAt: new Date() } }, { new: true, upsert: true });
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
      const concurrent = await Order.findOne({ 'items.driverId': driver._id, 'items.status': { $in: ['Accepted', 'PickedUp', 'Delivering'] } });
      if (concurrent) return res.status(400).json({ success: false, message: 'Bạn đang có đơn hoạt động, không thể nhận thêm' });

      const order = await Order.findOneAndUpdate(
         { _id: orderId, 'items._id': itemId, 'items.status': 'Created' },
         { $set: { 'items.$.status': 'Accepted', 'items.$.driverId': driver._id } },
         { new: true }
      );
      if (!order) return res.status(400).json({ success: false, message: 'Item không khả dụng' });
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
      if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });

      const order = await Order.findOneAndUpdate(
         { _id: orderId, 'items._id': itemId, 'items.driverId': driver._id },
         { $set: { 'items.$.status': status } },
         { new: true }
      );
      if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy item phù hợp' });
      return res.json({ success: true, data: order });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đơn', error: error.message });
   }
};


