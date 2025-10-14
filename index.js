import http from 'http';
import connectDB from './config/db.js';
import config from './config/config.js';
import app from './app.js';

// Kết nối database
connectDB();

const server = http.createServer(app);

// Xử lý lỗi 404
app.use((req, res) => {
   res.status(404).json({
      success: false,
      error: 'Không tìm thấy endpoint này'
   });
});

// Khởi động server
const PORT = config.port || 5000;
server.listen(PORT, () => {
   console.log(`✅ Server đang chạy ở cổng ${PORT}`);
   console.log("Thông tin cấu hình từ config:");
   console.log("PORT:", config.port);
   console.log("MONGODB_URI:", config.mongoURI);
   console.log("JWT_SECRET:", config.jwtSecret);
   console.log("EMAIL:", config.email.user);
}).on('error', (e) => {
   if (e.code === 'EADDRINUSE') {
      console.log(`⚠️ Cổng ${PORT} đã được sử dụng, thử với cổng ${PORT + 1}`);
      server.listen(PORT + 1, () => {
         console.log(`✅ Server đang chạy ở cổng ${PORT + 1}`);
      });
   } else {
      console.error(`❌ Lỗi khởi động server: ${e.message}`);
   }
});

// Xử lý lỗi không mong muốn
process.on('unhandledRejection', (err) => {
   console.log(`❌ Lỗi: ${err.message}`);
   server.close(() => process.exit(1));
});
