import http from 'http';
import connectDB from './config/db.js';
import config from './config/config.js';
import app from './app.js';
import { Server as SocketIOServer } from 'socket.io';

// Validate các biến môi trường quan trọng trước khi khởi động
if (!config.jwtSecret) {
   console.error('❌ LỖI: JWT_SECRET chưa được cấu hình trong biến môi trường!');
   console.error('   Vui lòng thêm JWT_SECRET vào file .env');
   process.exit(1);
}

if (!config.mongoURI) {
   console.error('❌ LỖI: MONGODB_URI chưa được cấu hình trong biến môi trường!');
   console.error('   Vui lòng thêm MONGODB_URI vào file .env');
   process.exit(1);
}

// Kết nối database
connectDB();

const server = http.createServer(app);

// Socket.IO
export const io = new SocketIOServer(server, {
   cors: { origin: config.clientURL || 'http://localhost:3000' }
});

io.on('connection', (socket) => {
   // Driver join để nhận đơn có sẵn
   socket.on('driver:join', (driverId) => {
      socket.join('drivers');
   });

   socket.on('disconnect', () => {
      // noop
   });
});

// Khởi động server
// Lưu ý: 404 handler đã được xử lý trong app.js
const PORT = config.port || 8080;
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
