# 🚀 Hướng dẫn Deploy Backend lên Render

## 📋 Yêu cầu

- MongoDB database (MongoDB Atlas hoặc Render MongoDB)
- Tài khoản Render
- GitHub/GitLab repository

## 🔧 Các bước deploy

### 1. Chuẩn bị MongoDB

Tạo MongoDB database và lấy connection string:
```
mongodb+srv://user:password@cluster.mongodb.net/giaohang
```

### 2. Tạo Web Service trên Render

1. Đăng nhập [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect repository và chọn `BE_GiaoHangDaNang`

### 3. Cấu hình

- **Name**: `giao-hang-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free hoặc Starter

### 4. Environment Variables

Thêm các biến sau trong Render Dashboard:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
CLIENT_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
VNP_TMN_CODE=your_tmn_code
VNP_HASH_SECRET=your_hash_secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=https://your-frontend.vercel.app/vnpay-return
VNP_IPN_URL=https://your-backend.onrender.com/api/vnpay/ipn
```

### 5. Deploy

Click **"Create Web Service"** và đợi deploy hoàn tất.

### ⚠️ Lưu ý

- Render free tier sẽ sleep sau 15 phút không có traffic
- Dùng UptimeRobot để ping `/healthz` mỗi 5 phút để tránh sleep
- Hoặc upgrade lên Starter plan ($7/tháng)

## ✅ Kiểm tra

```bash
curl https://your-backend.onrender.com/healthz
# Kết quả: {"ok":true,"uptime":123.456}
```

