## REST API Spec

- baseUrl: http://localhost:8080/api
- Xác thực: Header `Authorization: Bearer <accessToken>` với API yêu cầu đăng nhập
- Roles: "Customer", "Driver", "Admin"
- Content-Type:
  - `application/json` cho JSON
  - `multipart/form-data` cho upload file (key: `file`)

### Auth

#### Đăng ký
- POST `{{baseUrl}}/auth/register`
- Body
```json
{
  "name": "Nguyen Van A",
  "phone": "0900000001",
  "password": "secret123",
  "role": "Customer",
  "email": "a@example.com"
}
```
- 201
```json
{ "success": true, "message": "Đăng ký thành công. Vui lòng xác thực email nếu đã cung cấp email." }
```

#### Xác thực email (OTP)
- POST `{{baseUrl}}/auth/verify-email`
- Body
```json
{ "email": "a@example.com", "code": "123456" }
```
- 200
```json
{ "success": true, "message": "Xác thực email thành công" }
```

#### Đăng nhập
- POST `{{baseUrl}}/auth/login`
- Body (1 trong 2)
```json
{ "phone": "0900000001", "password": "secret123" }
```
```json
{ "email": "a@example.com", "password": "secret123" }
```
- 200
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66f...",
      "name": "Nguyen Van A",
      "email": "a@example.com",
      "phone": "0900000001",
      "role": "Customer"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

> Lưu ý: Đã loại bỏ refresh token và logout. Login chỉ trả về accessToken.

#### Thông tin user hiện tại
- GET `{{baseUrl}}/auth/me`
- Headers: `Authorization: Bearer {{accessToken}}`
- 200
```json
{ "success": true, "data": { "id": "...", "name": "...", "email": "...", "phone": "...", "role": "Customer", "address": "Đà Nẵng", "avatarUrl": "..." } }
```

### Profile (User/Driver/Vehicle)

#### Lấy thông tin cá nhân (User)
- GET `{{baseUrl}}/profile/me`
- Headers: `Authorization`

#### Cập nhật thông tin cá nhân (User)
- PUT `{{baseUrl}}/profile/me`
- Headers: `Authorization`, `Content-Type: application/json`
- Body
```json
{ "name": "New Name", "address": "Đà Nẵng" }
```

#### Upload avatar người dùng
- POST `{{baseUrl}}/profile/me/avatar`
- Headers: `Authorization`
- Body (form-data)
  - key: `file` (Type: File)

#### Xem hồ sơ tài xế
- GET `{{baseUrl}}/profile/driver/me`
- Headers: `Authorization (Driver|Admin)`

#### Cập nhật hồ sơ tài xế
- PUT `{{baseUrl}}/profile/driver/me`
- Headers: `Authorization (Driver|Admin)`, `Content-Type: application/json`
- Body
```json
{ "status": "Active" }
```

#### Upload avatar tài xế
- POST `{{baseUrl}}/profile/driver/me/avatar`
- Headers: `Authorization (Driver|Admin)`
- Body (form-data)
  - key: `file` (Type: File)

#### Tạo/Cập nhật xe của tài xế
- PUT `{{baseUrl}}/profile/vehicle/me`
- Headers: `Authorization (Driver|Admin)`, `Content-Type: application/json`
- Body
```json
{ "type": "TruckSmall", "licensePlate": "43A1-123.45" }
```

#### Upload ảnh xe
- POST `{{baseUrl}}/profile/vehicle/me/photo`
- Headers: `Authorization (Driver|Admin)`
- Body (form-data)
  - key: `file` (Type: File)

### Vehicles (Danh sách xe)

#### Danh sách xe (lọc)
- GET `{{baseUrl}}/vehicles`
- Query
  - `type`: Motorbike | Pickup | TruckSmall | TruckBox | DumpTruck | PickupTruck | Trailer | TruckMedium | TruckLarge
  - `weightKg`: lọc xe có maxWeightKg >= weightKg
  - `page`, `limit`
- 200
```json
{
  "success": true,
  "data": [
    { "_id":"...", "type":"TruckSmall", "maxWeightKg":1000, "photoUrl":"...", "licensePlate":"43A1-123.45", "driverId": { "status":"Active", "isOnline": true } }
  ],
  "meta": { "page":1, "limit":12, "total": 25, "totalPages": 3 }
}
```

### Orders (Đơn nhiều item)

#### Tạo đơn (Customer)
- POST `{{baseUrl}}/orders`
- Headers: `Authorization (Customer)`, `Content-Type: application/json`
- Body
```json
{
  "pickupAddress": "Số 1, Hải Châu",
  "dropoffAddress": "Số 2, Liên Chiểu",
  "items": [
    { "vehicleType":"TruckSmall","weightKg":800,"distanceKm":12.5,"loadingService":true,"insurance":true },
    { "vehicleType":"TruckMedium","weightKg":3000,"distanceKm":7.2,"loadingService":false,"insurance":false }
  ]
}
```
- 201
```json
{
  "success": true,
  "data": {
    "_id":"...",
    "customerId":"...",
    "pickupAddress":"Số 1, Hải Châu",
    "dropoffAddress":"Số 2, Liên Chiểu",
    "items":[
      { "_id":"item1","vehicleType":"TruckSmall","weightKg":800,"distanceKm":12.5,"loadingService":true,"insurance":true,"status":"Created","priceBreakdown": { "basePerKm": 50000, "distanceCost": 625000, "loadCost": 50000, "insuranceFee": 100000, "total": 775000 } },
      { "_id":"item2", "...": "..." }
    ],
    "totalPrice": 1234000,
    "createdAt":"...",
    "updatedAt":"..."
  }
}
```

#### Driver bật/tắt hoạt động
- PUT `{{baseUrl}}/orders/driver/online`
- Headers: `Authorization (Driver)`, `Content-Type: application/json`
- Body
```json
{ "online": true }
```
- 200
```json
{ "success": true, "data": { "_id":"...", "userId":"...", "isOnline": true, "lastOnlineAt":"..." } }
```

#### Driver nhận item trong đơn
- PUT `{{baseUrl}}/orders/:orderId/items/:itemId/accept`
- Headers: `Authorization (Driver)`
- 200: trả về toàn bộ order với item đã `status="Accepted"` và `driverId` là tài xế hiện tại

#### Driver cập nhật trạng thái item
- PUT `{{baseUrl}}/orders/:orderId/items/:itemId/status`
- Headers: `Authorization (Driver)`, `Content-Type: application/json`
- Body
```json
{ "status": "PickedUp" }
```
- 200: trả về order có item đã cập nhật `status` (PickedUp | Delivering | Delivered | Cancelled)

### Admin

#### Danh sách người dùng
- GET `{{baseUrl}}/admin/users`
- Headers: `Authorization (Admin)`
- Query
  - `role`: Customer | Driver | Admin
  - `search`: chuỗi tìm kiếm theo name/email/phone
  - `page`, `limit`, `sort` (vd: `createdAt:desc`)
- 200
```json
{
  "success": true,
  "data": [
    { "_id":"...", "name":"...", "email":"...", "phone":"...", "role":"Driver", "address":"Đà Nẵng", "avatarUrl":"...", "createdAt":"..." }
  ],
  "meta": { "page":1, "limit":20, "total": 123, "totalPages": 7 }
}
```

### Lỗi chung
- 400
```json
{ "success": false, "message": "Thiếu dữ liệu bắt buộc" }
```
- 401
```json
{ "success": false, "message": "Thiếu access token" }
```
- 403
```json
{ "success": false, "message": "Không có quyền truy cập" }
```
- 404
```json
{ "success": false, "message": "Không tìm thấy ..." }
```
- 500
```json
{ "success": false, "message": "Lỗi ...", "error": "..." }
```


