import mongoose from 'mongoose';
import config from './config.js';

const connectDB = async () => {
   try {
      const mongoURI = config.mongoURI;
      if (!mongoURI) {
         throw new Error('MongoDB URI không được định nghĩa');
      }

      console.log('Đang kết nối đến MongoDB...');
      const conn = await mongoose.connect(mongoURI, {
         // Các tuỳ chọn có thể bổ sung nếu cần
      });
      console.log(`MongoDB đã kết nối: ${conn.connection.host}`);
   } catch (error) {
      console.error(`Lỗi kết nối MongoDB: ${error.message}`);
      process.exit(1);
   }
};

export default connectDB;