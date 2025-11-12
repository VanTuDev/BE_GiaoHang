/**
 * SCRIPT SỬA DỮ LIỆU: Cập nhật trạng thái đơn hàng
 * 
 * Vấn đề: Một số đơn hàng có items đã được tài xế nhận (status = Accepted)
 * nhưng order.status vẫn là "Created" thay vì "InProgress"
 * 
 * Script này sẽ:
 * 1. Tìm tất cả orders có items.status khác "Created" nhưng order.status = "Created"
 * 2. Cập nhật order.status thành "InProgress"
 */

import mongoose from 'mongoose';
import Order from '../models/order.model.js';
import dotenv from 'dotenv';

dotenv.config();

const fixOrderStatus = async () => {
   try {
      // Kết nối database
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/giaohang');
      console.log('✅ Kết nối database thành công');

      // Tìm các orders có vấn đề
      const problematicOrders = await Order.find({
         status: 'Created',
         'items.status': { $in: ['Accepted', 'PickedUp', 'Delivering'] }
      });

      console.log(`📋 Tìm thấy ${problematicOrders.length} đơn hàng cần sửa`);

      // Cập nhật từng đơn
      for (const order of problematicOrders) {
         const hasActiveItems = order.items.some(item =>
            ['Accepted', 'PickedUp', 'Delivering'].includes(item.status)
         );

         if (hasActiveItems) {
            order.status = 'InProgress';
            await order.save();
            console.log(`✅ Cập nhật đơn ${order._id}: Created -> InProgress`);
         }
      }

      console.log('🎉 Hoàn thành sửa dữ liệu!');
      process.exit(0);
   } catch (error) {
      console.error('❌ Lỗi:', error);
      process.exit(1);
   }
};

fixOrderStatus();

