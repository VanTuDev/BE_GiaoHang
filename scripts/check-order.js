import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import config from '../config/config.js';

const checkOrder = async () => {
   try {
      await mongoose.connect(config.mongoURI);
      console.log('✅ Kết nối database thành công\n');

      // 1. Kiểm tra đơn hàng cụ thể
      console.log('=== KIỂM TRA ĐƠN HÀNG 68e619bcff8b0dbaa6aabfa9 ===');
      const order = await Order.findById('68e619bcff8b0dbaa6aabfa9');

      if (order) {
         console.log('Order ID:', order._id);
         console.log('Order Status:', order.status);
         console.log('Customer ID:', order.customerId);
         console.log('\nItems:');
         order.items.forEach((item, i) => {
            console.log(`\n  Item ${i}:`);
            console.log('    _id:', item._id);
            console.log('    status:', item.status);
            console.log('    driverId:', item.driverId);  // ← KEY!
            console.log('    vehicleType:', item.vehicleType);
            console.log('    acceptedAt:', item.acceptedAt);
         });
      } else {
         console.log('❌ Không tìm thấy đơn hàng');
      }

      // 2. Kiểm tra tài xế hiện tại
      console.log('\n\n=== KIỂM TRA TÀI XẾ 68cd06add0996c87da56b55e ===');
      const driver = await Driver.findById('68cd06add0996c87da56b55e').populate('userId');

      if (driver) {
         console.log('Driver ID:', driver._id);
         console.log('User ID:', driver.userId?._id);
         console.log('User Name:', driver.userId?.name);
         console.log('Vehicle Type:', driver.vehicleType);
      } else {
         console.log('❌ Không tìm thấy tài xế');
      }

      // 3. Tìm tất cả đơn có items với driverId của tài xế này
      console.log('\n\n=== TÌM ĐƠN HÀNG CÓ DRIVER ID = 68cd06add0996c87da56b55e ===');
      const ordersWithDriver = await Order.find({
         'items.driverId': new mongoose.Types.ObjectId('68cd06add0996c87da56b55e')
      });

      console.log(`Số lượng đơn tìm thấy: ${ordersWithDriver.length}`);

      ordersWithDriver.forEach((o, i) => {
         console.log(`\nĐơn ${i + 1}:`);
         console.log('  Order ID:', o._id);
         console.log('  Order Status:', o.status);
         o.items.forEach((item, j) => {
            if (String(item.driverId) === '68cd06add0996c87da56b55e') {
               console.log(`  Item ${j}:`, {
                  _id: item._id,
                  status: item.status,
                  driverId: item.driverId
               });
            }
         });
      });

      // 4. Tìm đơn có items Accepted nhưng không có driverId
      console.log('\n\n=== TÌM ĐƠN CÓ ITEMS ACCEPTED NHƯNG NULL DRIVER ID ===');
      const brokenOrders = await Order.find({
         'items.status': 'Accepted',
         'items.driverId': null
      });

      console.log(`Số lượng đơn lỗi: ${brokenOrders.length}`);

      brokenOrders.forEach((o, i) => {
         console.log(`\nĐơn lỗi ${i + 1}:`);
         console.log('  Order ID:', o._id);
         console.log('  Order Status:', o.status);
         o.items.forEach((item, j) => {
            console.log(`  Item ${j}:`, {
               _id: item._id,
               status: item.status,
               driverId: item.driverId  // ← Sẽ là null
            });
         });
      });

      console.log('\n\n✅ Hoàn thành kiểm tra!');

   } catch (error) {
      console.error('❌ Lỗi:', error);
   } finally {
      await mongoose.disconnect();
   }
};

checkOrder();

