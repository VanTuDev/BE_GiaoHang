import Driver from '../models/driver.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import Order from '../models/order.model.js';

/**
 * TÀI XẾ: LẤY THỐNG KÊ DOANH THU CỦA MÌNH
 * Endpoint: GET /api/driver/revenue/stats
 */
export const getDriverRevenueStats = async (req, res) => {
   try {
      const { startDate, endDate, granularity = 'month' } = req.query;

      // Tìm driver từ user đang đăng nhập
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      // Parse date range
      const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // Đầu năm
      const end = endDate ? new Date(endDate) : new Date(); // Hôm nay

      // Query match
      const matchQuery = {
         driverId: driver._id,
         type: 'OrderEarning',
         status: 'Completed',
         transactionDate: { $gte: start, $lte: end }
      };

      // Group by granularity
      let groupBy = {};
      let sortBy = {};

      switch (granularity) {
         case 'day':
            groupBy = {
               year: { $year: '$transactionDate' },
               month: { $month: '$transactionDate' },
               day: { $dayOfMonth: '$transactionDate' }
            };
            sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
            break;

         case 'week':
            groupBy = {
               year: { $year: '$transactionDate' },
               week: { $week: '$transactionDate' }
            };
            sortBy = { '_id.year': 1, '_id.week': 1 };
            break;

         case 'quarter':
            groupBy = {
               year: { $year: '$transactionDate' },
               quarter: {
                  $ceil: { $divide: [{ $month: '$transactionDate' }, 3] }
               }
            };
            sortBy = { '_id.year': 1, '_id.quarter': 1 };
            break;

         case 'year':
            groupBy = {
               year: { $year: '$transactionDate' }
            };
            sortBy = { '_id.year': 1 };
            break;

         case 'month':
         default:
            groupBy = {
               year: { $year: '$transactionDate' },
               month: { $month: '$transactionDate' }
            };
            sortBy = { '_id.year': 1, '_id.month': 1 };
            break;
      }

      // Aggregate transactions
      const data = await DriverTransaction.aggregate([
         { $match: matchQuery },
         {
            $group: {
               _id: groupBy,
               orders: { $sum: 1 },
               revenue: { $sum: '$amount' },       // Tổng doanh thu
               fee: { $sum: '$fee' },              // Tổng phí hoa hồng (20%)
               payout: { $sum: '$netAmount' }      // Thực nhận (80%)
            }
         },
         { $sort: sortBy }
      ]);

      // Aggregate distance from orders
      const ordersWithDistance = await Order.aggregate([
         { $match: { 'items.driverId': driver._id } },
         { $unwind: '$items' },
         {
            $match: {
               'items.driverId': driver._id,
               'items.status': 'Delivered',
               'items.deliveredAt': { $gte: start, $lte: end }
            }
         },
         {
            $group: {
               _id: {
                  year: { $year: '$items.deliveredAt' },
                  month: { $month: '$items.deliveredAt' }
               },
               distanceKm: { $sum: '$items.distanceKm' }
            }
         }
      ]);

      // Merge distance vào data
      const result = data.map(item => {
         const distanceData = ordersWithDistance.find(d => {
            if (granularity === 'day') {
               return d._id.year === item._id.year &&
                  d._id.month === item._id.month;
            } else if (granularity === 'month' || granularity === 'week') {
               return d._id.year === item._id.year &&
                  d._id.month === item._id.month;
            } else if (granularity === 'year') {
               return d._id.year === item._id.year;
            }
            return false;
         });

         // Format label
         let label = '';
         if (granularity === 'day') {
            label = `${item._id.day}/${item._id.month}/${item._id.year}`;
         } else if (granularity === 'week') {
            label = `T${item._id.week}/${item._id.year}`;
         } else if (granularity === 'month') {
            label = `Th${item._id.month}/${item._id.year}`;
         } else if (granularity === 'quarter') {
            label = `Q${item._id.quarter}/${item._id.year}`;
         } else if (granularity === 'year') {
            label = `${item._id.year}`;
         }

         return {
            label,
            period: item._id,
            orders: item.orders,
            distanceKm: distanceData?.distanceKm || 0,
            revenue: item.revenue,
            fee: item.fee,
            payout: item.payout
         };
      });

      // Tính tổng
      const totals = result.reduce((acc, cur) => ({
         orders: acc.orders + cur.orders,
         distanceKm: acc.distanceKm + cur.distanceKm,
         revenue: acc.revenue + cur.revenue,
         fee: acc.fee + cur.fee,
         payout: acc.payout + cur.payout
      }), { orders: 0, distanceKm: 0, revenue: 0, fee: 0, payout: 0 });

      return res.json({
         success: true,
         data: result,
         totals,
         meta: {
            driverId: driver._id,
            startDate: start,
            endDate: end,
            granularity
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy thống kê doanh thu:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy thống kê doanh thu',
         error: error.message
      });
   }
};

/**
 * TÀI XẾ: LẤY DANH SÁCH GIAO DỊCH
 * Endpoint: GET /api/driver/revenue/transactions
 */
export const getDriverTransactions = async (req, res) => {
   try {
      const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;

      // Tìm driver
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      // Build query
      const query = { driverId: driver._id };
      if (type) query.type = type;
      if (status) query.status = status;
      if (startDate || endDate) {
         query.transactionDate = {};
         if (startDate) query.transactionDate.$gte = new Date(startDate);
         if (endDate) query.transactionDate.$lte = new Date(endDate);
      }

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const [transactions, total] = await Promise.all([
         DriverTransaction.find(query)
            .populate('orderId', 'pickupAddress dropoffAddress totalPrice')
            .sort({ transactionDate: -1 })
            .skip(skip)
            .limit(limitNum),
         DriverTransaction.countDocuments(query)
      ]);

      return res.json({
         success: true,
         data: transactions,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy danh sách giao dịch:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy danh sách giao dịch',
         error: error.message
      });
   }
};

/**
 * TÀI XẾ: LẤY TỔNG QUAN DOANH THU
 * Endpoint: GET /api/driver/revenue/overview
 */
export const getDriverRevenueOverview = async (req, res) => {
   try {
      // Tìm driver
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const [
         totalStats,
         monthlyStats,
         yearlyStats,
         recentTransactions
      ] = await Promise.all([
         // Tổng tất cả thời gian
         DriverTransaction.aggregate([
            { $match: { driverId: driver._id, type: 'OrderEarning', status: 'Completed' } },
            {
               $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalRevenue: { $sum: '$amount' },
                  totalFee: { $sum: '$fee' },
                  totalPayout: { $sum: '$netAmount' }
               }
            }
         ]),
         // Tháng này
         DriverTransaction.aggregate([
            {
               $match: {
                  driverId: driver._id,
                  type: 'OrderEarning',
                  status: 'Completed',
                  transactionDate: { $gte: startOfMonth }
               }
            },
            {
               $group: {
                  _id: null,
                  monthlyOrders: { $sum: 1 },
                  monthlyRevenue: { $sum: '$amount' },
                  monthlyPayout: { $sum: '$netAmount' }
               }
            }
         ]),
         // Năm nay
         DriverTransaction.aggregate([
            {
               $match: {
                  driverId: driver._id,
                  type: 'OrderEarning',
                  status: 'Completed',
                  transactionDate: { $gte: startOfYear }
               }
            },
            {
               $group: {
                  _id: null,
                  yearlyOrders: { $sum: 1 },
                  yearlyRevenue: { $sum: '$amount' },
                  yearlyPayout: { $sum: '$netAmount' }
               }
            }
         ]),
         // 5 giao dịch gần nhất
         DriverTransaction.find({
            driverId: driver._id,
            type: 'OrderEarning'
         })
            .populate('orderId', 'pickupAddress dropoffAddress')
            .sort({ transactionDate: -1 })
            .limit(5)
      ]);

      return res.json({
         success: true,
         data: {
            total: totalStats[0] || { totalOrders: 0, totalRevenue: 0, totalFee: 0, totalPayout: 0 },
            monthly: monthlyStats[0] || { monthlyOrders: 0, monthlyRevenue: 0, monthlyPayout: 0 },
            yearly: yearlyStats[0] || { yearlyOrders: 0, yearlyRevenue: 0, yearlyPayout: 0 },
            recentTransactions,
            balance: driver.incomeBalance || 0
         }
      });

   } catch (error) {
      console.error('❌ Lỗi lấy tổng quan doanh thu:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi lấy tổng quan doanh thu',
         error: error.message
      });
   }
};

