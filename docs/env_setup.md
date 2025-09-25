# Cấu hình môi trường

Để cấu hình môi trường cho ứng dụng, bạn cần tạo file `.env` trong thư mục gốc của dự án backend. Dưới đây là các biến môi trường cần thiết:

## Biến môi trường cơ bản

```
# Server
PORT=5000
PORT_DEV=5000
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/giaohangdanang

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL=your_email@example.com
EMAIL_PASSWORD=your_email_password

# OTP
OTP_EXPIRY=10
```

## Cấu hình Cloudinary

Để sử dụng tính năng upload ảnh, bạn cần thêm các biến môi trường sau vào file `.env`:

```
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Hoặc bạn có thể sử dụng CLOUDINARY_URL:

```
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
```

## Cách lấy thông tin Cloudinary

1. Đăng ký tài khoản tại [Cloudinary](https://cloudinary.com/users/register/free)
2. Sau khi đăng nhập, vào Dashboard để lấy thông tin Cloud Name, API Key và API Secret
3. Thông tin này sẽ được hiển thị trong phần "Account Details"

## Cấu hình upload preset (nếu cần)

Nếu bạn muốn sử dụng unsigned upload, bạn cần tạo một upload preset:

1. Vào Settings > Upload > Upload presets
2. Nhấn "Add upload preset"
3. Đặt Signing Mode là "Unsigned"
4. Cấu hình các tùy chọn khác theo nhu cầu
5. Lưu preset và sử dụng tên preset trong ứng dụng
