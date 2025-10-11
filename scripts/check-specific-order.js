import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import config from '../config/config.js';

const checkOrder = async () => {
   try {
      await mongoose.connect(config.mongoURI);

      const order = await Order.findById('68e62e7dbf83e745ebeedc1b');

      console.log('=== ĐƠN HÀNG 68e62e7dbf83e745ebeedc1b ===');
      console.log('Order Status:', order.status);
      console.log('\nItems:');
      order.items.forEach((item, i) => {
         console.log(`Item ${i}:`);
         console.log('  _id:', item._id);
         console.log('  status:', item.status);
         console.log('  driverId:', item.driverId);
         console.log('  vehicleType:', item.vehicleType);
      });

   } catch (error) {
      console.error('Error:', error);
   } finally {
      await mongoose.disconnect();
   }
};

checkOrder();

