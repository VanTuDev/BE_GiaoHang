import mongoose from 'mongoose';
import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import WithdrawalRequest from '../models/withdrawalRequest.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';

/**
 * ADMIN: XEM DANH SÁCH TẤT CẢ YÊU CẦU RÚT TIỀN
 * 
 * Chức năng: Admin xem danh sách tất cả yêu cầu rút tiền từ các tài xế
 * Endpoint: GET /api/admin/withdrawals
 * 
 * Query params:
 * - page: Số trang (default: 1)
 * - limit: Số lượng mỗi trang (default: 20)
 * - status: Lọc theo trạng thái (Pending, Approved, Rejected, Completed, Cancelled)
 * - driverId: Lọc theo tài xế cụ thể
 * - bankAccountConfirmed: Lọc theo trạng thái xác nhận tài khoản (true/false)
 */
export const getAllWithdrawalRequests = async (req, res) => {
   try {
      const { page = 1, limit = 20, status, driverId, bankAccountConfirmed } = req.query;

      // Build query
      const query = {};
      if (status) query.status = status;
      if (driverId) query.driverId = driverId;
      if (bankAccountConfirmed !== undefined) {
         query.bankAccountConfirmed = bankAccountConfirmed === 'true';
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const [requests, total] = await Promise.all([
         WithdrawalRequest.find(query)
            .populate('driverId', 'userId status rating')
            .populate({
               path: 'driverId',
               populate: {
                  path: 'userId',
                  select: 'name email phone'
               }
            })
            .populate('processedBy', 'name email')
            .populate('transactionId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         WithdrawalRequest.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: requests,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy danh sách yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy danh sách yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ADMIN: XEM CHI TIẾT YÊU CẦU RÚT TIỀN
 * 
 * Chức năng: Admin xem chi tiết một yêu cầu rút tiền cụ thể
 * Endpoint: GET /api/admin/withdrawals/:requestId
 */
export const getWithdrawalRequestDetail = async (req, res) => {
   try {
      const { requestId } = req.params;

      const withdrawalRequest = await WithdrawalRequest.findById(requestId)
         .populate('driverId', 'userId status rating incomeBalance')
         .populate({
            path: 'driverId',
            populate: {
               path: 'userId',
               select: 'name email phone address'
            }
         })
         .populate('processedBy', 'name email')
         .populate('transactionId');

      if (!withdrawalRequest) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      return res.json({
         success: true,
         data: withdrawalRequest
      });

   } catch (error) {
      console.error('❌ Lỗi lấy chi tiết yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy chi tiết yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ADMIN: CHẤP THUẬN YÊU CẦU RÚT TIỀN
 * 
 * Chức năng: Admin chấp thuận yêu cầu rút tiền của tài xế
 * Endpoint: POST /api/admin/withdrawals/:requestId/approve
 * 
 * Body:
 * - adminNote: Ghi chú từ admin (optional)
 * 
 * Logic:
 * - Kiểm tra yêu cầu có status = "Pending" và đã được tài xế xác nhận tài khoản
 * - Kiểm tra số dư tài xế có đủ không
 * - Trừ tiền từ driver.incomeBalance
 * - Tạo DriverTransaction với type: 'Withdrawal'
 * - Cập nhật status = "Approved"
 * - Lưu transactionId vào withdrawal request
 * - Lưu thông tin admin xử lý
 */
export const approveWithdrawalRequest = async (req, res) => {
   try {
      const { requestId } = req.params;
      const { adminNote } = req.body;

      // Tìm yêu cầu
      const withdrawalRequest = await WithdrawalRequest.findById(requestId)
         .populate('driverId');

      if (!withdrawalRequest) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      // Kiểm tra trạng thái
      if (withdrawalRequest.status !== 'Pending') {
         return res.status(400).json({
            success: false,
            message: `Yêu cầu này đã được xử lý (status: ${withdrawalRequest.status})`
         });
      }

      // Kiểm tra tài xế đã xác nhận tài khoản chưa
      if (!withdrawalRequest.bankAccountConfirmed) {
         return res.status(400).json({
            success: false,
            message: 'Tài xế chưa xác nhận thông tin tài khoản. Yêu cầu tài xế lên trụ sở công ty để xác nhận.'
         });
      }

      // Lấy driver
      const driver = await Driver.findById(withdrawalRequest.driverId._id);
      if (!driver) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy tài xế'
         });
      }

      // Kiểm tra số dư
      const balance = driver.incomeBalance || 0;
      if (balance < withdrawalRequest.requestedAmount) {
         return res.status(400).json({
            success: false,
            message: `Số dư tài xế không đủ. Số dư hiện tại: ${balance.toLocaleString('vi-VN')} VND, yêu cầu: ${withdrawalRequest.requestedAmount.toLocaleString('vi-VN')} VND`
         });
      }

      // Bắt đầu transaction để đảm bảo tính nhất quán
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Trừ tiền từ số dư tài xế
         driver.incomeBalance = (driver.incomeBalance || 0) - withdrawalRequest.requestedAmount;
         await driver.save({ session });

         // Tạo transaction record
         const transaction = await DriverTransaction.create([{
            driverId: driver._id,
            amount: withdrawalRequest.requestedAmount,
            fee: withdrawalRequest.systemFee,
            netAmount: withdrawalRequest.actualAmount,
            type: 'Withdrawal',
            status: 'Completed',
            description: `Rút tiền: ${withdrawalRequest.actualAmount.toLocaleString('vi-VN')} VND (phí hệ thống: ${withdrawalRequest.systemFee.toLocaleString('vi-VN')} VND)`,
            paymentMethod: 'Bank Transfer',
            transactionDate: new Date()
         }], { session });

         // Cập nhật yêu cầu rút tiền
         withdrawalRequest.status = 'Approved';
         withdrawalRequest.processedBy = req.user._id;
         withdrawalRequest.processedAt = new Date();
         withdrawalRequest.transactionId = transaction[0]._id;
         if (adminNote) {
            withdrawalRequest.adminNote = adminNote.trim();
         }
         await withdrawalRequest.save({ session });

         // Commit transaction
         await session.commitTransaction();

         // Populate lại để trả về đầy đủ thông tin
         await withdrawalRequest.populate('transactionId');
         await withdrawalRequest.populate('processedBy', 'name email');

         return res.json({
            success: true,
            message: 'Đã chấp thuận yêu cầu rút tiền và trừ tiền từ tài khoản tài xế',
            data: {
               withdrawalRequest,
               driver: {
                  _id: driver._id,
                  incomeBalance: driver.incomeBalance
               },
               transaction: transaction[0]
            }
         });

      } catch (error) {
         // Rollback nếu có lỗi
         await session.abortTransaction();
         throw error;
      } finally {
         session.endSession();
      }

   } catch (error) {
      console.error('❌ Lỗi chấp thuận yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi chấp thuận yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ADMIN: TỪ CHỐI YÊU CẦU RÚT TIỀN
 * 
 * Chức năng: Admin từ chối yêu cầu rút tiền của tài xế
 * Endpoint: POST /api/admin/withdrawals/:requestId/reject
 * 
 * Body:
 * - rejectionReason: Lý do từ chối (required)
 * - adminNote: Ghi chú thêm (optional)
 * 
 * Logic:
 * - Chỉ có thể từ chối khi status = "Pending"
 * - Cập nhật status = "Rejected"
 * - Lưu lý do từ chối và thông tin admin xử lý
 * - KHÔNG trừ tiền tài xế
 */
export const rejectWithdrawalRequest = async (req, res) => {
   try {
      const { requestId } = req.params;
      const { rejectionReason, adminNote } = req.body;

      // Validate
      if (!rejectionReason || !rejectionReason.trim()) {
         return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập lý do từ chối'
         });
      }

      // Tìm yêu cầu
      const withdrawalRequest = await WithdrawalRequest.findById(requestId);

      if (!withdrawalRequest) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      // Kiểm tra trạng thái
      if (withdrawalRequest.status !== 'Pending') {
         return res.status(400).json({
            success: false,
            message: `Yêu cầu này đã được xử lý (status: ${withdrawalRequest.status})`
         });
      }

      // Cập nhật yêu cầu
      withdrawalRequest.status = 'Rejected';
      withdrawalRequest.rejectionReason = rejectionReason.trim();
      withdrawalRequest.processedBy = req.user._id;
      withdrawalRequest.processedAt = new Date();
      if (adminNote) {
         withdrawalRequest.adminNote = adminNote.trim();
      }
      await withdrawalRequest.save();

      // Populate để trả về đầy đủ thông tin
      await withdrawalRequest.populate('processedBy', 'name email');
      await withdrawalRequest.populate('driverId', 'userId')
         .then(wr => wr.populate({
            path: 'driverId',
            populate: { path: 'userId', select: 'name email phone' }
         }));

      return res.json({
         success: true,
         message: 'Đã từ chối yêu cầu rút tiền',
         data: withdrawalRequest
      });

   } catch (error) {
      console.error('❌ Lỗi từ chối yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi từ chối yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ADMIN: ĐÁNH DẤU HOÀN THÀNH CHUYỂN TIỀN
 * 
 * Chức năng: Admin đánh dấu đã hoàn thành chuyển tiền cho tài xế
 * Endpoint: POST /api/admin/withdrawals/:requestId/complete
 * 
 * Body:
 * - adminNote: Ghi chú (optional)
 * 
 * Logic:
 * - Chỉ có thể đánh dấu khi status = "Approved"
 * - Cập nhật status = "Completed"
 * - Lưu thời gian hoàn thành
 */
export const completeWithdrawalRequest = async (req, res) => {
   try {
      const { requestId } = req.params;
      const { adminNote } = req.body;

      // Tìm yêu cầu
      const withdrawalRequest = await WithdrawalRequest.findById(requestId);

      if (!withdrawalRequest) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      // Kiểm tra trạng thái
      if (withdrawalRequest.status !== 'Approved') {
         return res.status(400).json({
            success: false,
            message: `Chỉ có thể đánh dấu hoàn thành khi yêu cầu đã được chấp thuận (status hiện tại: ${withdrawalRequest.status})`
         });
      }

      // Cập nhật
      withdrawalRequest.status = 'Completed';
      if (adminNote) {
         withdrawalRequest.adminNote = (withdrawalRequest.adminNote || '') + '\n' + adminNote.trim();
      }
      await withdrawalRequest.save();

      // Populate để trả về đầy đủ thông tin
      await withdrawalRequest.populate('processedBy', 'name email');
      await withdrawalRequest.populate('transactionId');

      return res.json({
         success: true,
         message: 'Đã đánh dấu hoàn thành chuyển tiền',
         data: withdrawalRequest
      });

   } catch (error) {
      console.error('❌ Lỗi đánh dấu hoàn thành:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi đánh dấu hoàn thành',
         error: error.message
      });
   }
};

/**
 * ADMIN: THỐNG KÊ YÊU CẦU RÚT TIỀN
 * 
 * Chức năng: Admin xem thống kê về các yêu cầu rút tiền
 * Endpoint: GET /api/admin/withdrawals/stats
 * 
 * Query params:
 * - startDate: Ngày bắt đầu (optional)
 * - endDate: Ngày kết thúc (optional)
 */
export const getWithdrawalStats = async (req, res) => {
   try {
      const { startDate, endDate } = req.query;

      // Build date range
      const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate) : new Date();

      // Aggregate stats
      const stats = await WithdrawalRequest.aggregate([
         {
            $match: {
               createdAt: { $gte: start, $lte: end }
            }
         },
         {
            $group: {
               _id: '$status',
               count: { $sum: 1 },
               totalAmount: { $sum: '$amount' },
               totalNetAmount: { $sum: '$netAmount' },
               totalSystemFee: { $sum: '$systemFee' }
            }
         }
      ]);

      // Tính tổng
      const totals = stats.reduce((acc, cur) => ({
         count: acc.count + cur.count,
         totalAmount: acc.totalAmount + cur.totalAmount,
         totalNetAmount: acc.totalNetAmount + cur.totalNetAmount,
         totalSystemFee: acc.totalSystemFee + cur.totalSystemFee
      }), { count: 0, totalAmount: 0, totalNetAmount: 0, totalSystemFee: 0 });

      // Format kết quả
      const statusMap = {
         Pending: { count: 0, totalAmount: 0, totalNetAmount: 0, totalSystemFee: 0 },
         Approved: { count: 0, totalAmount: 0, totalNetAmount: 0, totalSystemFee: 0 },
         Rejected: { count: 0, totalAmount: 0, totalNetAmount: 0, totalSystemFee: 0 },
         Completed: { count: 0, totalAmount: 0, totalNetAmount: 0, totalSystemFee: 0 },
         Cancelled: { count: 0, totalAmount: 0, totalNetAmount: 0, totalSystemFee: 0 }
      };

      stats.forEach(stat => {
         statusMap[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount,
            totalNetAmount: stat.totalNetAmount,
            totalSystemFee: stat.totalSystemFee
         };
      });

      return res.json({
         success: true,
         data: {
            byStatus: statusMap,
            totals,
            period: {
               startDate: start,
               endDate: end
            }
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy thống kê yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy thống kê yêu cầu rút tiền',
         error: error.message
      });
   }
};

