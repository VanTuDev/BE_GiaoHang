import Violation from '../models/violation.model.js';
import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import { sendDriverBannedEmail, sendReportResolvedEmail } from '../utils/emailService.js';

// Customer báo cáo vi phạm tài xế
export const reportViolation = async (req, res) => {
   try {
      const {
         driverId: driverIdFromBody,
         orderId,
         orderItemId,
         violationType,
         description,
         photos = [],
         severity = 'Medium',
         isAnonymous = false
      } = req.body;

      let resolvedDriverId = driverIdFromBody;

      // Nếu không có driverId, lấy từ đơn hàng
      if (!resolvedDriverId && orderId) {
         const order = await Order.findById(orderId);
         if (order) {
            const deliveredItem = order.items.find(item => item.status === 'Delivered' && item.driverId);
            if (deliveredItem) {
               resolvedDriverId = deliveredItem.driverId;
            }
         }
      }

      if (!resolvedDriverId) {
         return res.status(400).json({ success: false, message: 'Không tìm thấy tài xế cho đơn hàng này' });
      }

      // Kiểm tra driver tồn tại
      const driver = await Driver.findById(resolvedDriverId);
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
      }

      // Kiểm tra đơn hàng (nếu có)
      if (orderId) {
         const order = await Order.findById(orderId);
         if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
         }

         // Kiểm tra quyền báo cáo (chỉ customer của đơn hàng hoặc admin)
         if (String(order.customerId) !== String(req.user._id) && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Không có quyền báo cáo vi phạm cho đơn hàng này' });
         }
      }

      // Kiểm tra đã báo cáo chưa (tránh spam)
      const existingReport = await Violation.findOne({
         reporterId: req.user._id,
         driverId: resolvedDriverId,
         orderId: orderId || null,
         orderItemId: orderItemId || null,
         status: { $in: ['Pending', 'Investigating'] }
      });

      if (existingReport) {
         return res.status(400).json({ success: false, message: 'Bạn đã báo cáo vi phạm này rồi' });
      }

      // Tạo báo cáo vi phạm
      const violation = await Violation.create({
         reporterId: req.user._id,
         driverId: resolvedDriverId,
         orderId: orderId || null,
         orderItemId: orderItemId || null,
         violationType,
         description,
         photos: Array.isArray(photos) ? photos : [],
         severity,
         isAnonymous
      });

      return res.status(201).json({ success: true, data: violation });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi tạo báo cáo vi phạm', error: error.message });
   }
};

// Lấy danh sách báo cáo của customer
export const getCustomerReports = async (req, res) => {
   try {
      const { page = 1, limit = 10, status } = req.query;

      const query = { reporterId: req.user._id };
      if (status) query.status = status;

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [violations, total] = await Promise.all([
         Violation.find(query)
            .populate('driverId', 'userId')
            .populate('orderId', 'pickupAddress dropoffAddress')
            .populate('adminId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         Violation.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: violations,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo', error: error.message });
   }
};

// Admin: Lấy tất cả báo cáo vi phạm
export const getAllViolations = async (req, res) => {
   try {
      const { page = 1, limit = 10, status, violationType, driverId, severity } = req.query;

      const query = {};
      if (status) query.status = status;
      if (violationType) query.violationType = violationType;
      if (driverId) query.driverId = driverId;
      if (severity) query.severity = severity;

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      const [violations, total] = await Promise.all([
         Violation.find(query)
            .populate('reporterId', 'name email')
            .populate({
               path: 'driverId',
               select: 'userId rating totalTrips status',
               populate: {
                  path: 'userId',
                  select: 'name email phone avatarUrl'
               }
            })
            .populate('orderId', 'pickupAddress dropoffAddress')
            .populate('adminId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         Violation.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: violations,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo vi phạm', error: error.message });
   }
};

// Admin: Cập nhật trạng thái báo cáo vi phạm
export const updateViolationStatus = async (req, res) => {
   try {
      const { violationId } = req.params;
      const { status, adminNotes, penalty, warningCount, banDriver, banDuration } = req.body;

      const allowedStatuses = ['Pending', 'Investigating', 'Resolved', 'Dismissed'];
      if (!allowedStatuses.includes(status)) {
         return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }

      const updateData = {
         status,
         adminId: req.user._id,
         adminNotes,
         penalty: penalty || 0,
         warningCount: warningCount || 0
      };

      if (status === 'Resolved' || status === 'Dismissed') {
         updateData.resolvedAt = new Date();
      }

      const violation = await Violation.findByIdAndUpdate(
         violationId,
         updateData,
         { new: true }
      )
         .populate('driverId', 'userId')
         .populate('reporterId', 'name email');

      if (!violation) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo vi phạm' });
      }

      // Nếu có phạt tiền, cập nhật số dư driver
      if (penalty > 0) {
         await Driver.findByIdAndUpdate(violation.driverId, {
            $inc: { incomeBalance: -penalty }
         });
      }

      // Nếu admin quyết định cấm tài xế
      if (banDriver === true) {
         const driver = await Driver.findById(violation.driverId).populate('userId', 'name email');

         if (driver) {
            // Cập nhật trạng thái driver thành "Blocked"
            driver.status = 'Blocked';
            driver.isOnline = false;
            await driver.save();

            // Gửi email thông báo cho tài xế
            if (driver.userId && driver.userId.email) {
               const banReason = adminNotes || 'Vi phạm quy định của hệ thống';
               await sendDriverBannedEmail(
                  driver.userId.email,
                  driver.userId.name,
                  banReason,
                  banDuration || 'Vĩnh viễn'
               );
               console.log(`✅ Đã gửi email cấm tài xế: ${driver.userId.email}`);
            }

            console.log(`⚠️ Tài xế ${driver._id} đã bị cấm`);
         }
      }

      // Gửi email cảm ơn cho khách hàng nếu báo cáo được giải quyết
      if (status === 'Resolved' && violation.reporterId && violation.reporterId.email) {
         const resolutionMessage = adminNotes || 'Báo cáo của bạn đã được xử lý và tài xế đã nhận hình phạt phù hợp.';
         await sendReportResolvedEmail(
            violation.reporterId.email,
            violation.reporterId.name,
            violation.violationType,
            resolutionMessage
         );
         console.log(`✅ Đã gửi email cảm ơn khách hàng: ${violation.reporterId.email}`);
      }

      return res.json({
         success: true,
         data: violation,
         message: banDriver ? 'Đã cập nhật và cấm tài xế thành công' : 'Đã cập nhật báo cáo thành công'
      });
   } catch (error) {
      console.error('❌ Lỗi cập nhật báo cáo vi phạm:', error);
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật báo cáo vi phạm', error: error.message });
   }
};

// Admin: Lấy thống kê vi phạm
export const getViolationStats = async (req, res) => {
   try {
      const { driverId, timeRange = '30d' } = req.query;

      // Tính thời gian bắt đầu
      const now = new Date();
      let startDate;
      switch (timeRange) {
         case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
         case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
         case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
         default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const matchQuery = { createdAt: { $gte: startDate } };
      if (driverId) matchQuery.driverId = driverId;

      const stats = await Violation.aggregate([
         { $match: matchQuery },
         {
            $group: {
               _id: null,
               total: { $sum: 1 },
               pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
               investigating: { $sum: { $cond: [{ $eq: ['$status', 'Investigating'] }, 1, 0] } },
               resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
               dismissed: { $sum: { $cond: [{ $eq: ['$status', 'Dismissed'] }, 1, 0] } },
               totalPenalty: { $sum: '$penalty' },
               avgSeverity: {
                  $avg: {
                     $switch: {
                        branches: [
                           { case: { $eq: ['$severity', 'Low'] }, then: 1 },
                           { case: { $eq: ['$severity', 'Medium'] }, then: 2 },
                           { case: { $eq: ['$severity', 'High'] }, then: 3 },
                           { case: { $eq: ['$severity', 'Critical'] }, then: 4 }
                        ],
                        default: 2
                     }
                  }
               }
            }
         }
      ]);

      // Thống kê theo loại vi phạm
      const violationTypeStats = await Violation.aggregate([
         { $match: matchQuery },
         {
            $group: {
               _id: '$violationType',
               count: { $sum: 1 }
            }
         },
         { $sort: { count: -1 } }
      ]);

      // Top drivers có nhiều vi phạm
      const topViolators = await Violation.aggregate([
         { $match: matchQuery },
         {
            $group: {
               _id: '$driverId',
               count: { $sum: 1 },
               totalPenalty: { $sum: '$penalty' }
            }
         },
         { $sort: { count: -1 } },
         { $limit: 10 },
         {
            $lookup: {
               from: 'drivers',
               localField: '_id',
               foreignField: '_id',
               as: 'driver'
            }
         },
         {
            $lookup: {
               from: 'users',
               localField: 'driver.userId',
               foreignField: '_id',
               as: 'user'
            }
         }
      ]);

      return res.json({
         success: true,
         data: {
            overview: stats[0] || {
               total: 0,
               pending: 0,
               investigating: 0,
               resolved: 0,
               dismissed: 0,
               totalPenalty: 0,
               avgSeverity: 0
            },
            violationTypeStats,
            topViolators
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy thống kê vi phạm', error: error.message });
   }
};
