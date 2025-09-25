# Hướng dẫn Test API bằng Postman

## Cài đặt và chuẩn bị

1. Tải và cài đặt [Postman](https://www.postman.com/downloads/)
2. Import file `postman_collection.json` trong thư mục `docs`
3. Tạo Environment trong Postman với các biến:
   - `baseUrl`: URL của server (mặc định: http://localhost:5000)
   - `token`: Để lưu token sau khi đăng nhập

## Luồng test API chính

### 1. Đăng ký và Đăng nhập

#### 1.1. Đăng ký tài khoản

**Request:**
```
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0901234567",
  "password": "password123"
}
```

#### 1.2. Đăng nhập

**Request:**
```
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "phone": "0901234567",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "phone": "0901234567",
      "role": "Customer"
    },
    "accessToken": "..."
  }
}
```

> Lưu `accessToken` vào biến môi trường `token` trong Postman

### 2. Xem danh sách xe và loại xe

#### 2.1. Lấy danh sách loại xe

**Request:**
```
GET {{baseUrl}}/api/vehicles/types
```

#### 2.2. Lấy danh sách xe (có thể lọc)

**Request:**
```
GET {{baseUrl}}/api/vehicles?type=TruckSmall&weightKg=800&onlineOnly=true
```

### 3. Tạo đơn hàng (Customer)

**Request:**
```
POST {{baseUrl}}/api/orders
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "pickupAddress": "123 Nguyễn Văn Linh, Đà Nẵng",
  "dropoffAddress": "456 Trần Phú, Đà Nẵng",
  "customerNote": "Giao hàng trong giờ hành chính",
  "paymentMethod": "Cash",
  "items": [
    {
      "vehicleType": "TruckSmall",
      "weightKg": 800,
      "distanceKm": 10,
      "loadingService": true,
      "insurance": true,
      "itemPhotos": []
    },
    {
      "vehicleType": "TruckMedium",
      "weightKg": 2000,
      "distanceKm": 10,
      "loadingService": false,
      "insurance": false
    }
  ]
}
```

### 4. Xem danh sách đơn hàng (Customer)

**Request:**
```
GET {{baseUrl}}/api/orders/my-orders
Authorization: Bearer {{token}}
```

### 5. Đăng ký làm tài xế

#### 5.1. Upload hồ sơ tài xế

**Request:**
```
POST {{baseUrl}}/api/driver/apply
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

licenseFront: [file]
licenseBack: [file]
idFront: [file]
idBack: [file]
portrait: [file]
vehiclePhotos: [file1, file2]
vehicleDocs: [file1, file2]
```

#### 5.2. Xem trạng thái hồ sơ

**Request:**
```
GET {{baseUrl}}/api/driver/my-application
Authorization: Bearer {{token}}
```

### 6. Admin duyệt hồ sơ tài xế

> Cần đăng nhập với tài khoản Admin

**Request:**
```
PUT {{baseUrl}}/api/driver/admin/applications/:applicationId/review
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "action": "approve",
  "adminNote": "Hồ sơ đầy đủ, đã xác minh"
}
```

### 7. Tài xế thêm xe

**Request:**
```
POST {{baseUrl}}/api/vehicles
Authorization: Bearer {{driverToken}}
Content-Type: multipart/form-data

type: TruckSmall
licensePlate: 43A-12345
maxWeightKg: 1000
description: Xe tải nhỏ chở hàng nhẹ
features: Bảo vệ hàng hóa
features: Đúng giờ
photo: [file]
```

### 8. Tài xế bật trạng thái online

**Request:**
```
PUT {{baseUrl}}/api/orders/driver/online
Authorization: Bearer {{driverToken}}
Content-Type: application/json

{
  "online": true
}
```

### 9. Tài xế xem đơn hàng có sẵn

**Request:**
```
GET {{baseUrl}}/api/orders/driver/available
Authorization: Bearer {{driverToken}}
```

### 10. Tài xế nhận đơn

**Request:**
```
PUT {{baseUrl}}/api/orders/:orderId/items/:itemId/accept
Authorization: Bearer {{driverToken}}
```

### 11. Tài xế cập nhật trạng thái đơn

**Request:**
```
PUT {{baseUrl}}/api/orders/:orderId/items/:itemId/status
Authorization: Bearer {{driverToken}}
Content-Type: application/json

{
  "status": "PickedUp"
}
```

> Các trạng thái: "PickedUp", "Delivering", "Delivered", "Cancelled"

### 12. Admin xem thống kê

**Request:**
```
GET {{baseUrl}}/api/admin/dashboard
Authorization: Bearer {{adminToken}}
```

### 13. Admin xem báo cáo doanh thu

**Request:**
```
GET {{baseUrl}}/api/admin/revenue?period=monthly&year=2023
Authorization: Bearer {{adminToken}}
```

## Lưu ý quan trọng

1. **Authentication**: Tất cả các API (trừ đăng ký, đăng nhập và một số API public) đều yêu cầu token trong header:
   ```
   Authorization: Bearer {{token}}
   ```

2. **Phân quyền**:
   - Customer: Có thể tạo đơn, xem đơn của mình
   - Driver: Có thể nhận đơn, cập nhật trạng thái đơn
   - Admin: Có thể xem tất cả và duyệt hồ sơ tài xế

3. **Upload file**: Sử dụng `multipart/form-data` cho các API upload file

4. **Phân trang**: Hầu hết các API danh sách đều hỗ trợ phân trang với các tham số:
   - `page`: Số trang (bắt đầu từ 1)
   - `limit`: Số lượng item mỗi trang

5. **Lọc**: Nhiều API hỗ trợ lọc theo các tiêu chí khác nhau, xem tài liệu API để biết chi tiết
