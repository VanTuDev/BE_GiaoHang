import Feedback from '../models/feedback.model.js';
import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';

// Customer tạo đánh giá dịch vụ
export const createFeedback = async (req, res) => {
   try {
      const {
         orderId,
         orderItemId,
         overallRating,
         serviceRating,
         driverRating,
         vehicleRating,
         punctualityRating,
         comment,
         photos = [],
         isAnonymous = false
      } = req.body;

      // Kiểm tra đơn hàng tồn tại và thuộc về customer
      const order = await Order.findById(orderId);
      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      if (String(order.customerId) !== String(req.user._id)) {
         return res.status(403).json({ success: false, message: 'Không có quyền đánh giá đơn hàng này' });
      }

      // Kiểm tra đơn hàng đã hoàn thành chưa
      if (order.status !== 'Completed') {
         return res.status(400).json({ success: false, message: 'Chỉ có thể đánh giá đơn hàng đã hoàn thành' });
      }

      // Kiểm tra item cụ thể (nếu có)
      let driverId = null;
      if (orderItemId) {
         const item = order.items.find(item => String(item._id) === String(orderItemId));
         if (!item) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy item trong đơn hàng' });
         }
         if (item.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể đánh giá item đã giao hàng' });
         }
         driverId = item.driverId;
      } else {
         // Nếu không chỉ định item cụ thể, lấy driver đầu tiên
         const deliveredItem = order.items.find(item => item.status === 'Delivered' && item.driverId);
         if (!deliveredItem) {
            return res.status(400).json({ success: false, message: 'Không có item nào đã được giao hàng' });
         }
         driverId = deliveredItem.driverId;
      }

      // Kiểm tra đã đánh giá chưa
      const existingFeedback = await Feedback.findOne({
         orderId,
         orderItemId: orderItemId || null,
         customerId: req.user._id
      });

      if (existingFeedback) {
         return res.status(400).json({ success: false, message: 'Bạn đã đánh giá dịch vụ này rồi' });
      }

      // Tạo đánh giá
      const feedback = await Feedback.create({
         orderId,
         orderItemId: orderItemId || null,
         customerId: req.user._id,
         driverId,
         overallRating,
         serviceRating,
         driverRating,
         vehicleRating,
         punctualityRating,
         comment,
         photos: Array.isArray(photos) ? photos : [],
         isAnonymous
      });

      // Cập nhật rating trung bình của driver
      await updateDriverRating(driverId);

      return res.status(201).json({ success: true, data: feedback });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi tạo đánh giá', error: error.message });
   }
};

// Lấy danh sách đánh giá của driver
export const getDriverFeedbacks = async (req, res) => {
   try {
      const { driverId } = req.params;
      const { page = 1, limit = 10, rating } = req.query;

      const query = { driverId, status: 'Approved' };
      if (rating) {
         query.overallRating = parseInt(rating);
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [feedbacks, total] = await Promise.all([
         Feedback.find(query)
            .populate('customerId', 'name avatar')
            .populate('orderId', 'pickupAddress dropoffAddress')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         Feedback.countDocuments(query)
      ]);

      // Tính thống kê rating
      const stats = await Feedback.aggregate([
         { $match: { driverId: driverId, status: 'Approved' } },
         {
            $group: {
               _id: null,
               total: { $sum: 1 },
               avgOverall: { $avg: '$overallRating' },
               avgService: { $avg: '$serviceRating' },
               avgDriver: { $avg: '$driverRating' },
               avgVehicle: { $avg: '$vehicleRating' },
               avgPunctuality: { $avg: '$punctualityRating' },
               ratingCounts: {
                  $push: {
                     $switch: {
                        branches: [
                           { case: { $eq: ['$overallRating', 1] }, then: 1 },
                           { case: { $eq: ['$overallRating', 2] }, then: 2 },
                           { case: { $eq: ['$overallRating', 3] }, then: 3 },
                           { case: { $eq: ['$overallRating', 4] }, then: 4 },
                           { case: { $eq: ['$overallRating', 5] }, then: 5 }
                        ],
                        default: 0
                     }
                  }
               }
            }
         }
      ]);

      const ratingStats = stats[0] || {
         total: 0,
         avgOverall: 0,
         avgService: 0,
         avgDriver: 0,
         avgVehicle: 0,
         avgPunctuality: 0,
         ratingCounts: []
      };

      // Đếm số lượng từng rating
      const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
         rating,
         count: ratingStats.ratingCounts.filter(r => r === rating).length
      }));

      return res.json({
         success: true,
         data: feedbacks,
         stats: {
            ...ratingStats,
            ratingCounts
         },
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy đánh giá', error: error.message });
   }
};

// Lấy đánh giá của customer
export const getCustomerFeedbacks = async (req, res) => {
   try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [feedbacks, total] = await Promise.all([
         Feedback.find({ customerId: req.user._id })
            .populate('driverId', 'userId rating totalTrips')
            .populate('orderId', 'pickupAddress dropoffAddress totalPrice')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         Feedback.countDocuments({ customerId: req.user._id })
      ]);

      return res.json({
         success: true,
         data: feedbacks,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy đánh giá', error: error.message });
   }
};

// Admin: Lấy tất cả đánh giá
export const getAllFeedbacks = async (req, res) => {
   try {
      const { page = 1, limit = 10, status, rating, driverId } = req.query;

      const query = {};
      if (status) query.status = status;
      if (rating) query.overallRating = parseInt(rating);
      if (driverId) query.driverId = driverId;

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [feedbacks, total] = await Promise.all([
         Feedback.find(query)
            .populate('customerId', 'name email')
            .populate('driverId', 'userId')
            .populate('orderId', 'pickupAddress dropoffAddress')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         Feedback.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: feedbacks,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy đánh giá', error: error.message });
   }
};

// Admin: Cập nhật trạng thái đánh giá
export const updateFeedbackStatus = async (req, res) => {
   try {
      const { feedbackId } = req.params;
      const { status, adminResponse } = req.body;

      const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
      if (!allowedStatuses.includes(status)) {
         return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }

      const feedback = await Feedback.findByIdAndUpdate(
         feedbackId,
         {
            status,
            adminResponse,
            ...(status === 'Approved' && { resolvedAt: new Date() })
         },
         { new: true }
      );

      if (!feedback) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
      }

      // Nếu approve, cập nhật lại rating driver
      if (status === 'Approved') {
         await updateDriverRating(feedback.driverId);
      }

      return res.json({ success: true, data: feedback });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật đánh giá', error: error.message });
   }
};

// Hàm helper: Cập nhật rating trung bình của driver
async function updateDriverRating(driverId) {
   try {
      const stats = await Feedback.aggregate([
         { $match: { driverId, status: 'Approved' } },
         {
            $group: {
               _id: null,
               avgRating: { $avg: '$overallRating' },
               totalFeedbacks: { $sum: 1 }
            }
         }
      ]);

      if (stats.length > 0) {
         const { avgRating, totalFeedbacks } = stats[0];
         await Driver.findByIdAndUpdate(driverId, {
            rating: Math.round(avgRating * 10) / 10, // Làm tròn 1 chữ số thập phân
            totalFeedbacks
         });
      }
   } catch (error) {
      console.error('Lỗi cập nhật rating driver:', error);
   }
}
