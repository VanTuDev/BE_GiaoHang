import Driver from '../models/driver.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import WithdrawalRequest from '../models/withdrawalRequest.model.js';
import User from '../models/user.model.js';

/**
 * ============================================
 * DRIVER: TẠO YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: POST /api/driver/withdrawal/request
 * 
 * Chức năng:
 * - Tài xế nhập thông tin tài khoản ngân hàng và số tiền muốn rút
 * - Phải xác nhận lại số tài khoản để đảm bảo chính xác
 * - Kiểm tra số dư tài khoản có đủ không
 * - Tạo yêu cầu rút tiền với trạng thái "Pending"
 */
export const createWithdrawalRequest = async (req, res) => {
   try {
      const { 
         requestedAmount, 
         bankAccountName, 
         bankAccountNumber, 
         bankName, 
         bankCode,
         confirmedAccountNumber,
         driverNote 
      } = req.body;

      // Validation: Kiểm tra các trường bắt buộc
      if (!requestedAmount || !bankAccountName || !bankAccountNumber || !bankName || !confirmedAccountNumber) {
         return res.status(400).json({
            success: false,
            message: 'Vui lòng điền đầy đủ thông tin: số tiền, tên tài khoản, số tài khoản, tên ngân hàng và xác nhận số tài khoản'
         });
      }

      // Validation: Số tiền phải là số dương
      const amount = Number(requestedAmount);
      if (isNaN(amount) || amount <= 0) {
         return res.status(400).json({
            success: false,
            message: 'Số tiền phải lớn hơn 0'
         });
      }

      // Validation: Xác nhận số tài khoản phải khớp
      if (bankAccountNumber !== confirmedAccountNumber) {
         return res.status(400).json({
            success: false,
            message: 'Số tài khoản xác nhận không khớp. Vui lòng kiểm tra lại hoặc đến trụ sở công ty để làm việc'
         });
      }

      // Tìm driver từ user đang đăng nhập
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy hồ sơ tài xế'
         });
      }

      // Kiểm tra số dư tài khoản
      if (driver.incomeBalance < amount) {
         return res.status(400).json({
            success: false,
            message: `Số dư không đủ. Số dư hiện tại: ${driver.incomeBalance.toLocaleString('vi-VN')} VND`
         });
      }

      // Tính toán số tiền thực nhận (80%) và phí hệ thống (20%)
      const actualAmount = Math.floor(amount * 0.8); // 80%
      const systemFee = amount - actualAmount; // 20%

      // Tạo yêu cầu rút tiền
      const withdrawalRequest = await WithdrawalRequest.create({
         driverId: driver._id,
         userId: req.user._id,
         requestedAmount: amount,
         actualAmount: actualAmount,
         systemFee: systemFee,
         bankAccountName: bankAccountName.trim(),
         bankAccountNumber: bankAccountNumber.trim(),
         bankName: bankName.trim(),
         bankCode: bankCode?.trim() || '',
         confirmedAccountNumber: confirmedAccountNumber.trim(),
         driverNote: driverNote?.trim() || '',
         status: 'Pending'
      });

      return res.status(201).json({
         success: true,
         message: 'Yêu cầu rút tiền đã được gửi thành công. Vui lòng chờ admin xử lý.',
         data: withdrawalRequest
      });

   } catch (error) {
      console.error('❌ Lỗi tạo yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi tạo yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * DRIVER: XEM LỊCH SỬ YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: GET /api/driver/withdrawal/history
 * 
 * Chức năng:
 * - Hiển thị tất cả yêu cầu rút tiền của tài xế
 * - Có thể filter theo status, sắp xếp theo thời gian
 */
export const getMyWithdrawalHistory = async (req, res) => {
   try {
      const { status, page = 1, limit = 10 } = req.query;

      // Tìm driver từ user đang đăng nhập
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy hồ sơ tài xế'
         });
      }

      // Xây dựng query
      const query = { driverId: driver._id };
      if (status) {
         query.status = status;
      }

      // Phân trang
      const skip = (Number(page) - 1) * Number(limit);
      const limitNum = Number(limit);

      // Lấy danh sách yêu cầu
      const withdrawals = await WithdrawalRequest.find(query)
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limitNum)
         .populate('processedBy', 'name email')
         .lean();

      // Đếm tổng số
      const total = await WithdrawalRequest.countDocuments(query);

      return res.json({
         success: true,
         data: withdrawals,
         pagination: {
            page: Number(page),
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy lịch sử rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi lấy lịch sử rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * DRIVER: XEM CHI TIẾT MỘT YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: GET /api/driver/withdrawal/:id
 * 
 * Chức năng:
 * - Xem chi tiết một yêu cầu rút tiền cụ thể
 */
export const getWithdrawalDetail = async (req, res) => {
   try {
      const { id } = req.params;

      // Tìm driver từ user đang đăng nhập
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy hồ sơ tài xế'
         });
      }

      // Tìm yêu cầu rút tiền
      const withdrawal = await WithdrawalRequest.findOne({
         _id: id,
         driverId: driver._id
      })
         .populate('processedBy', 'name email')
         .populate('transactionId')
         .lean();

      if (!withdrawal) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      return res.json({
         success: true,
         data: withdrawal
      });

   } catch (error) {
      console.error('❌ Lỗi lấy chi tiết yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi lấy chi tiết yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * ADMIN: XEM DANH SÁCH TẤT CẢ YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: GET /api/admin/withdrawals
 * 
 * Chức năng:
 * - Admin xem tất cả yêu cầu rút tiền từ các tài xế
 * - Có thể filter theo status, driverId
 * - Sắp xếp theo thời gian tạo
 */
export const getAllWithdrawalRequests = async (req, res) => {
   try {
      const { status, driverId, page = 1, limit = 20 } = req.query;

      // Xây dựng query
      const query = {};
      if (status) {
         query.status = status;
      }
      if (driverId) {
         query.driverId = driverId;
      }

      // Phân trang
      const skip = (Number(page) - 1) * Number(limit);
      const limitNum = Number(limit);

      // Lấy danh sách yêu cầu với thông tin driver và user
      const withdrawals = await WithdrawalRequest.find(query)
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limitNum)
         .populate('driverId', 'status rating totalTrips incomeBalance')
         .populate('userId', 'name email phone')
         .populate('processedBy', 'name email')
         .populate('transactionId')
         .lean();

      // Đếm tổng số
      const total = await WithdrawalRequest.countDocuments(query);

      return res.json({
         success: true,
         data: withdrawals,
         pagination: {
            page: Number(page),
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy danh sách yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi lấy danh sách yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * ADMIN: XEM CHI TIẾT MỘT YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: GET /api/admin/withdrawals/:id
 * 
 * Chức năng:
 * - Admin xem chi tiết một yêu cầu rút tiền cụ thể
 */
export const getAdminWithdrawalDetail = async (req, res) => {
   try {
      const { id } = req.params;

      const withdrawal = await WithdrawalRequest.findById(id)
         .populate('driverId')
         .populate('userId', 'name email phone')
         .populate('processedBy', 'name email')
         .populate('transactionId')
         .lean();

      if (!withdrawal) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      return res.json({
         success: true,
         data: withdrawal
      });

   } catch (error) {
      console.error('❌ Lỗi lấy chi tiết yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi lấy chi tiết yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * ADMIN: CHẤP THUẬN YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: PUT /api/admin/withdrawals/:id/approve
 * 
 * Chức năng:
 * - Admin chấp thuận yêu cầu rút tiền
 * - Trừ số tiền từ incomeBalance của driver
 * - Tạo giao dịch trong DriverTransaction với type "Withdrawal"
 * - Cập nhật trạng thái yêu cầu thành "Approved" hoặc "Completed"
 */
export const approveWithdrawal = async (req, res) => {
   try {
      const { id } = req.params;

      // Tìm yêu cầu rút tiền
      const withdrawal = await WithdrawalRequest.findById(id)
         .populate('driverId');

      if (!withdrawal) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      // Kiểm tra trạng thái
      if (withdrawal.status !== 'Pending') {
         return res.status(400).json({
            success: false,
            message: `Yêu cầu này đã được xử lý. Trạng thái hiện tại: ${withdrawal.status}`
         });
      }

      const driver = withdrawal.driverId;
      if (!driver) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thông tin tài xế'
         });
      }

      // Kiểm tra số dư tài khoản (có thể đã thay đổi sau khi tạo yêu cầu)
      if (driver.incomeBalance < withdrawal.requestedAmount) {
         return res.status(400).json({
            success: false,
            message: `Số dư tài xế không đủ. Số dư hiện tại: ${driver.incomeBalance.toLocaleString('vi-VN')} VND`
         });
      }

      // Bắt đầu transaction (nếu dùng MongoDB transaction)
      // Trừ tiền từ incomeBalance của driver
      driver.incomeBalance -= withdrawal.requestedAmount;
      await driver.save();

      // Tạo giao dịch trong DriverTransaction
      const transaction = await DriverTransaction.create({
         driverId: driver._id,
         amount: withdrawal.requestedAmount, // Tổng số tiền rút
         fee: withdrawal.systemFee, // Phí hệ thống (20%)
         netAmount: withdrawal.actualAmount, // Số tiền thực nhận (80%)
         type: 'Withdrawal',
         status: 'Completed',
         description: `Rút tiền về tài khoản ${withdrawal.bankName} - ${withdrawal.bankAccountNumber}`,
         paymentMethod: 'Bank Transfer',
         transactionDate: new Date()
      });

      // Cập nhật yêu cầu rút tiền
      withdrawal.status = 'Approved';
      withdrawal.processedBy = req.user._id;
      withdrawal.approvedAt = new Date();
      withdrawal.transactionId = transaction._id;
      await withdrawal.save();

      return res.json({
         success: true,
         message: 'Đã chấp thuận yêu cầu rút tiền. Số tiền đã được trừ từ tài khoản tài xế.',
         data: {
            withdrawal,
            transaction,
            driverBalance: driver.incomeBalance
         }
      });

   } catch (error) {
      console.error('❌ Lỗi chấp thuận yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi chấp thuận yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * ADMIN: TỪ CHỐI YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: PUT /api/admin/withdrawals/:id/reject
 * 
 * Chức năng:
 * - Admin từ chối yêu cầu rút tiền
 * - Cập nhật trạng thái thành "Rejected"
 * - Lưu lý do từ chối
 */
export const rejectWithdrawal = async (req, res) => {
   try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      // Tìm yêu cầu rút tiền
      const withdrawal = await WithdrawalRequest.findById(id);

      if (!withdrawal) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      // Kiểm tra trạng thái
      if (withdrawal.status !== 'Pending') {
         return res.status(400).json({
            success: false,
            message: `Yêu cầu này đã được xử lý. Trạng thái hiện tại: ${withdrawal.status}`
         });
      }

      // Cập nhật yêu cầu
      withdrawal.status = 'Rejected';
      withdrawal.processedBy = req.user._id;
      withdrawal.rejectedAt = new Date();
      withdrawal.rejectionReason = rejectionReason?.trim() || 'Không có lý do cụ thể';
      await withdrawal.save();

      return res.json({
         success: true,
         message: 'Đã từ chối yêu cầu rút tiền',
         data: withdrawal
      });

   } catch (error) {
      console.error('❌ Lỗi từ chối yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi từ chối yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * ADMIN: ĐÁNH DẤU ĐÃ CHUYỂN TIỀN THÀNH CÔNG
 * ============================================
 * Endpoint: PUT /api/admin/withdrawals/:id/complete
 * 
 * Chức năng:
 * - Admin xác nhận đã chuyển tiền thành công
 * - Cập nhật trạng thái thành "Completed"
 */
export const completeWithdrawal = async (req, res) => {
   try {
      const { id } = req.params;

      // Tìm yêu cầu rút tiền
      const withdrawal = await WithdrawalRequest.findById(id);

      if (!withdrawal) {
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy yêu cầu rút tiền'
         });
      }

      // Kiểm tra trạng thái (chỉ có thể complete từ Approved)
      if (withdrawal.status !== 'Approved') {
         return res.status(400).json({
            success: false,
            message: `Chỉ có thể hoàn thành yêu cầu đã được chấp thuận. Trạng thái hiện tại: ${withdrawal.status}`
         });
      }

      // Cập nhật trạng thái
      withdrawal.status = 'Completed';
      withdrawal.completedAt = new Date();
      await withdrawal.save();

      return res.json({
         success: true,
         message: 'Đã đánh dấu chuyển tiền thành công',
         data: withdrawal
      });

   } catch (error) {
      console.error('❌ Lỗi hoàn thành yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi hoàn thành yêu cầu rút tiền',
         error: error.message
      });
   }
};

/**
 * ============================================
 * ADMIN: THỐNG KÊ YÊU CẦU RÚT TIỀN
 * ============================================
 * Endpoint: GET /api/admin/withdrawals/stats
 * 
 * Chức năng:
 * - Thống kê tổng số yêu cầu theo trạng thái
 * - Tổng số tiền đã rút, đang chờ, đã từ chối
 */
export const getWithdrawalStats = async (req, res) => {
   try {
      const { startDate, endDate } = req.query;

      // Xây dựng query theo thời gian
      const dateQuery = {};
      if (startDate || endDate) {
         dateQuery.createdAt = {};
         if (startDate) {
            dateQuery.createdAt.$gte = new Date(startDate);
         }
         if (endDate) {
            dateQuery.createdAt.$lte = new Date(endDate);
         }
      }

      // Thống kê theo trạng thái
      const stats = await WithdrawalRequest.aggregate([
         { $match: dateQuery },
         {
            $group: {
               _id: '$status',
               count: { $sum: 1 },
               totalRequestedAmount: { $sum: '$requestedAmount' },
               totalActualAmount: { $sum: '$actualAmount' },
               totalSystemFee: { $sum: '$systemFee' }
            }
         }
      ]);

      // Tính tổng
      const totals = await WithdrawalRequest.aggregate([
         { $match: dateQuery },
         {
            $group: {
               _id: null,
               totalRequests: { $sum: 1 },
               totalRequestedAmount: { $sum: '$requestedAmount' },
               totalActualAmount: { $sum: '$actualAmount' },
               totalSystemFee: { $sum: '$systemFee' }
            }
         }
      ]);

      return res.json({
         success: true,
         data: {
            byStatus: stats,
            totals: totals[0] || {
               totalRequests: 0,
               totalRequestedAmount: 0,
               totalActualAmount: 0,
               totalSystemFee: 0
            }
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy thống kê yêu cầu rút tiền:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi hệ thống khi lấy thống kê yêu cầu rút tiền',
         error: error.message
      });
   }
};
