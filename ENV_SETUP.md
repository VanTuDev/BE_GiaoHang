# 🔧 Hướng dẫn cấu hình biến môi trường Backend

## 📋 Tạo file `.env`

Tạo file `.env` trong thư mục `BE_GiaoHangDaNang` với nội dung:

```env
# Server Port
PORT=8080

# MongoDB Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Secrets (tối thiểu 32 ký tự)
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_min_32_chars

# Client URL (Frontend URL)
# Development: http://localhost:3000
# Production: https://your-app.vercel.app
CLIENT_URL=http://localhost:3000

# CORS Origins (nhiều URL cách nhau bằng dấu phẩy)
# Development: http://localhost:3000
# Production: https://your-app.vercel.app,https://your-app-git-main.vercel.app
CORS_ORIGINS=http://localhost:3000

# Email Configuration
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Cloudinary Configuration (nếu dùng)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gemini AI API Key (nếu dùng)
GEMINI_API_KEY=your_gemini_api_key

# Supabase (nếu dùng, hiện tại đang dùng MongoDB)
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_key
```

## 🚀 Cấu hình cho Render/Railway

Khi deploy backend lên Render hoặc Railway, thêm các biến môi trường:

### Render Dashboard:
1. Vào **Environment** tab
2. Thêm các biến môi trường

### Railway Dashboard:
1. Vào **Variables** tab
2. Thêm các biến môi trường

## 📝 Biến môi trường quan trọng

| Variable | Mô tả | Bắt buộc |
|----------|-------|----------|
| `PORT` | Port server (mặc định: 8080) | Không |
| `MONGODB_URI` | MongoDB connection string | **Có** |
| `JWT_SECRET` | Secret key cho JWT (tối thiểu 32 ký tự) | **Có** |
| `CLIENT_URL` | URL frontend để cấu hình CORS | **Có** |
| `EMAIL` | Email để gửi OTP | **Có** |
| `EMAIL_PASSWORD` | App password của email | **Có** |

## ✅ Kiểm tra

Sau khi cấu hình:
1. Chạy `npm run dev` để khởi động server
2. Kiểm tra console log có hiển thị port đúng không
3. Test API endpoint: `http://localhost:8080/healthz`
4. Kiểm tra MongoDB connection

