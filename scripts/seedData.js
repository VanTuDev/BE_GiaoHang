import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import config from '../config/config.js';
import connectDB from '../config/db.js';

// Import models
import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';
import Order from '../models/order.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import Feedback from '../models/feedback.model.js';

/**
 * Script seed data cho MongoDB
 * Chạy: npm run seed
 */

const ADMIN_PASSWORD = 'admin123';
const DRIVER_PASSWORD = 'driver123';
const CUSTOMER_PASSWORD = 'customer123';

// Hash password helper
const hashPassword = async (password) => {
   return await bcrypt.hash(password, 10);
};

// Seed Users
const seedUsers = async () => {
   console.log('🌱 Đang seed Users...');

   const users = [
      // Admin
      {
         name: 'Admin Hệ Thống',
         email: 'admin@giaohang.com',
         phone: '0901234567',
         passwordHash: await hashPassword(ADMIN_PASSWORD),
         role: 'Admin',
         isEmailVerified: true,
         address: 'Đà Nẵng'
      },
      // Drivers
      {
         name: 'Nguyễn Văn Tài',
         email: 'driver1@giaohang.com',
         phone: '0901111111',
         passwordHash: await hashPassword(DRIVER_PASSWORD),
         role: 'Driver',
         isEmailVerified: true,
         address: 'Quận Hải Châu, Đà Nẵng'
      },
      {
         name: 'Trần Văn Hùng',
         email: 'driver2@giaohang.com',
         phone: '0902222222',
         passwordHash: await hashPassword(DRIVER_PASSWORD),
         role: 'Driver',
         isEmailVerified: true,
         address: 'Quận Thanh Khê, Đà Nẵng'
      },
      {
         name: 'Lê Văn Đức',
         email: 'driver3@giaohang.com',
         phone: '0903333333',
         passwordHash: await hashPassword(DRIVER_PASSWORD),
         role: 'Driver',
         isEmailVerified: true,
         address: 'Quận Sơn Trà, Đà Nẵng'
      },
      // Customers
      {
         name: 'Khách Hàng 1',
         email: 'customer1@test.com',
         phone: '0904444444',
         passwordHash: await hashPassword(CUSTOMER_PASSWORD),
         role: 'Customer',
         isEmailVerified: true,
         address: 'Đà Nẵng'
      },
      {
         name: 'Khách Hàng 2',
         email: 'customer2@test.com',
         phone: '0905555555',
         passwordHash: await hashPassword(CUSTOMER_PASSWORD),
         role: 'Customer',
         isEmailVerified: true,
         address: 'Đà Nẵng'
      },
      {
         name: 'Khách Hàng 3',
         email: 'customer3@test.com',
         phone: '0906666666',
         passwordHash: await hashPassword(CUSTOMER_PASSWORD),
         role: 'Customer',
         isEmailVerified: true,
         address: 'Đà Nẵng'
      }
   ];

   const insertedUsers = [];
   for (const userData of users) {
      try {
         // Kiểm tra xem user đã tồn tại chưa
         const existing = await User.findOne({
            $or: [{ email: userData.email }, { phone: userData.phone }]
         });

         if (existing) {
            console.log(`⚠️ User ${userData.email} đã tồn tại, bỏ qua...`);
            insertedUsers.push(existing);
         } else {
            const user = await User.create(userData);
            insertedUsers.push(user);
            console.log(`✅ Đã tạo user: ${user.name} (${user.email})`);
         }
      } catch (error) {
         console.error(`❌ Lỗi tạo user ${userData.email}:`, error.message);
      }
   }

   return insertedUsers;
};

// Seed Drivers
const seedDrivers = async (users) => {
   console.log('🌱 Đang seed Drivers...');

   const driverUsers = users.filter(u => u.role === 'Driver');
   const insertedDrivers = [];

   for (let i = 0; i < driverUsers.length; i++) {
      const user = driverUsers[i];
      const serviceAreas = [
         ['Hải Châu', 'Thanh Khê', 'Sơn Trà'],
         ['Thanh Khê', 'Liên Chiểu'],
         ['Sơn Trà', 'Ngũ Hành Sơn']
      ];

      try {
         const existing = await Driver.findOne({ userId: user._id });

         if (existing) {
            console.log(`⚠️ Driver cho user ${user.email} đã tồn tại, bỏ qua...`);
            insertedDrivers.push(existing);
         } else {
            const driverData = {
               userId: user._id,
               status: 'Active',
               isOnline: i === 0, // Driver đầu tiên online
               rating: 4.5 + Math.random() * 0.5,
               totalTrips: Math.floor(Math.random() * 50) + 10,
               incomeBalance: Math.floor(Math.random() * 5000000) + 1000000,
               serviceAreas: serviceAreas[i] || ['Hải Châu'],
               bankAccountName: user.name,
               bankAccountNumber: `123456789${i}`,
               bankName: 'Vietcombank',
               bankCode: 'VCB'
            };

            const driver = await Driver.create(driverData);
            insertedDrivers.push(driver);
            console.log(`✅ Đã tạo driver: ${user.name}`);
         }
      } catch (error) {
         console.error(`❌ Lỗi tạo driver cho ${user.email}:`, error.message);
      }
   }

   return insertedDrivers;
};

// Seed Vehicles
const seedVehicles = async (drivers) => {
   console.log('🌱 Đang seed Vehicles...');

   const vehicleTypes = ['TruckSmall', 'TruckMedium', 'TruckLarge', 'TruckBox', 'PickupTruck'];
   const insertedVehicles = [];

   for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      const vehicleType = vehicleTypes[i % vehicleTypes.length];
      const maxWeights = { TruckSmall: 1000, TruckMedium: 3000, TruckLarge: 10000, TruckBox: 5000, PickupTruck: 800 };
      const pricePerKms = { TruckSmall: 40000, TruckMedium: 60000, TruckLarge: 100000, TruckBox: 80000, PickupTruck: 40000 };

      try {
         const existing = await Vehicle.findOne({ driverId: driver._id });

         if (existing) {
            console.log(`⚠️ Vehicle cho driver ${driver._id} đã tồn tại, bỏ qua...`);
            insertedVehicles.push(existing);
         } else {
            const vehicleData = {
               driverId: driver._id,
               type: vehicleType,
               licensePlate: `51A-${String(10000 + i).slice(-4)}`,
               maxWeightKg: maxWeights[vehicleType] || 1000,
               pricePerKm: pricePerKms[vehicleType] || 40000,
               status: 'Active',
               description: `Xe ${vehicleType} phục vụ vận chuyển hàng hóa`
            };

            const vehicle = await Vehicle.create(vehicleData);
            insertedVehicles.push(vehicle);
            console.log(`✅ Đã tạo vehicle: ${vehicleData.licensePlate} (${vehicleType})`);
         }
      } catch (error) {
         console.error(`❌ Lỗi tạo vehicle:`, error.message);
      }
   }

   return insertedVehicles;
};

// Seed Orders và Order Items
const seedOrders = async (users, drivers) => {
   console.log('🌱 Đang seed Orders...');

   const customers = users.filter(u => u.role === 'Customer');
   const activeDrivers = drivers.filter(d => d.status === 'Active');
   const insertedOrders = [];

   // Tạo 20 đơn hàng mẫu
   for (let i = 0; i < 20; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const driver = i < 15 ? activeDrivers[Math.floor(Math.random() * activeDrivers.length)] : null; // 15 đơn có driver, 5 đơn chưa có

      const statuses = ['Created', 'InProgress', 'Completed'];
      const orderStatus = i < 5 ? 'Created' : (i < 15 ? 'InProgress' : 'Completed');

      const pickupAddresses = [
         '208 Mai Đăng Chơn, Hải Châu, Đà Nẵng',
         '900 Ngô Quyền, Thanh Khê, Đà Nẵng',
         '123 Lê Duẩn, Hải Châu, Đà Nẵng',
         '456 Trần Phú, Sơn Trà, Đà Nẵng'
      ];
      const dropoffAddresses = [
         '789 Hoàng Diệu, Hải Châu, Đà Nẵng',
         '321 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng',
         '654 Lý Thái Tổ, Sơn Trà, Đà Nẵng'
      ];

      try {
         const numItems = Math.floor(Math.random() * 2) + 1; // 1-2 items
         const items = [];
         let totalPrice = 0;

         for (let j = 0; j < numItems; j++) {
            const vehicleTypes = ['TruckSmall', 'TruckMedium', 'TruckLarge'];
            const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
            const weightKg = vehicleType === 'TruckSmall' ? 500 : (vehicleType === 'TruckMedium' ? 2000 : 5000);
            const distanceKm = Math.floor(Math.random() * 50) + 10;
            const pricePerKm = vehicleType === 'TruckSmall' ? 40000 : (vehicleType === 'TruckMedium' ? 60000 : 100000);
            const loadingService = Math.random() > 0.5;
            const insurance = Math.random() > 0.7;

            const distanceCost = distanceKm * pricePerKm;
            const loadCost = loadingService ? 50000 : 0;
            const insuranceFee = insurance ? 100000 : 0;
            const itemTotal = distanceCost + loadCost + insuranceFee;

            const itemStatus = orderStatus === 'Created' ? 'Created' :
               (orderStatus === 'InProgress' ? (j === 0 ? 'Delivering' : 'Accepted') : 'Delivered');

            const item = {
               vehicleType: vehicleType,
               weightKg: weightKg,
               distanceKm: distanceKm,
               loadingService: loadingService,
               insurance: insurance,
               priceBreakdown: {
                  basePerKm: pricePerKm,
                  distanceCost: distanceCost,
                  loadCost: loadCost,
                  insuranceFee: insuranceFee,
                  total: itemTotal
               },
               status: itemStatus,
               driverId: driver ? driver._id : null,
               acceptedAt: driver && itemStatus !== 'Created' ? new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000) : null,
               pickedUpAt: driver && ['Delivering', 'Delivered'].includes(itemStatus) ? new Date(Date.now() - Math.random() * 5 * 24 * 3600 * 1000) : null,
               deliveredAt: driver && itemStatus === 'Delivered' ? new Date(Date.now() - Math.random() * 3 * 24 * 3600 * 1000) : null
            };

            items.push(item);
            totalPrice += itemTotal;
         }

         const orderData = {
            customerId: customer._id,
            pickupAddress: pickupAddresses[Math.floor(Math.random() * pickupAddresses.length)],
            dropoffAddress: dropoffAddresses[Math.floor(Math.random() * dropoffAddresses.length)],
            pickupLocation: {
               type: 'Point',
               coordinates: [108.2200 + Math.random() * 0.1, 16.0544 + Math.random() * 0.1]
            },
            dropoffLocation: {
               type: 'Point',
               coordinates: [108.2200 + Math.random() * 0.1, 16.0544 + Math.random() * 0.1]
            },
            items: items,
            totalPrice: totalPrice,
            paymentStatus: orderStatus === 'Completed' ? 'Paid' : 'Pending',
            paymentMethod: 'Cash',
            status: orderStatus,
            customerNote: `Đơn hàng mẫu ${i + 1}`
         };

         const order = await Order.create(orderData);
         insertedOrders.push(order);
         console.log(`✅ Đã tạo order ${i + 1}: ${order.pickupAddress} -> ${order.dropoffAddress} (${totalPrice.toLocaleString('vi-VN')} VND)`);
      } catch (error) {
         console.error(`❌ Lỗi tạo order ${i + 1}:`, error.message);
      }
   }

   return insertedOrders;
};

// Seed Driver Transactions (với logic 20% phí hệ thống)
// Tạo nhiều transactions với các ngày tháng khác nhau để có dữ liệu thống kê
const seedDriverTransactions = async (drivers, orders) => {
   console.log('🌱 Đang seed Driver Transactions...');

   const completedOrders = orders.filter(o => o.status === 'Completed');
   const insertedTransactions = [];

   // Tạo transactions từ completed orders
   for (const order of completedOrders) {
      const deliveredItems = order.items.filter(item => item.status === 'Delivered' && item.driverId);

      for (const item of deliveredItems) {
         const driver = drivers.find(d => d._id.toString() === item.driverId.toString());
         if (!driver) continue;

         const amount = item.priceBreakdown?.total || 0;
         const fee = Math.round(amount * 0.2); // 20% phí hệ thống
         const netAmount = amount - fee; // 80% tài xế nhận

         const transactionData = {
            driverId: driver._id,
            orderId: order._id,
            orderItemId: item._id,
            amount: amount,
            fee: fee,
            netAmount: netAmount,
            type: 'OrderEarning',
            status: 'Completed',
            description: `Thu nhập từ đơn hàng #${order._id}`,
            transactionDate: item.deliveredAt || new Date()
         };

         try {
            const transaction = await DriverTransaction.create(transactionData);
            insertedTransactions.push(transaction);
         } catch (error) {
            console.error(`❌ Lỗi tạo transaction:`, error.message);
         }
      }
   }

   // Tạo thêm mock transactions cho 6 tháng gần nhất để có dữ liệu thống kê phong phú
   console.log('📊 Đang tạo thêm mock transactions cho thống kê...');
   const now = new Date();
   const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

   // Tạo khoảng 80 transactions bổ sung
   for (let i = 0; i < 80; i++) {
      const driver = drivers[Math.floor(Math.random() * drivers.length)];

      // Random date trong 6 tháng gần nhất
      const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
      const transactionDate = new Date(randomTime);

      // Random amount từ 200,000 đến 5,000,000 VND
      const amount = Math.floor(Math.random() * 4800000) + 200000;
      const fee = Math.round(amount * 0.2); // 20% phí hệ thống
      const netAmount = amount - fee; // 80% tài xế nhận

      const transactionData = {
         driverId: driver._id,
         amount: amount,
         fee: fee,
         netAmount: netAmount,
         type: 'OrderEarning',
         status: 'Completed',
         description: `Thu nhập từ đơn hàng mock #${i + 1}`,
         transactionDate: transactionDate
      };

      try {
         const transaction = await DriverTransaction.create(transactionData);
         insertedTransactions.push(transaction);
      } catch (error) {
         // Bỏ qua lỗi duplicate hoặc lỗi khác
      }
   }

   // Cập nhật incomeBalance cho drivers dựa trên transactions
   console.log('💰 Đang cập nhật incomeBalance cho drivers...');
   for (const driver of drivers) {
      const driverTransactions = insertedTransactions.filter(t =>
         t.driverId.toString() === driver._id.toString()
      );

      const totalNetAmount = driverTransactions.reduce((sum, t) => sum + (t.netAmount || 0), 0);

      await Driver.findByIdAndUpdate(driver._id, {
         incomeBalance: totalNetAmount,
         balance: totalNetAmount
      });
   }

   console.log(`✅ Đã tạo ${insertedTransactions.length} transactions`);
   return insertedTransactions;
};

// Seed Feedbacks
const seedFeedbacks = async (users, drivers, orders) => {
   console.log('🌱 Đang seed Feedbacks...');

   const customers = users.filter(u => u.role === 'Customer');
   const completedOrders = orders.filter(o => o.status === 'Completed');
   const insertedFeedbacks = [];

   for (let i = 0; i < Math.min(10, completedOrders.length); i++) {
      const order = completedOrders[i];
      const customer = customers[Math.floor(Math.random() * customers.length)];

      const deliveredItems = order.items.filter(item => item.status === 'Delivered' && item.driverId);
      if (deliveredItems.length === 0) continue;

      const item = deliveredItems[0];
      const driver = drivers.find(d => d._id.toString() === item.driverId.toString());
      if (!driver) continue;

      const feedbackData = {
         orderId: order._id,
         orderItemId: item._id,
         customerId: customer._id,
         driverId: driver._id,
         overallRating: Math.floor(Math.random() * 2) + 4, // 4-5 sao
         serviceRating: Math.floor(Math.random() * 2) + 4,
         driverRating: Math.floor(Math.random() * 2) + 4,
         vehicleRating: Math.floor(Math.random() * 2) + 4,
         punctualityRating: Math.floor(Math.random() * 2) + 4,
         comment: `Dịch vụ tốt, giao hàng nhanh chóng. Đánh giá mẫu ${i + 1}`,
         isAnonymous: false,
         status: 'Approved'
      };

      try {
         const feedback = await Feedback.create(feedbackData);
         insertedFeedbacks.push(feedback);
         console.log(`✅ Đã tạo feedback ${i + 1}`);
      } catch (error) {
         console.error(`❌ Lỗi tạo feedback:`, error.message);
      }
   }

   return insertedFeedbacks;
};

// Main seed function
const seed = async () => {
   console.log('🚀 Bắt đầu seed data...\n');

   try {
      // Kết nối MongoDB
      await connectDB();

      // 1. Seed Users
      const users = await seedUsers();
      console.log(`\n✅ Đã seed ${users.length} users\n`);

      // 2. Seed Drivers
      const drivers = await seedDrivers(users);
      console.log(`\n✅ Đã seed ${drivers.length} drivers\n`);

      // 3. Seed Vehicles
      const vehicles = await seedVehicles(drivers);
      console.log(`\n✅ Đã seed ${vehicles.length} vehicles\n`);

      // 4. Seed Orders
      const orders = await seedOrders(users, drivers);
      console.log(`\n✅ Đã seed ${orders.length} orders\n`);

      // 5. Seed Driver Transactions
      const transactions = await seedDriverTransactions(drivers, orders);
      console.log(`\n✅ Đã seed ${transactions.length} transactions\n`);

      // 6. Seed Feedbacks
      const feedbacks = await seedFeedbacks(users, drivers, orders);
      console.log(`\n✅ Đã seed ${feedbacks.length} feedbacks\n`);

      console.log('🎉 Seed data hoàn tất!');
      console.log('\n📝 Thông tin đăng nhập:');
      console.log('Admin: admin@giaohang.com / admin123');
      console.log('Driver: driver1@giaohang.com / driver123');
      console.log('Customer: customer1@test.com / customer123');

      // Đóng kết nối
      await mongoose.connection.close();
      console.log('\n✅ Đã đóng kết nối MongoDB');
      process.exit(0);

   } catch (error) {
      console.error('❌ Lỗi khi seed data:', error);
      await mongoose.connection.close();
      process.exit(1);
   }
};

// Chạy seed
seed();
