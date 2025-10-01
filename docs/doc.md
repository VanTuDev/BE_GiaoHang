## Tài liệu REST API – Quick Delivery (BE_GiaoHangDaNang)

- baseUrl: `http://localhost:8080/api`
- Xác thực: Header `Authorization: Bearer <accessToken>` với API yêu cầu đăng nhập
- Roles: `Customer`, `Driver`, `Admin`
- Content-Type chung:
  - `application/json` cho JSON
  - `multipart/form-data` cho upload file (key: `file` hoặc theo mô tả từng API)

Lưu ý phản hồi thống nhất:
- Thành công: `{ success: true, data?, message?, meta? }`
- Lỗi thường gặp: 400/401/403/404/500 theo định dạng `{ success: false, message: string, error? }`

---

## 1) Authentication

### UC: Đăng ký tài khoản
- Endpoint: `POST /auth/register`
- Headers: `Content-Type: application/json`
- Request (JSON):
```json
{
  "name": "Nguyen Van A",
  "phone": "0900000001",
  "password": "secret123",
  "role": "Customer",
  "email": "a@example.com"
}
```
- Response (201):
```json
{ "success": true, "message": "Đăng ký thành công. Vui lòng xác thực email nếu đã cung cấp email." }
```
- Mục đích chức năng: Tạo tài khoản người dùng mới.

### UC: Xác thực email (OTP)
- Endpoint: `POST /auth/verify-email`
- Headers: `Content-Type: application/json`
- Request:
```json
{ "email": "a@example.com", "code": "123456" }
```
- Response (200):
```json
{ "success": true, "message": "Xác thực email thành công" }
```
- Mục đích chức năng: Xác nhận email hợp lệ, kích hoạt tính năng cần xác thực.

### UC: Đăng nhập
- Endpoint: `POST /auth/login`
- Headers: `Content-Type: application/json`
- Request (một trong hai):
```json
{ "phone": "0900000001", "password": "secret123" }
```
```json
{ "email": "a@example.com", "password": "secret123" }
```
- Response (200):
```json
{
  "success": true,
  "data": {
    "user": { "id": "66f...", "name": "Nguyen Van A", "email": "a@example.com", "phone": "0900000001", "role": "Customer" },
    "accessToken": "eyJ..."
  }
}
```
- Mục đích chức năng: Cấp access token để gọi API bảo vệ.

---

## Mẫu Request/Response chi tiết theo UC

### UC 1: Đăng ký tài khoản
- POST: `http://localhost:8080/api/auth/register`
- Headers: `Content-Type: application/json`
- Request body
```json
{
  "name": "Nguyễn Văn Tú",
  "email": "vantu.dev@gmail.com",
  "phone": "0901234567",
  "password": "password123"
}
```
- Response (201)
```json
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng xác thực email nếu đã cung cấp email."
}
```
- Mục đích chức năng: Tạo tài khoản mới cho người dùng.

### UC 2: Đăng nhập tài khoản
- POST: `http://localhost:8080/api/auth/login`
- Headers: `Content-Type: application/json`
- Request body (1 trong 2)
```json
{
  "phone": "0901234567",
  "password": "password123"
}
```
hoặc
```json
{
  "email": "nguyenvana@example.com",
  "password": "password123"
}
```
- Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66f...",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "phone": "0901234567",
      "role": "Customer"
    },
    "accessToken": "eyJ..."
  }
}
```
- Mục đích chức năng: Xác thực và cấp token truy cập.

### UC 3: Xác thực email OTP
- POST: `http://localhost:8080/api/auth/verify-email`
- Headers: `Content-Type: application/json`
- Request body
```json
{
  "email": "nguyenvana@example.com",
  "code": "123456"
}
```
- Response (200)
```json
{
  "success": true,
  "message": "Xác thực email thành công"
}
```
- Mục đích chức năng: Kích hoạt email cho tài khoản.

### UC 4: Lấy thông tin người dùng hiện tại
- GET: `http://localhost:8080/api/auth/me`
- Headers: `Authorization: Bearer <token>`
- Request: (none)
- Response (200)
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0901234567",
    "role": "Customer",
    "address": "Đà Nẵng",
    "avatarUrl": "https://..."
  }
}
```
- Mục đích chức năng: Lấy profile nhanh từ token.

### UC 5: Quên mật khẩu
- POST: `http://localhost:8080/api/auth/forgot-password`
- Headers: `Content-Type: application/json`
- Request body
```json
{ "email": "nguyenvana@example.com" }
```
- Response (200)
```json
{ "success": true, "message": "Đã gửi mã xác nhận" }
```
- Mục đích: Gửi mã đặt lại mật khẩu qua email.

### UC 6: Đặt lại mật khẩu
- POST: `http://localhost:8080/api/auth/reset-password`
- Headers: `Content-Type: application/json`
- Request body
```json
{ "email": "nguyenvana@example.com", "code": "123456", "newPassword": "newSecret" }
```
- Response (200)
```json
{ "success": true, "message": "Đặt lại mật khẩu thành công" }
```
- Mục đích: Đổi mật khẩu bằng mã xác thực.

### UC: Lấy thông tin người dùng hiện tại
- Endpoint: `GET /auth/me`
- Headers: `Authorization: Bearer <token>`
- Request: (none)
- Response (200):
```json
{ "success": true, "data": { "_id": "...", "name": "...", "email": "...", "phone": "...", "role": "Customer", "address": "Đà Nẵng", "avatarUrl": "..." } }
```
- Mục đích chức năng: Tra cứu nhanh hồ sơ user từ token.

### UC: Quên/Đặt lại mật khẩu
- Endpoint: `POST /auth/forgot-password`
- Headers: `Content-Type: application/json`
- Request:
```json
{ "email": "a@example.com" }
```
- Response (200): `{ "success": true, "message": "Đã gửi mã xác nhận" }`
- Mục đích: Gửi OTP đặt lại mật khẩu.

- Endpoint: `POST /auth/reset-password`
- Headers: `Content-Type: application/json`
- Request:
```json
{ "email": "a@example.com", "code": "123456", "newPassword": "newSecret" }
```
- Response (200): `{ "success": true, "message": "Đặt lại mật khẩu thành công" }`
- Mục đích: Đổi mật khẩu bằng mã xác nhận.

---

## 2) Profile (User/Driver)

### UC: Lấy thông tin cá nhân (User)
- Endpoint: `GET /profile/me`
- Headers: `Authorization`
- Request: (none)
- Response (200): `{ "success": true, "data": User }`
- Mục đích: Xem thông tin user hiện tại.

### UC: Cập nhật thông tin cá nhân (User)
- Endpoint: `PUT /profile/me`
- Headers: `Authorization`, `Content-Type: application/json`
- Request:
```json
{ "name": "New Name", "address": "Đà Nẵng" }
```
- Response (200): `{ "success": true, "data": User }`
- Mục đích: Cập nhật thông tin cơ bản của user.

### UC: Upload avatar người dùng
- Endpoint: `POST /profile/me/avatar`
- Headers: `Authorization`
- Request (multipart/form-data): `file: <File>`
- Response (200): `{ "success": true, "data": User }`
- Mục đích: Cập nhật ảnh đại diện user qua upload server → Cloudinary.

### UC: Xem hồ sơ tài xế
- Endpoint: `GET /profile/driver/me`
- Headers: `Authorization (Driver|Admin)`
- Request: (none)
- Response (200): `{ "success": true, "data": Driver(populate user/vehicle) }`
- Mục đích: Xem trạng thái hồ sơ tài xế của tài khoản.

### UC: Cập nhật hồ sơ tài xế
- Endpoint: `PUT /profile/driver/me`
- Headers: `Authorization (Driver|Admin)`, `Content-Type: application/json`
- Request ví dụ:
```json
{ "status": "Active" }
```
- Response (200): `{ "success": true, "data": Driver }`
- Mục đích: Cập nhật trạng thái hoặc thông tin hồ sơ tài xế.

### UC: Upload avatar tài xế
- Endpoint: `POST /profile/driver/me/avatar`
- Headers: `Authorization (Driver|Admin)`
- Request (multipart/form-data): `file: <File>`
- Response (200): `{ "success": true, "data": Driver }`
- Mục đích: Cập nhật ảnh đại diện hồ sơ tài xế.

### UC: Cập nhật khu vực hoạt động & trạng thái online
- Endpoint: `PUT /profile/driver/me/areas`
- Headers: `Authorization (Driver|Admin)`, `Content-Type: application/json`
- Request:
```json
{ "serviceAreas": ["Quận Hải Châu", "Quận Thanh Khê"], "isOnline": true }
```
- Response (200): `{ "success": true, "data": Driver }`
- Mục đích: Chọn quận/huyện hoạt động và bật/tắt online.

---

## 3) Upload Ảnh (Cloudinary qua Backend)

### UC: Upload một ảnh
- Endpoint: `POST /upload/image`
- Headers: `Authorization`, `Content-Type: multipart/form-data`
- Request (form-data):
- `file`: File ảnh
- `folder` (text, optional) – ví dụ: `vehicles`
- Response (200):
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/<cloud>/image/upload/v.../vehicles/abcdef.jpg",
    "publicId": "vehicles/abcdef",
    "width": 800,
    "height": 600,
    "format": "jpg",
    "resourceType": "image"
  }
}
```
- Mục đích: Chuẩn hoá upload ảnh an toàn qua server (không lộ API key).

### UC: Upload nhiều ảnh
- Endpoint: `POST /upload/images`
- Headers: `Authorization`, `Content-Type: multipart/form-data`
- Request (form-data):
- `files`: nhiều File ảnh
- `folder` (text, optional)
- Response (200): `{ "success": true, "data": [ { url, publicId, ... }, ... ] }`
- Mục đích: Tải nhiều ảnh một lần (ví dụ ảnh đơn hàng, hồ sơ).

---

## 4) Vehicles (Công khai + Driver)

### UC: Lấy danh sách loại xe (cards)
- Endpoint: `GET /vehicles/types`
- Headers: (none)
- Request: (none)
- Response (200) ví dụ:
```json
{
  "success": true,
  "data": [
    { "type": "TruckSmall", "label": "Xe tải nhỏ", "maxWeightKg": 1000, "pricePerKm": 40000, "sampleImage": "/imgs/small-truck.jpg" },
    { "type": "TruckMedium", "label": "Xe tải vừa", "maxWeightKg": 3000, "pricePerKm": 60000, "sampleImage": "/imgs/medium-truck.png" }
  ]
}
```
- Mục đích: FE hiển thị danh sách loại xe, trọng tải, ảnh mẫu, giá/km.

### UC: Tìm kiếm danh sách xe (lọc)
- Endpoint: `GET /vehicles`
- Headers: (none)
- Query hỗ trợ: `type`, `weightKg`, `district`, `onlineOnly`, `page`, `limit`
- Response (200) ví dụ:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "type": "TruckSmall",
      "licensePlate": "43A-123.45",
      "maxWeightKg": 1000,
      "photoUrl": "https://...",
      "driverId": { "status": "Active", "isOnline": true, "serviceAreas": ["Quận Hải Châu"] }
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 5, "totalPages": 1 }
}
```
- Mục đích: Cho khách hàng lọc xe theo nhu cầu và khu vực.

### UC (Driver): Thêm xe mới
- Endpoint: `POST /vehicles`
- Headers: `Authorization (Driver)`
- Request: Hai cách
  1) `multipart/form-data`: các field văn bản + `photo` (File)
  2) `application/json`: gửi `photoUrl` (đã upload trước via `/upload/image`)
- Field gợi ý: `type`, `licensePlate`, `maxWeightKg`, `description`, `features[]`, `photo|photoUrl`
- Response (201): `{ "success": true, "data": Vehicle }`
- Mục đích: Tài xế khai báo xe để nhận đơn.

### UC (Driver): Cập nhật xe
- Endpoint: `PUT /vehicles/:vehicleId`
- Headers: `Authorization (Driver)`
- Request: giống thêm mới (có thể chỉ gửi phần cần cập nhật)
- Response (200): `{ "success": true, "data": Vehicle }`
- Mục đích: Cập nhật biển số, trạng thái, ảnh xe…

### UC (Driver): Xoá xe
- Endpoint: `DELETE /vehicles/:vehicleId`
- Headers: `Authorization (Driver)`
- Request: (none)
- Response (200): `{ "success": true, "message": "Đã xoá xe thành công" }`
- Mục đích: Gỡ xe khỏi danh sách xe của tài xế.

### UC (Driver): Xem xe của tôi
- Endpoint: `GET /vehicles/my-vehicles`
- Headers: `Authorization (Driver)`
- Request: (none)
- Response (200): `{ "success": true, "data": Vehicle[] }`
- Mục đích: Tài xế quản lý danh sách xe đã khai báo.

---

## 5) Orders (Đơn hàng nhiều mục)

### UC (Customer): Tạo đơn hàng
- Endpoint: `POST /orders`
- Headers: `Authorization (Customer)`, `Content-Type: application/json`
- Request ví dụ:
```json
{
  "pickupAddress": "Số 1, Hải Châu",
  "dropoffAddress": "Số 2, Liên Chiểu",
  "customerNote": "Giao giờ hành chính",
  "paymentMethod": "Cash",
  "items": [
    { "vehicleType": "TruckSmall", "weightKg": 800, "distanceKm": 12.5, "loadingService": true, "insurance": true },
    { "vehicleType": "TruckMedium", "weightKg": 2500, "distanceKm": 7.2, "loadingService": false, "insurance": false }
  ]
}
```
- Response (201) rút gọn:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "items": [
      {
        "_id": "...",
        "vehicleType": "TruckSmall",
        "weightKg": 800,
        "distanceKm": 12.5,
        "loadingService": true,
        "insurance": true,
        "priceBreakdown": { "basePerKm": 40000, "distanceCost": 500000, "loadCost": 50000, "insuranceFee": 100000, "total": 650000 },
        "status": "Created"
      }
    ],
    "totalPrice": 1234000
  }
}
```
- Mục đích: Khách hàng đặt đơn gồm nhiều mục, tính phí theo xe/trọng lượng/khoảng cách, phụ phí.

### UC (Customer): Xem đơn hàng của tôi
- Endpoint: `GET /orders/my-orders`
- Headers: `Authorization (Customer)`
- Query: `status?`, `page?`, `limit?`
- Response (200): `{ "success": true, "data": Order[] }`
- Mục đích: Khách hàng tra cứu lịch sử/trạng thái đơn.

### UC (Driver): Bật/Tắt Online
- Endpoint: `PUT /orders/driver/online`
- Headers: `Authorization (Driver)`, `Content-Type: application/json`
- Request:
```json
{ "online": true }
```
- Response (200): `{ "success": true, "data": Driver }`
- Mục đích: Nhận/Ngưng nhận đơn mới.

### UC (Driver): Xem đơn khả dụng
- Endpoint: `GET /orders/driver/available`
- Headers: `Authorization (Driver)`
- Request: (none)
- Response (200): `{ "success": true, "data": Order[] }`
- Mục đích: Danh sách order items ở trạng thái Created, phù hợp khu vực/loại xe.

### UC (Driver): Nhận mục đơn
- Endpoint: `PUT /orders/:orderId/items/:itemId/accept`
- Headers: `Authorization (Driver)`
- Request: (none)
- Response (200): `{ "success": true, "data": Order }` (item → `Accepted`, gán `driverId`)
- Mục đích: Nhận một mục đơn; hệ thống đảm bảo mỗi tài xế chỉ có một item đang hoạt động.

### UC (Driver): Cập nhật trạng thái mục đơn
- Endpoint: `PUT /orders/:orderId/items/:itemId/status`
- Headers: `Authorization (Driver)`, `Content-Type: application/json`
- Request ví dụ:
```json
{ "status": "PickedUp" }
```
- Response (200): `{ "success": true, "data": Order }` (Allowed: `PickedUp|Delivering|Delivered|Cancelled`)
- Mục đích: Báo tiến trình cho khách hàng theo từng bước.

### UC: Xem chi tiết đơn hàng
- Endpoint: `GET /orders/:orderId`
- Headers: `Authorization`
- Request: (none)
- Response (200): `{ "success": true, "data": Order }`
- Mục đích: Tra cứu chi tiết đơn, thông tin tài xế nếu đã gán.

---

## 6) Driver Onboarding (Đăng ký & Duyệt)

### UC (Customer): Nộp hồ sơ tài xế
- Endpoint: `POST /driver/apply`
- Headers: `Authorization`, `Content-Type: multipart/form-data`
- Request (form-data, key có thể nhiều dòng trùng tên để gửi nhiều file):
  - Đơn lẻ: `licenseFront`, `licenseBack`, `idFront`, `idBack`, `portrait`
  - Mảng: `vehiclePhotos`, `vehicleDocs`
- Response (201): `{ "success": true, "data": DriverApplication }`
- Mục đích: Người dùng nộp hồ sơ để được xét duyệt tài xế.

### UC: Xem hồ sơ đã nộp của tôi
- Endpoint: `GET /driver/my-application`
- Headers: `Authorization`
- Response (200): `{ "success": true, "data": DriverApplication | null }`
- Mục đích: Theo dõi tình trạng duyệt hồ sơ.

### UC (Admin): Danh sách/Chi tiết/Duyệt hồ sơ
- Endpoint: `GET /driver/admin/applications` (+ query `status`, `page`, `limit`)
- Endpoint: `GET /driver/admin/applications/:applicationId`
- Endpoint: `PUT /driver/admin/applications/:applicationId/review`
- Headers: `Authorization (Admin)` (+ `Content-Type: application/json` cho review)
- Request duyệt ví dụ:
```json
{ "action": "approve", "adminNote": "Hồ sơ đầy đủ, đã xác minh" }
```
- Response (200): `{ "success": true, "message": "...", "data": DriverApplication }`
- Mục đích: Quản trị xét duyệt nâng cấp thành tài xế.

### UC (Public): Danh sách quận/huyện hỗ trợ
- Endpoint: `GET /driver/districts`
- Headers: (none)
- Response (200):
```json
{ "success": true, "data": ["Quận Cẩm Lệ","Quận Hải Châu","Quận Liên Chiểu","Quận Ngũ Hành Sơn","Quận Sơn Trà","Quận Thanh Khê","Huyện Hòa Vang","Huyện Hoàng Sa"] }
```
- Mục đích: FE hiển thị để tài xế chọn khu vực hoạt động.

---

## 7) Admin

### UC (Admin): Dashboard tổng quan
- Endpoint: `GET /admin/dashboard`
- Headers: `Authorization (Admin)`
- Response (200): Thống kê tổng số user, driver, orders, doanh thu.
- Mục đích: Theo dõi tình hình hệ thống.

### UC (Admin): Danh sách người dùng
- Endpoint: `GET /admin/users` (query: `role`, `search`, `page`, `limit`, `sort`)
- Headers: `Authorization (Admin)`
- Response (200): `{ "success": true, "data": User[], "meta": { ... } }`
- Mục đích: Quản trị người dùng.

### UC (Admin): Danh sách tài xế
- Endpoint: `GET /admin/drivers` (query: `status`)
- Headers: `Authorization (Admin)`
- Response (200): `{ "success": true, "data": Driver[], "meta"? }`
- Mục đích: Quản trị tài xế.

### UC (Admin): Danh sách đơn hàng
- Endpoint: `GET /admin/orders` (query: `status`, `page`, `limit`...)
- Headers: `Authorization (Admin)`
- Response (200): `{ "success": true, "data": Order[], "meta"? }`
- Mục đích: Theo dõi/kiểm soát đơn hàng trong hệ thống.

### UC (Admin): Báo cáo doanh thu
- Endpoint: `GET /admin/revenue` (query: `period=daily|monthly|yearly`, `year`, `month`)
- Headers: `Authorization (Admin)`
- Response (200): `{ "success": true, "data": RevenueSeries }`
- Mục đích: Theo dõi doanh thu theo thời gian, áp dụng cơ chế hoa hồng 20%/cuốc.

---

## Phụ lục: Use Case chi tiết theo cấu trúc mẫu

Lưu ý: base URL mặc định `http://localhost:8080/api`.

### UC 7: Lấy thông tin cá nhân (User)
- GET: `http://localhost:8080/api/profile/me`
- Headers: `Authorization: Bearer <token>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "name": "...", "email": "...", "phone": "...", "role": "Customer", "address": "Đà Nẵng", "avatarUrl": "..." } }
```
- Mục đích: Lấy hồ sơ user đang đăng nhập.

### UC 8: Cập nhật thông tin cá nhân (User)
- PUT: `http://localhost:8080/api/profile/me`
- Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Request body
```json
{ "name": "New Name", "address": "Đà Nẵng" }
```
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "name": "New Name", "address": "Đà Nẵng" } }
```
- Mục đích: Cập nhật thông tin cơ bản của user.

### UC 9: Upload avatar người dùng
- POST: `http://localhost:8080/api/profile/me/avatar`
- Headers: `Authorization: Bearer <token>`
- Request (multipart/form-data)
  - `file`: (File ảnh)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "avatarUrl": "https://..." } }
```
- Mục đích: Cập nhật ảnh đại diện user.

### UC 10: Xem hồ sơ tài xế
- GET: `http://localhost:8080/api/profile/driver/me`
- Headers: `Authorization: Bearer <token>` (Driver|Admin)
- Request: (none)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "status": "Active", "isOnline": true, "serviceAreas": ["Quận ..."], "avatarUrl": "https://...", "userId": { "name": "...", "phone": "..." }, "vehicleId": { "type": "TruckSmall" } } }
```
- Mục đích: Xem hồ sơ tài xế của tài khoản.

### UC 11: Cập nhật hồ sơ tài xế
- PUT: `http://localhost:8080/api/profile/driver/me`
- Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Request body (ví dụ)
```json
{ "status": "Active" }
```
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "status": "Active" } }
```
- Mục đích: Cập nhật trạng thái hồ sơ tài xế.

### UC 12: Upload avatar tài xế
- POST: `http://localhost:8080/api/profile/driver/me/avatar`
- Headers: `Authorization: Bearer <token>`
- Request (multipart/form-data)
  - `file`: (File ảnh)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "avatarUrl": "https://..." } }
```
- Mục đích: Cập nhật ảnh đại diện tài xế.

### UC 13: Cập nhật khu vực hoạt động & Online
- PUT: `http://localhost:8080/api/profile/driver/me/areas`
- Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Request body
```json
{ "serviceAreas": ["Quận Hải Châu", "Quận Thanh Khê"], "isOnline": true }
```
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "serviceAreas": ["Quận Hải Châu", "Quận Thanh Khê"], "isOnline": true } }
```
- Mục đích: Thiết lập khu vực hoạt động.

### UC 14: Upload một ảnh (qua backend)
- POST: `http://localhost:8080/api/upload/image`
- Headers: `Authorization: Bearer <token>`
- Request (multipart/form-data)
  - `file`: (File)
  - `folder`: (text, optional)
- Response (200)
```json
{ "success": true, "data": { "url": "https://.../vehicles/abcdef.jpg", "publicId": "vehicles/abcdef", "width": 800, "height": 600, "format": "jpg" } }
```
- Mục đích: Lấy URL ảnh để dùng cho avatar/ảnh xe.

### UC 15: Upload nhiều ảnh
- POST: `http://localhost:8080/api/upload/images`
- Headers: `Authorization: Bearer <token>`
- Request (multipart/form-data)
  - `files`: (nhiều File)
  - `folder`: (text, optional)
- Response (200)
```json
{ "success": true, "data": [ { "url": "https://...1.jpg" }, { "url": "https://...2.jpg" } ] }
```
- Mục đích: Upload batch ảnh.

### UC 16: Lấy danh sách loại xe
- GET: `http://localhost:8080/api/vehicles/types`
- Headers: (none)
- Request: (none)
- Response (200)
```json
{ "success": true, "data": [ { "type": "TruckSmall", "label": "Xe tải nhỏ", "maxWeightKg": 1000, "pricePerKm": 40000, "sampleImage": "/imgs/small-truck.jpg" } ] }
```
- Mục đích: FE hiển thị cards.

### UC 17: Tìm kiếm xe (lọc)
- GET: `http://localhost:8080/api/vehicles?type=TruckSmall&weightKg=800&district=Qu%E1%BA%ADn%20H%E1%BA%A3i%20Ch%C3%A2u&onlineOnly=true&page=1&limit=12`
- Headers: (none)
- Request: (query)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "type": "TruckSmall", "maxWeightKg": 1000, "photoUrl": "https://...", "driverId": { "isOnline": true, "serviceAreas": ["Quận Hải Châu"] } } ], "meta": { "page": 1, "limit": 12, "total": 5, "totalPages": 1 } }
```
- Mục đích: Lọc xe phục vụ đặt đơn.

### UC 18: (Driver) Thêm xe mới
- POST: `http://localhost:8080/api/vehicles`
- Headers: `Authorization: Bearer <driverToken>`
- Request cách 1 (multipart/form-data)
  - text: `type`, `licensePlate`, `maxWeightKg`, `description?`, `features?`
  - file: `photo`
- Request cách 2 (application/json)
```json
{ "type": "TruckSmall", "licensePlate": "43A-12345", "maxWeightKg": 1000, "photoUrl": "https://..." }
```
- Response (201)
```json
{ "success": true, "data": { "_id": "...", "type": "TruckSmall", "photoUrl": "https://..." } }
```
- Mục đích: Khai báo xe để nhận đơn.

### UC 19: (Driver) Cập nhật xe
- PUT: `http://localhost:8080/api/vehicles/:vehicleId`
- Headers: `Authorization: Bearer <driverToken>`
- Request JSON (ví dụ)
```json
{ "status": "Active", "photoUrl": "https://...new.jpg" }
```
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "status": "Active", "photoUrl": "https://...new.jpg" } }
```
- Mục đích: Cập nhật thông tin/ảnh xe.

### UC 20: (Driver) Xoá xe
- DELETE: `http://localhost:8080/api/vehicles/:vehicleId`
- Headers: `Authorization: Bearer <driverToken>`
- Request: (none)
- Response (200)
```json
{ "success": true, "message": "Đã xoá xe thành công" }
```
- Mục đích: Gỡ xe khỏi hệ thống.

### UC 21: (Driver) Danh sách xe của tôi
- GET: `http://localhost:8080/api/vehicles/my-vehicles`
- Headers: `Authorization: Bearer <driverToken>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "type": "TruckSmall" } ] }
```
- Mục đích: Quản lý xe đã khai báo.

### UC 22: (Customer) Tạo đơn
- POST: `http://localhost:8080/api/orders`
- Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Request body (ví dụ)
```json
{
  "pickupAddress": "Số 1, Hải Châu",
  "dropoffAddress": "Số 2, Liên Chiểu",
  "items": [
    { "vehicleType": "TruckSmall", "weightKg": 800, "distanceKm": 12.5, "loadingService": true, "insurance": true }
  ]
}
```
- Response (201)
```json
{ "success": true, "data": { "_id": "...", "items": [ { "status": "Created", "priceBreakdown": { "basePerKm": 40000, "distanceCost": 500000, "loadCost": 50000, "insuranceFee": 100000, "total": 650000 } } ], "totalPrice": 650000 } }
```
- Mục đích: Tạo đơn nhiều mục.

### UC 23: (Customer) Danh sách đơn của tôi
- GET: `http://localhost:8080/api/orders/my-orders`
- Headers: `Authorization: Bearer <token>`
- Request: (query `status?`, `page?`, `limit?`)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "totalPrice": 650000 } ] }
```
- Mục đích: Tra cứu đơn của khách hàng.

### UC 24: (Driver) Bật/Tắt online
- PUT: `http://localhost:8080/api/orders/driver/online`
- Headers: `Authorization: Bearer <driverToken>`, `Content-Type: application/json`
- Request body
```json
{ "online": true }
```
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "isOnline": true, "lastOnlineAt": "..." } }
```
- Mục đích: Nhận/Ngưng nhận đơn mới.

### UC 25: (Driver) Đơn khả dụng
- GET: `http://localhost:8080/api/orders/driver/available`
- Headers: `Authorization: Bearer <driverToken>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "items": [ { "status": "Created" } ] } ] }
```
- Mục đích: Xem đơn có thể nhận.

### UC 26: (Driver) Nhận mục đơn
- PUT: `http://localhost:8080/api/orders/:orderId/items/:itemId/accept`
- Headers: `Authorization: Bearer <driverToken>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "items": [ { "_id": "itemId", "status": "Accepted", "driverId": "driver..." } ] } }
```
- Mục đích: Nhận một mục đơn (đảm bảo rule 1-đơn-đang-hoạt-động).

### UC 27: (Driver) Cập nhật trạng thái mục đơn
- PUT: `http://localhost:8080/api/orders/:orderId/items/:itemId/status`
- Headers: `Authorization: Bearer <driverToken>`, `Content-Type: application/json`
- Request body
```json
{ "status": "PickedUp" }
```
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "items": [ { "_id": "itemId", "status": "PickedUp" } ] } }
```
- Mục đích: Cập nhật tiến trình giao hàng.

### UC 28: Xem chi tiết đơn hàng
- GET: `http://localhost:8080/api/orders/:orderId`
- Headers: `Authorization: Bearer <token>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "pickupAddress": "...", "dropoffAddress": "...", "items": [ { "status": "..." } ] } }
```
- Mục đích: Tra cứu chi tiết đơn.

### UC 29: Nộp hồ sơ tài xế
- POST: `http://localhost:8080/api/driver/apply`
- Headers: `Authorization: Bearer <token>`
- Request (multipart/form-data)
  - `licenseFront`, `licenseBack`, `idFront`, `idBack`, `portrait` (file đơn)
  - `vehiclePhotos`, `vehicleDocs` (nhiều file)
- Response (201)
```json
{ "success": true, "data": { "_id": "...", "status": "Pending" } }
```
- Mục đích: Đăng ký làm tài xế.

### UC 30: Xem hồ sơ tài xế của tôi
- GET: `http://localhost:8080/api/driver/my-application`
- Headers: `Authorization: Bearer <token>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "status": "Pending" } }
```
- Mục đích: Theo dõi trạng thái duyệt.

### UC 31: (Admin) Danh sách hồ sơ tài xế
- GET: `http://localhost:8080/api/driver/admin/applications?status=Pending&page=1&limit=20`
- Headers: `Authorization: Bearer <adminToken>`
- Request: (query)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "status": "Pending" } ], "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 } }
```
- Mục đích: Duyệt danh sách hồ sơ.

### UC 32: (Admin) Chi tiết hồ sơ tài xế
- GET: `http://localhost:8080/api/driver/admin/applications/:applicationId`
- Headers: `Authorization: Bearer <adminToken>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": { "_id": "...", "docs": { "licenseFrontUrl": "https://..." } } }
```
- Mục đích: Xem chi tiết hồ sơ.

### UC 33: (Admin) Duyệt/Từ chối hồ sơ tài xế
- PUT: `http://localhost:8080/api/driver/admin/applications/:applicationId/review`
- Headers: `Authorization: Bearer <adminToken>`, `Content-Type: application/json`
- Request body (ví dụ approve)
```json
{ "action": "approve", "adminNote": "Hồ sơ đầy đủ, đã xác minh" }
```
- Response (200)
```json
{ "success": true, "message": "Approved", "data": { "_id": "...", "status": "Approved" } }
```
- Mục đích: Thay đổi trạng thái hồ sơ tài xế.

### UC 34: (Admin) Dashboard tổng quan
- GET: `http://localhost:8080/api/admin/dashboard`
- Headers: `Authorization: Bearer <adminToken>`
- Request: (none)
- Response (200)
```json
{ "success": true, "data": { "users": 120, "drivers": 35, "orders": 540, "revenue": 123456789 } }
```
- Mục đích: Theo dõi chỉ số tổng quan.

### UC 35: (Admin) Danh sách người dùng
- GET: `http://localhost:8080/api/admin/users?role=Customer&search=nguyen&page=1&limit=20`
- Headers: `Authorization: Bearer <adminToken>`
- Request: (query)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "name": "...", "role": "Customer" } ], "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
```
- Mục đích: Quản trị người dùng.

### UC 36: (Admin) Danh sách tài xế
- GET: `http://localhost:8080/api/admin/drivers?status=Active`
- Headers: `Authorization: Bearer <adminToken>`
- Request: (query)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "status": "Active" } ] }
```
- Mục đích: Quản trị tài xế.

### UC 37: (Admin) Danh sách đơn hàng
- GET: `http://localhost:8080/api/admin/orders?status=Completed&page=1&limit=20`
- Headers: `Authorization: Bearer <adminToken>`
- Request: (query)
- Response (200)
```json
{ "success": true, "data": [ { "_id": "...", "totalPrice": 1230000 } ], "meta": { "page": 1, "limit": 20, "total": 10, "totalPages": 1 } }
```
- Mục đích: Theo dõi đơn hàng hệ thống.

### UC 38: (Admin) Báo cáo doanh thu
- GET: `http://localhost:8080/api/admin/revenue?period=monthly&year=2024`
- Headers: `Authorization: Bearer <adminToken>`
- Request: (query)
- Response (200)
```json
{ "success": true, "data": [ { "month": 1, "revenue": 10000000 }, { "month": 2, "revenue": 12000000 } ] }
```
- Mục đích: Xem doanh thu theo thời gian.

## Phân quyền & Quy tắc nghiệp vụ nổi bật
- Driver chỉ có thể nhận 1 mục đơn đang hoạt động tại một thời điểm (Accepted|PickedUp|Delivering).
- Lọc xe public có thể theo `type`, `weightKg`, `district`, `onlineOnly`.
- Pricing (tham khảo):
  - 0.5–1 tấn: 40k/km; 1–3 tấn: 60k/km; 3–5 tấn: 80k/km; 5–10 tấn: 100k/km.
  - Phụ phí bốc xếp khi chọn: mặc định 50k; bảo hiểm: 100k–200k/item.

---

## Gợi ý kiểm thử nhanh với Postman
1) Đăng ký → Xác thực email → Đăng nhập (lưu `accessToken`).
2) Vehicles: `GET /vehicles/types`, `GET /vehicles?type=TruckSmall&onlineOnly=true`.
3) Customer: `POST /orders` tạo đơn; `GET /orders/my-orders` xem đơn.
4) Driver: `PUT /orders/driver/online` bật online; `GET /orders/driver/available`; `PUT /orders/:orderId/items/:itemId/accept`; `PUT /orders/:orderId/items/:itemId/status`.
5) Upload: `POST /upload/image` để lấy URL; dùng URL này cập nhật avatar/ảnh xe nếu không muốn dùng form-data trực tiếp ở profile/vehicles.


