import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import Order from '../models/order.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import Vehicle from '../models/vehicle.model.js';
import { sendDriverBannedEmail } from '../utils/emailService.js';

// Lấy thống kê tổng quan
export const getDashboardStats = async (req, res) => {
   try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
         totalUsers,
         totalDrivers,
         totalOrders,
         totalRevenue,
         monthlyOrders,
         monthlyRevenue,
         pendingApplications
      ] = await Promise.all([
         User.countDocuments({ role: 'Customer' }),
         Driver.countDocuments({ status: 'Active' }),
         Order.countDocuments(),
         DriverTransaction.aggregate([
            { $match: { type: 'OrderEarning' } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
         ]),
         Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
         DriverTransaction.aggregate([
            { $match: { type: 'OrderEarning', createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$fee' } } }
         ]),
         Driver.countDocuments({ status: 'Pending' })
      ]);

      return res.json({
         success: true,
         data: {
            totalUsers,
            totalDrivers,
            totalOrders,
            totalRevenue: totalRevenue.length ? totalRevenue[0].total : 0,
            monthlyOrders,
            monthlyRevenue: monthlyRevenue.length ? monthlyRevenue[0].total : 0,
            pendingApplications
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy thống kê', error: error.message });
   }
};

// Lấy danh sách người dùng
export const getUsers = async (req, res) => {
   try {
      const { role, page = 1, limit = 20, search } = req.query;
      const query = {};

      if (role && ['Customer', 'Driver', 'Admin'].includes(role)) {
         query.role = role;
      }

      if (search) {
         query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
         ];
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
         User.find(query)
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
         User.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: users,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng', error: error.message });
   }
};

// Lấy danh sách tài xế
export const getDrivers = async (req, res) => {
   try {
      const { status, page = 1, limit = 20, search } = req.query;
      const query = {};

      if (status && ['Pending', 'Active', 'Rejected', 'Blocked'].includes(status)) {
         query.status = status;
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      let drivers = await Driver.find(query)
         .populate('userId', 'name email phone')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limitNum);

      // Lọc theo search nếu có
      if (search) {
         const searchRegex = new RegExp(search, 'i');
         drivers = drivers.filter(driver =>
            driver.userId && (
               searchRegex.test(driver.userId.name) ||
               searchRegex.test(driver.userId.email) ||
               searchRegex.test(driver.userId.phone)
            )
         );
      }

      const total = await Driver.countDocuments(query);

      return res.json({
         success: true,
         data: drivers,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tài xế', error: error.message });
   }
};

// Lấy đầy đủ thông tin theo userId (user + driver + vehicles + stats)
export const getUserDetail = async (req, res) => {
   try {
      const { userId } = req.params;

      const user = await User.findById(userId).select('-passwordHash');
      if (!user) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      // Nếu người dùng là tài xế (hoặc có hồ sơ tài xế) => lấy thêm thông tin
      const driver = await Driver.findOne({ userId: user._id });
      const vehicles = driver ? await Vehicle.find({ driverId: driver._id }) : [];

      // Thống kê đơn hàng của user (với vai trò customer)
      const orderStats = await Order.aggregate([
         { $match: { customerId: user._id } },
         { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      // Thống kê liên quan đến driver (nếu có)
      let driverStats = {};
      if (driver) {
         const itemStats = await Order.aggregate([
            { $match: { 'items.driverId': driver._id } },
            { $unwind: '$items' },
            { $match: { 'items.driverId': driver._id } },
            { $group: { _id: '$items.status', count: { $sum: 1 } } }
         ]);
         driverStats = itemStats.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});
      }

      return res.json({
         success: true,
         data: {
            user,
            driver,
            vehicles,
            stats: {
               orders: orderStats.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {}),
               driver: driverStats
            }
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy thông tin người dùng', error: error.message });
   }
};

// Lấy danh sách đơn hàng
export const getOrders = async (req, res) => {
   try {
      const { status, page = 1, limit = 20, startDate, endDate } = req.query;
      const query = {};

      if (status && ['Created', 'InProgress', 'Completed', 'Cancelled'].includes(status)) {
         query.status = status;
      }

      if (startDate || endDate) {
         query.createdAt = {};
         if (startDate) query.createdAt.$gte = new Date(startDate);
         if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
         Order.find(query)
            .populate('customerId', 'name phone')
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

// Lấy báo cáo doanh thu hệ thống (tổng tiền tài xế thu nhập và 20% phí)
export const getSystemRevenueStats = async (req, res) => {
   try {
      const { period = 'month', startDate, endDate } = req.query;
      
      // Parse date range
      let start, end;
      if (startDate && endDate) {
         start = new Date(startDate);
         end = new Date(endDate);
      } else {
         // Mặc định: 6 tháng gần nhất
         end = new Date();
         start = new Date();
         start.setMonth(start.getMonth() - 6);
      }

      // Group by period
      let groupBy = {};
      let dateFormat = '%Y-%m';
      
      // Sử dụng dateToUse field (đã được addFields ở bước sau)
      if (period === 'day') {
         dateFormat = '%Y-%m-%d';
         groupBy = {
            year: { $year: '$dateToUse' },
            month: { $month: '$dateToUse' },
            day: { $dayOfMonth: '$dateToUse' }
         };
      } else if (period === 'week') {
         dateFormat = '%Y-W%V';
         groupBy = {
            year: { $year: '$dateToUse' },
            week: { $week: '$dateToUse' }
         };
      } else if (period === 'month') {
         dateFormat = '%Y-%m';
         groupBy = {
            year: { $year: '$dateToUse' },
            month: { $month: '$dateToUse' }
         };
      } else if (period === 'year') {
         dateFormat = '%Y';
         groupBy = {
            year: { $year: '$dateToUse' }
         };
      }

      // Aggregate: Tổng tiền tài xế thu nhập (amount) và phí hệ thống (fee = 20%)
      // Sử dụng transactionDate nếu có, nếu không thì dùng createdAt
      const stats = await DriverTransaction.aggregate([
         {
            $match: {
               type: 'OrderEarning',
               status: 'Completed',
               $or: [
                  { transactionDate: { $gte: start, $lte: end } },
                  { transactionDate: { $exists: false }, createdAt: { $gte: start, $lte: end } }
               ]
            }
         },
         {
            $addFields: {
               dateToUse: { $ifNull: ['$transactionDate', '$createdAt'] }
            }
         },
         {
            $group: {
               _id: groupBy,
               totalDriverRevenue: { $sum: '$amount' },  // Tổng tiền tài xế thu nhập
               totalSystemRevenue: { $sum: '$fee' },      // Doanh thu hệ thống (20% phí)
               totalDriverPayout: { $sum: '$netAmount' }, // Tiền tài xế thực nhận (80%)
               totalOrders: { $sum: 1 }
            }
         },
         { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ]);

      // Format labels
      const formattedData = stats.map(item => {
         let label = '';
         if (period === 'day') {
            label = `${item._id.day}/${item._id.month}/${item._id.year}`;
         } else if (period === 'week') {
            label = `T${item._id.week}/${item._id.year}`;
         } else if (period === 'month') {
            label = `T${item._id.month}/${item._id.year}`;
         } else if (period === 'year') {
            label = `${item._id.year}`;
         }

         return {
            label,
            period: item._id,
            totalDriverRevenue: item.totalDriverRevenue || 0,  // Tổng tiền tài xế thu nhập
            totalSystemRevenue: item.totalSystemRevenue || 0,  // Doanh thu hệ thống (20%)
            totalDriverPayout: item.totalDriverPayout || 0,    // Tiền tài xế thực nhận (80%)
            totalOrders: item.totalOrders || 0
         };
      });

      // Tính tổng
      const totals = formattedData.reduce((acc, cur) => ({
         totalDriverRevenue: acc.totalDriverRevenue + cur.totalDriverRevenue,
         totalSystemRevenue: acc.totalSystemRevenue + cur.totalSystemRevenue,
         totalDriverPayout: acc.totalDriverPayout + cur.totalDriverPayout,
         totalOrders: acc.totalOrders + cur.totalOrders
      }), { totalDriverRevenue: 0, totalSystemRevenue: 0, totalDriverPayout: 0, totalOrders: 0 });

      return res.json({
         success: true,
         data: formattedData,
         totals,
         meta: {
            period,
            startDate: start,
            endDate: end
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy thống kê doanh thu hệ thống:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy thống kê doanh thu hệ thống',
         error: error.message
      });
   }
};

// Lấy báo cáo doanh thu (giữ nguyên để tương thích)
export const getRevenueReport = async (req, res) => {
   try {
      const { period = 'monthly', year, month } = req.query;
      const currentYear = new Date().getFullYear();
      const targetYear = parseInt(year) || currentYear;

      if (period === 'monthly') {
         // Báo cáo theo tháng trong năm
         const monthlyData = await DriverTransaction.aggregate([
            {
               $match: {
                  type: 'OrderEarning',
                  createdAt: {
                     $gte: new Date(targetYear, 0, 1),
                     $lt: new Date(targetYear + 1, 0, 1)
                  }
               }
            },
            {
               $group: {
                  _id: { month: { $month: '$createdAt' } },
                  totalRevenue: { $sum: '$amount' },
                  totalFee: { $sum: '$fee' },
                  totalOrders: { $sum: 1 }
               }
            },
            { $sort: { '_id.month': 1 } }
         ]);

         // Format kết quả
         const formattedData = Array(12).fill().map((_, idx) => {
            const monthData = monthlyData.find(d => d._id.month === idx + 1);
            return {
               month: idx + 1,
               totalRevenue: monthData ? monthData.totalRevenue : 0,
               totalFee: monthData ? monthData.totalFee : 0,
               totalOrders: monthData ? monthData.totalOrders : 0
            };
         });

         return res.json({
            success: true,
            data: formattedData,
            meta: { year: targetYear, period: 'monthly' }
         });
      }
      else if (period === 'daily') {
         // Báo cáo theo ngày trong tháng
         const targetMonth = parseInt(month) || new Date().getMonth() + 1;
         const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

         const dailyData = await DriverTransaction.aggregate([
            {
               $match: {
                  type: 'OrderEarning',
                  createdAt: {
                     $gte: new Date(targetYear, targetMonth - 1, 1),
                     $lt: new Date(targetYear, targetMonth, 1)
                  }
               }
            },
            {
               $group: {
                  _id: { day: { $dayOfMonth: '$createdAt' } },
                  totalRevenue: { $sum: '$amount' },
                  totalFee: { $sum: '$fee' },
                  totalOrders: { $sum: 1 }
               }
            },
            { $sort: { '_id.day': 1 } }
         ]);

         // Format kết quả
         const formattedData = Array(daysInMonth).fill().map((_, idx) => {
            const dayData = dailyData.find(d => d._id.day === idx + 1);
            return {
               day: idx + 1,
               totalRevenue: dayData ? dayData.totalRevenue : 0,
               totalFee: dayData ? dayData.totalFee : 0,
               totalOrders: dayData ? dayData.totalOrders : 0
            };
         });

         return res.json({
            success: true,
            data: formattedData,
            meta: { year: targetYear, month: targetMonth, period: 'daily' }
         });
      }

      return res.status(400).json({ success: false, message: 'Period không hợp lệ, chỉ hỗ trợ monthly hoặc daily' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo doanh thu', error: error.message });
   }
};

// Lấy thông tin chi tiết tài xế
export const getDriverDetail = async (req, res) => {
   try {
      const { driverId } = req.params;

      const driver = await Driver.findById(driverId).populate('userId', 'name email phone address avatarUrl');

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
      }

      // Lấy thông tin xe
      const vehicles = await Vehicle.find({ driverId });

      // Lấy thống kê đơn hàng
      const orderStats = await Order.aggregate([
         { $match: { 'items.driverId': driver._id } },
         { $unwind: '$items' },
         { $match: { 'items.driverId': driver._id } },
         {
            $group: {
               _id: '$items.status',
               count: { $sum: 1 }
            }
         }
      ]);

      // Lấy thống kê thu nhập
      const transactions = await DriverTransaction.find({ driverId })
         .sort({ createdAt: -1 })
         .limit(10);

      const totalEarnings = await DriverTransaction.aggregate([
         { $match: { driverId: driver._id, type: 'OrderEarning' } },
         {
            $group: {
               _id: null,
               total: { $sum: '$netAmount' },
               totalFee: { $sum: '$fee' }
            }
         }
      ]);

      return res.json({
         success: true,
         data: {
            driver,
            vehicles,
            orderStats: orderStats.reduce((acc, curr) => {
               acc[curr._id] = curr.count;
               return acc;
            }, {}),
            transactions,
            earnings: totalEarnings.length ? {
               total: totalEarnings[0].total,
               totalFee: totalEarnings[0].totalFee
            } : { total: 0, totalFee: 0 }
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy thông tin tài xế', error: error.message });
   }
};

// Admin: Cấm tài xế
export const banDriver = async (req, res) => {
   try {
      const { driverId } = req.params;
      const { reason, duration } = req.body;

      // Tìm driver
      const driver = await Driver.findById(driverId).populate('userId', 'name email');
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
      }

      // Cập nhật trạng thái driver thành "Blocked"
      driver.status = 'Blocked';
      driver.isOnline = false;
      await driver.save();

      // Gửi email thông báo cho tài xế
      if (driver.userId && driver.userId.email) {
         const banReason = reason || 'Vi phạm quy định của hệ thống';
         const banDuration = duration || 'Vĩnh viễn';
         await sendDriverBannedEmail(
            driver.userId.email,
            driver.userId.name,
            banReason,
            banDuration
         );
         console.log(`✅ Đã gửi email cấm tài xế: ${driver.userId.email}`);
      }

      console.log(`⚠️ Admin ${req.user._id} đã cấm tài xế ${driverId}`);

      return res.json({
         success: true,
         message: 'Đã cấm tài xế thành công',
         data: driver
      });
   } catch (error) {
      console.error('❌ Lỗi cấm tài xế:', error);
      return res.status(500).json({ success: false, message: 'Lỗi cấm tài xế', error: error.message });
   }
};

// Admin: Mở cấm tài xế
export const unbanDriver = async (req, res) => {
   try {
      const { driverId } = req.params;

      // Tìm driver
      const driver = await Driver.findById(driverId).populate('userId', 'name email');
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
      }

      // Kiểm tra driver có đang bị cấm không
      if (driver.status !== 'Blocked') {
         return res.status(400).json({ success: false, message: 'Tài xế không bị cấm' });
      }

      // Cập nhật trạng thái driver thành "Active"
      driver.status = 'Active';
      await driver.save();

      console.log(`✅ Admin ${req.user._id} đã mở cấm tài xế ${driverId}`);

      return res.json({
         success: true,
         message: 'Đã mở cấm tài xế thành công',
         data: driver
      });
   } catch (error) {
      console.error('❌ Lỗi mở cấm tài xế:', error);
      return res.status(500).json({ success: false, message: 'Lỗi mở cấm tài xế', error: error.message });
   }
};

// Admin: trả tiền cho tài xế (payout/withdrawal)
export const payoutToDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { amount, description } = req.body || {};
    const payoutAmount = Math.round(Number(amount || 0));
    if (!payoutAmount || payoutAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });

    if (driver.incomeBalance < payoutAmount) {
      return res.status(400).json({ success: false, message: 'Số dư không đủ để chi trả' });
    }

    driver.incomeBalance -= payoutAmount;
    await driver.save();

    await DriverTransaction.create({
      driverId: driver._id,
      amount: payoutAmount,
      fee: 0,
      netAmount: payoutAmount,
      type: 'Withdrawal',
      status: 'Completed',
      description: description || 'Admin chi trả về tài khoản tài xế',
      paymentMethod: 'BankTransfer'
    });

    return res.json({ success: true, message: 'Đã chi trả cho tài xế', data: { balance: driver.incomeBalance } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi chi trả', error: error.message });
  }
};

// Admin: reset số dư tài xế và trừ 20%
export const resetDriverBalanceWithPenalty = async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });

    const current = driver.incomeBalance || 0;
    if (current <= 0) {
      return res.json({ success: true, message: 'Số dư đã bằng 0', data: { balance: 0 } });
    }

    const penalty = Math.round(current * 0.2);
    const remain = current - penalty;

    // Đưa số dư về 0 sau khi ghi nhận các bút toán
    driver.incomeBalance = 0;
    await driver.save();

    if (penalty > 0) {
      await DriverTransaction.create({
        driverId: driver._id,
        amount: penalty,
        fee: 0,
        netAmount: 0,
        type: 'Penalty',
        status: 'Completed',
        description: 'Phí reset số dư 20%'
      });
    }

    if (remain > 0) {
      await DriverTransaction.create({
        driverId: driver._id,
        amount: remain,
        fee: 0,
        netAmount: remain,
        type: 'Withdrawal',
        status: 'Completed',
        description: 'Reset số dư: chuyển phần còn lại cho tài xế'
      });
    }

    return res.json({ success: true, message: 'Đã reset số dư và trừ 20%', data: { penalty, paidOut: remain } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi reset số dư', error: error.message });
  }
};

// Admin: thống kê doanh thu tài xế theo ngày/tuần/tháng
export const getDriverRevenueStats = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { range = 'day', from, to } = req.query;

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const toDate = to ? new Date(to) : new Date();

    let dateFormat = '%Y-%m-%d';
    if (range === 'week') dateFormat = '%G-%V';
    if (range === 'month') dateFormat = '%Y-%m';

    const data = await DriverTransaction.aggregate([
      { $match: { driverId: driver._id, createdAt: { $gte: fromDate, $lte: toDate }, type: { $in: ['OrderEarning', 'Bonus'] } } },
      { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, totalAmount: { $sum: '$amount' }, totalNet: { $sum: '$netAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi thống kê doanh thu', error: error.message });
  }
};

// Admin: Lấy danh sách tài xế với doanh thu
export const getDriversWithRevenue = async (req, res) => {
   try {
      const { status, page = 1, limit = 20, search, sortBy = 'revenue', sortOrder = 'desc' } = req.query;
      const query = {};

      if (status && ['Pending', 'Active', 'Rejected', 'Blocked'].includes(status)) {
         query.status = status;
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      // Lấy danh sách drivers
      let drivers = await Driver.find(query)
         .populate('userId', 'name email phone avatarUrl')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limitNum);

      // Lọc theo search nếu có
      if (search) {
         const searchRegex = new RegExp(search, 'i');
         drivers = drivers.filter(driver =>
            driver.userId && (
               searchRegex.test(driver.userId.name) ||
               searchRegex.test(driver.userId.email) ||
               searchRegex.test(driver.userId.phone)
            )
         );
      }

      // Tính doanh thu cho từng driver
      const driversWithRevenue = await Promise.all(
         drivers.map(async (driver) => {
            // Tính tổng doanh thu từ transactions
            const revenueStats = await DriverTransaction.aggregate([
               {
                  $match: {
                     driverId: driver._id,
                     type: 'OrderEarning',
                     status: 'Completed'
                  }
               },
               {
                  $group: {
                     _id: null,
                     totalRevenue: { $sum: '$amount' },      // Tổng tiền tài xế thu nhập
                     totalSystemFee: { $sum: '$fee' },      // Doanh thu hệ thống (20%)
                     totalDriverPayout: { $sum: '$netAmount' }, // Tiền tài xế thực nhận (80%)
                     totalOrders: { $sum: 1 }
                  }
               }
            ]);

            const stats = revenueStats[0] || {
               totalRevenue: 0,
               totalSystemFee: 0,
               totalDriverPayout: 0,
               totalOrders: 0
            };

            return {
               _id: driver._id,
               userId: driver.userId,
               name: driver.userId?.name || 'N/A',
               email: driver.userId?.email || 'N/A',
               phone: driver.userId?.phone || 'N/A',
               avatarUrl: driver.userId?.avatarUrl,
               status: driver.status,
               rating: driver.rating,
               totalTrips: driver.totalTrips,
               incomeBalance: driver.incomeBalance || 0,
               isOnline: driver.isOnline,
               // Doanh thu
               totalRevenue: stats.totalRevenue,
               totalSystemFee: stats.totalSystemFee,
               totalDriverPayout: stats.totalDriverPayout,
               totalOrders: stats.totalOrders
            };
         })
      );

      // Sắp xếp theo sortBy
      // Map sortBy từ frontend sang field name thực tế
      const sortFieldMap = {
         'revenue': 'totalRevenue',
         'payout': 'totalDriverPayout',
         'fee': 'totalSystemFee',
         'orders': 'totalOrders',
         'balance': 'incomeBalance'
      };
      const actualSortField = sortFieldMap[sortBy] || sortBy || 'totalRevenue';
      
      driversWithRevenue.sort((a, b) => {
         const aValue = a[actualSortField] || 0;
         const bValue = b[actualSortField] || 0;
         return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      const total = await Driver.countDocuments(query);

      return res.json({
         success: true,
         data: driversWithRevenue,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      console.error('❌ Lỗi lấy danh sách tài xế với doanh thu:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy danh sách tài xế với doanh thu',
         error: error.message
      });
   }
};