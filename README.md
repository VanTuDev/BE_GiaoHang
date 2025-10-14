# SPA Backend API

Backend API cho ứng dụng SPA xây dựng bằng Node.js, Express, MongoDB và Socket.IO.

## Cài đặt

1. Clone repository
2. Cài đặt dependencies
```bash
npm install
```
3. Tạo file `.env` từ file `.env.example`
```bash
cp .env.example .env
```
4. Điền các thông tin môi trường vào file `.env`
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/spa_database
JWT_SECRET=your_jwt_secret_key
```
5. Khởi động server
```bash
# Chế độ development
npm run dev

# Chế độ production
npm start
```

## API Endpoints

### Xác thực
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại

### Người dùng
- `GET /api/users` - Lấy danh sách người dùng (admin only)
- `POST /api/users` - Tạo người dùng mới (admin only)
- `GET /api/users/:id` - Lấy thông tin người dùng theo ID
- `PUT /api/users/:id` - Cập nhật thông tin người dùng
- `DELETE /api/users/:id` - Xóa người dùng (admin only)

### Tin nhắn
- `POST /api/messages` - Gửi tin nhắn mới
- `GET /api/messages/:userId` - Lấy lịch sử tin nhắn với người dùng
- `GET /api/messages/unread` - Lấy tin nhắn chưa đọc
- `PUT /api/messages/:messageId/read` - Đánh dấu tin nhắn đã đọc

### Thông báo
- `GET /api/notifications` - Lấy danh sách thông báo của người dùng
- `POST /api/notifications` - Tạo thông báo mới
- `PUT /api/notifications/:id` - Đánh dấu thông báo đã đọc
- `PUT /api/notifications/read-all` - Đánh dấu tất cả thông báo đã đọc
- `DELETE /api/notifications/:id` - Xóa thông báo

## Socket.IO Events

### Sự kiện từ client đến server
- `login` - Đăng nhập vào socket với userId
- `sendMessage` - Gửi tin nhắn mới
- `typing` - Thông báo đang nhập
- `stopTyping` - Thông báo ngừng nhập
- `join` - Tham gia vào một phòng

### Sự kiện từ server đến client
- `newMessage` - Nhận tin nhắn mới
- `messageSent` - Xác nhận tin nhắn đã được gửi
- `userTyping` - Thông báo người dùng đang nhập
- `userStopTyping` - Thông báo người dùng ngừng nhập
- `newNotification` - Thông báo mới
- `userStatus` - Cập nhật trạng thái người dùng (online/offline)

## Cấu trúc dự án

```
├── config/         # Cấu hình ứng dụng và database
├── controllers/    # Xử lý logic từ request
├── middleware/     # Middleware ứng dụng
├── models/         # Schema và model cho MongoDB
├── routes/         # Định nghĩa routes
├── service/        # Xử lý business logic
├── socket/         # Xử lý Socket.IO
├── .env            # Biến môi trường
├── .env.example    # Ví dụ biến môi trường
├── index.js        # Entry point
└── package.json    # Thông tin dependencies
``` 