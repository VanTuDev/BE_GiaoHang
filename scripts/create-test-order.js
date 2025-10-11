import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import config from '../config/config.js';

const createTestOrder = async () => {
   try {
      await mongoose.connect(config.mongoURI);
      console.log('✅ Kết nối database thành công\n');

      // 1. Tìm customer (dùng customer cũ hoặc tạo mới)
      const customerId = '68ccd5aa941d2aa3bf605103';  // Customer từ đơn cũ

      // 2. Tạo đơn hàng MỚI
      const newOrder = new Order({
         customerId: customerId,
         pickupAddress: "123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
         pickupLocation: {
            type: 'Point',
            coordinates: [108.2022, 16.0544]  // Đà Nẵng
         },
         dropoffAddress: "456 Hoàng Văn Thụ, Thanh Khê, Đà Nẵng",
         dropoffLocation: {
            type: 'Point',
            coordinates: [108.1979, 16.0753]
         },
         items: [
            {
               vehicleType: "TruckSmall",
               weightKg: 300,
               distanceKm: 5,
               loadingService: true,
               insurance: false,
               priceBreakdown: {
                  basePerKm: 15000,
                  distanceCost: 75000,
                  loadCost: 50000,
                  insuranceFee: 0,
                  total: 125000
               },
               status: 'Created',  // ← QUAN TRỌNG: Created, chưa có driver
               driverId: null      // ← QUAN TRỌNG: null
            }
         ],
         totalPrice: 125000,
         paymentStatus: 'Pending',
         paymentMethod: 'Cash',
         customerNote: 'Đơn test - vui lòng xử lý cẩn thận',
         status: 'Created'  // ← QUAN TRỌNG: Created
      });

      await newOrder.save();

      console.log('🎉 TẠO ĐƠN HÀNG MỚI THÀNH CÔNG!');
      console.log('Order ID:', newOrder._id);
      console.log('Order Status:', newOrder.status);
      console.log('Items:');
      newOrder.items.forEach((item, i) => {
         console.log(`  Item ${i}:`);
         console.log('    _id:', item._id);
         console.log('    status:', item.status);
         console.log('    driverId:', item.driverId);  // ← Phải là null
         console.log('    vehicleType:', item.vehicleType);
         console.log('    total:', item.priceBreakdown.total);
      });

      console.log('\n📝 HƯỚNG DẪN TEST:');
      console.log('1. Đăng nhập tài xế (userId có driver._id = 68cd06add0996c87da56b55e)');
      console.log('2. Vào tab "Đơn có sẵn" - PHẢI THẤY ĐƠN NÀY');
      console.log('3. Nhấn "Nhận đơn"');
      console.log('4. Kiểm tra tab "Đơn đã nhận" - PHẢI THẤY ĐƠN');
      console.log('5. Cập nhật trạng thái "Đã lấy hàng" -> "Đơn đang giao"');
      console.log('6. Cập nhật "Đã giao hàng" -> "Đã hoàn thành"');

      console.log('\n✅ COPY LỆNH NÀY ĐỂ KIỂM TRA:');
      console.log(`node -e "import('mongoose').then(async (m) => { await m.default.connect('mongodb://localhost:27017/giaohang'); const Order = (await import('./models/order.model.js')).default; const o = await Order.findById('${newOrder._id}'); console.log('Status:', o.status); console.log('Item driverId:', o.items[0].driverId); console.log('Item status:', o.items[0].status); process.exit(0); })"`);

   } catch (error) {
      console.error('❌ Lỗi:', error);
   } finally {
      await mongoose.disconnect();
   }
};

createTestOrder();

