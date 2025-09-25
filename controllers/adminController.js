import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import Order from '../models/order.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';

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

// Lấy báo cáo doanh thu
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