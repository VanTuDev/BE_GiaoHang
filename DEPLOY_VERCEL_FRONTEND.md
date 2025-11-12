# 🔧 Cấu hình Backend cho Frontend trên Vercel

## 📋 Cập nhật CORS

Khi frontend được deploy lên Vercel, backend cần cho phép CORS từ domain Vercel.

### Cách 1: Sử dụng biến môi trường `CORS_ORIGINS`

Thêm vào file `.env` của backend:

```env
# URL của frontend trên Vercel (thêm nhiều URL cách nhau bằng dấu phẩy)
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app

# Hoặc nếu dùng CLIENT_URL
CLIENT_URL=https://your-app.vercel.app
```

### Cách 2: Cập nhật trực tiếp trong `config/cors.js`

Nếu cần, có thể thêm trực tiếp vào `allowedOrigins`:

```javascript
const allowedOrigins = Array.from(new Set([
   config.clientURL,
   'https://your-app.vercel.app',
   'https://your-app-git-main.vercel.app',
   ...envOrigins
]));
```

## 🔌 Cấu hình Socket.IO CORS

File `index.js` đã có cấu hình CORS cho Socket.IO:

```javascript
export const io = new SocketIOServer(server, {
   cors: { origin: config.clientURL || 'http://localhost:3000' }
});
```

Đảm bảo `CLIENT_URL` trong `.env` trỏ đến domain Vercel:

```env
CLIENT_URL=https://your-app.vercel.app
```

## ✅ Kiểm tra

1. Deploy backend lên Render/Railway
2. Lấy URL backend (ví dụ: `https://your-backend.onrender.com`)
3. Cập nhật CORS để cho phép domain Vercel
4. Test API từ frontend Vercel
5. Test Socket.IO connection

## 📝 Lưu ý

- CORS phải được cấu hình đúng trước khi deploy frontend
- Nếu có nhiều preview URLs trên Vercel, thêm tất cả vào `CORS_ORIGINS`
- Socket.IO cũng cần CORS configuration

