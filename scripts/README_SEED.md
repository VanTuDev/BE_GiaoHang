# 🌱 Hướng Dẫn Seed Data

Script seed data để tạo dữ liệu mẫu cho hệ thống Giao Hàng Đà Nẵng.

## 📋 Yêu Cầu

1. Đã cấu hình MongoDB trong `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/giaohang
   ```

2. MongoDB đã được cài đặt và chạy

## 🚀 Cách Sử Dụng

### Chạy seed data:

```bash
npm run seed
```

Hoặc:

```bash
node scripts/seedData.js
```

## 📊 Dữ Liệu Sẽ Được Tạo

### 1. Users (7 users)
- **1 Admin**: `admin@giaohang.com` / `admin123`
- **3 Drivers**: 
  - `driver1@giaohang.com` / `driver123`
  - `driver2@giaohang.com` / `driver123`
  - `driver3@giaohang.com` / `driver123`
- **3 Customers**:
  - `customer1@test.com` / `customer123`
  - `customer2@test.com` / `customer123`
  - `customer3@test.com` / `customer123`

### 2. Drivers (3 drivers)
- Tất cả đều có status `Active`
- Driver đầu tiên sẽ có `is_online = true`
- Có thông tin ngân hàng (Vietcombank)
- Có service areas (quận/huyện hoạt động)

### 3. Vehicles (3 vehicles)
- Mỗi driver có 1 vehicle
- Các loại: TruckSmall, TruckMedium, TruckLarge, TruckBox, PickupTruck
- Có `pricePerKm` tương ứng với từng loại xe

### 4. Orders (20 orders)
- 5 orders: Status `Created` (chưa có driver nhận)
- 10 orders: Status `InProgress` (đang xử lý)
- 5 orders: Status `Completed` (đã hoàn thành)
- Mỗi order có 1-2 items
- Có địa chỉ pickup và dropoff ở Đà Nẵng

### 5. Driver Transactions
- Tạo transactions cho các orders đã `Completed`
- Logic: 
  - `amount` = tổng giá trị đơn hàng
  - `fee` = 20% (doanh thu hệ thống)
  - `netAmount` = 80% (tiền tài xế thực nhận)

### 6. Feedbacks (10 feedbacks)
- Đánh giá cho các orders đã hoàn thành
- Rating: 4-5 sao
- Status: `Approved`

## ⚠️ Lưu ý

1. **Script sẽ bỏ qua nếu dữ liệu đã tồn tại** (dựa trên email/phone cho users, userId cho drivers)
2. **Nếu chạy lại**, script sẽ tìm và sử dụng các records đã tồn tại
3. **Đảm bảo MongoDB đã chạy** và kết nối được trước khi chạy seed

## 🔧 Troubleshooting

### Lỗi: "MongoDB URI không được định nghĩa"
- **Giải pháp**: Kiểm tra file `.env` có `MONGODB_URI` chưa

### Lỗi: "MongoServerError: E11000 duplicate key error"
- **Giải pháp**: Script sẽ tự động bỏ qua và sử dụng record đã tồn tại

### Lỗi: "MongooseError: Operation `users.findOne()` buffering timed out"
- **Giải pháp**: Kiểm tra MongoDB đã chạy chưa và URI có đúng không

## 📝 Thông Tin Đăng Nhập Sau Khi Seed

```
Admin: admin@giaohang.com / admin123
Driver: driver1@giaohang.com / driver123
Customer: customer1@test.com / customer123
```

## 🎯 Mục Đích

Script này giúp:
- ✅ Có dữ liệu mẫu để test các tính năng
- ✅ Không cần tạo dữ liệu thủ công
- ✅ Đảm bảo logic doanh thu (20% phí hệ thống) hoạt động đúng
- ✅ Có đủ dữ liệu để test dashboard admin (doanh thu, thống kê)

