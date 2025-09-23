## REST API - Hướng dẫn sử dụng

- baseUrl: `http://localhost:8080/api`
- Xác thực: Header `Authorization: Bearer <accessToken>` với API yêu cầu đăng nhập
- Roles: `Customer`, `Driver`, `Admin`
- Content-Type:
  - `application/json` cho JSON
  - `multipart/form-data` cho upload file (key thường dùng: `file`)
- Health check: `GET /healthz` → `{ ok: true, uptime }`

### Quy ước phản hồi & lỗi chung
- Thành công: `{ success: true, data?, message?, meta? }`
- Lỗi 400: `{ success: false, message: '...' }`
- Lỗi 401 thiếu/không hợp lệ token: `{ success: false, message: 'Thiếu access token' | 'Access token không hợp lệ' }`
- Lỗi 403 thiếu quyền: `{ success: false, message: 'Không có quyền truy cập', details?: { userId, userRoles, requiredAnyOf } }`
- Lỗi 404 route không tồn tại: `{ success: false, error: 'Không tìm thấy endpoint này' }`
- Lỗi 5xx: `{ success: false, message: 'Lỗi ...', error: '...' }`

---

## Auth - `/auth`

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
- Lỗi: 400 thiếu trường; 409 email/phone trùng; 500

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
- Lỗi: 400 OTP sai/hết hạn; 404 không tìm thấy user; 500

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
    "user": { "id": "66f...", "name": "Nguyen Van A", "email": "a@example.com", "phone": "0900000001", "role": "Customer" },
    "accessToken": "eyJ..."
  }
}
```
> Ghi chú: Hệ thống không sử dụng refresh token.

#### User hiện tại
- GET `{{baseUrl}}/auth/me`
- Headers: `Authorization: Bearer {{accessToken}}`
- 200
```json
{ "success": true, "data": { "_id": "...", "name": "...", "email": "...", "phone": "...", "role": "Customer", "address": "Đà Nẵng", "avatarUrl": "..." } }
```

#### Kiểm tra roles hiện tại
- GET `{{baseUrl}}/auth/roles`
- Headers: `Authorization`
- 200
```json
{ "success": true, "data": { "userId": "...", "roles": ["Admin","Customer"] } }
```

> Dùng endpoint này để kiểm tra nhanh roles từ DB cho token đang dùng.

#### Quên/Đặt lại mật khẩu
- POST `{{baseUrl}}/auth/forgot-password` → Body `{ "email": "a@example.com" }` → 200 `{ success, message }`
- POST `{{baseUrl}}/auth/reset-password` → Body `{ "email": "a@example.com", "code": "123456", "newPassword": "..." }` → 200 `{ success, message }`

Ví dụ cURL đăng nhập:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0900000001","password":"secret123"}'
```

---

## Profile - `/profile`

#### Lấy thông tin cá nhân (User)
- GET `{{baseUrl}}/profile/me`
- Headers: `Authorization`
- 200 `{ success, data: user }`

#### Cập nhật thông tin cá nhân (User)
- PUT `{{baseUrl}}/profile/me`
- Headers: `Authorization`, `Content-Type: application/json`
- Body
```json
{ "name": "New Name", "address": "Đà Nẵng" }
```
- 200 `{ success, data: user }`

#### Upload avatar người dùng
- POST `{{baseUrl}}/profile/me/avatar`
- Headers: `Authorization`
- Body (form-data)
  - key: `file` (Type: File)
- 200 `{ success, data: user }`

#### Xem hồ sơ tài xế
- GET `{{baseUrl}}/profile/driver/me`
- Headers: `Authorization (Driver|Admin)`
- 200 `{ success, data: driver(populate vehicleId) }`

#### Cập nhật hồ sơ tài xế
- PUT `{{baseUrl}}/profile/driver/me`
- Headers: `Authorization (Driver|Admin)`, `Content-Type: application/json`
- Body
```json
{ "status": "Active" }
```
- 200 `{ success, data: driver }`

#### Upload avatar tài xế
- POST `{{baseUrl}}/profile/driver/me/avatar`
- Headers: `Authorization (Driver|Admin)`
- Body (form-data): `file`
- 200 `{ success, data: driver }`

#### Tạo/Cập nhật xe của tài xế
- PUT `{{baseUrl}}/profile/vehicle/me`
- Headers: `Authorization (Driver|Admin)`, `Content-Type: application/json`
- Body
```json
{ "type": "TruckSmall", "licensePlate": "43A1-123.45" }
```
- 200 `{ success, data: vehicle }`

#### Upload ảnh xe
- POST `{{baseUrl}}/profile/vehicle/me/photo`
- Headers: `Authorization (Driver|Admin)`
- Body (form-data): `file`
- 200 `{ success, data: vehicle }`

---

## Vehicles (Public) - `/vehicles`

#### Danh sách loại xe (hiển thị card)
- GET `{{baseUrl}}/vehicles/types`
- 200
```json
{
  "success": true,
  "data": [
    { "type": "TruckSmall", "label": "Xe tải nhỏ", "maxWeightKg": 1000, "sampleImage": "https://.../TruckSmall" },
    { "type": "TruckMedium", "label": "Xe tải vừa", "maxWeightKg": 3000, "sampleImage": "https://.../TruckMedium" },
    { "type": "TruckLarge", "label": "Xe tải to", "maxWeightKg": 10000, "sampleImage": "https://.../TruckLarge" },
    { "type": "TruckBox", "label": "Xe thùng", "maxWeightKg": 5000, "sampleImage": "https://.../TruckBox" },
    { "type": "DumpTruck", "label": "Xe ben", "maxWeightKg": 10000, "sampleImage": "https://.../DumpTruck" },
    { "type": "PickupTruck", "label": "Xe bán tải", "maxWeightKg": 800, "sampleImage": "https://.../PickupTruck" },
    { "type": "Trailer", "label": "Xe kéo", "maxWeightKg": 20000, "sampleImage": "https://.../Trailer" }
  ]
}
```

#### Danh sách xe (lọc)
- GET `{{baseUrl}}/vehicles`
- Query: `type`, `weightKg`, `page`, `limit`
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

> Pricing: 0.5-1 tấn: 40k/km; 1-3 tấn: 60k/km; 3-5 tấn: 80k/km; 5-10 tấn: 100k/km; phụ phí bốc hàng mặc định 50k nếu tick; bảo hiểm optional 100k-200k/item.

---

## Orders - `/orders`

#### Tạo đơn (Customer)
- POST `{{baseUrl}}/orders`
- Headers: `Authorization (Customer)`, `Content-Type: application/json`
- Body
```json
{
  "pickupAddress": "Số 1, Hải Châu",
  "dropoffAddress": "Số 2, Liên Chiểu",
  "items": [
    { "vehicleType":"TruckSmall","weightKg":800,"distanceKm":12.5,"loadingService":true,"insurance":true }
  ]
}
```
- 201 trả về order đầy đủ kèm `items[].priceBreakdown` và `totalPrice`.
- Lỗi: 400 thiếu địa chỉ/items; 400 không có xe phù hợp; 500

#### Driver bật/tắt hoạt động
- PUT `{{baseUrl}}/orders/driver/online`
- Headers: `Authorization (Driver)`, `Content-Type: application/json`
- Body
```json
{ "online": true }
```
- 200 `{ success, data: driver }`

#### Driver nhận item trong đơn
- PUT `{{baseUrl}}/orders/:orderId/items/:itemId/accept`
- Headers: `Authorization (Driver)`
- 200: trả về order; item chuyển `status="Accepted"` và có `driverId` hiện tại
- Lỗi: 400 chưa có hồ sơ tài xế; 400 đã có đơn hoạt động; 400 item không khả dụng; 500

#### Driver cập nhật trạng thái item
- PUT `{{baseUrl}}/orders/:orderId/items/:itemId/status`
- Headers: `Authorization (Driver)`, `Content-Type: application/json`
- Body
```json
{ "status": "PickedUp" }
```
- 200: trả về order đã cập nhật (Allowed: PickedUp | Delivering | Delivered | Cancelled)
- Lỗi: 400 trạng thái không hợp lệ; 400 chưa có hồ sơ tài xế; 404 item không phù hợp; 500

---

## Driver Onboarding - `/driver`

#### Nộp hồ sơ tài xế
- POST `{{baseUrl}}/driver/apply`
- Headers: `Authorization`
- Yêu cầu: user phải có `email` và đã xác thực email
- Body (multipart/form-data)
  - Đơn lẻ: `licenseFront`, `licenseBack`, `idFront`, `idBack`, `portrait`
  - Mảng: `vehiclePhotos[]`, `vehicleDocs[]`
- 201 `{ success, data: application }`

#### Xem hồ sơ của tôi
- GET `{{baseUrl}}/driver/my-application`
- Headers: `Authorization`
- 200 `{ success, data: application | null }`

#### Xem chi tiết hồ sơ (Admin)
- GET `{{baseUrl}}/driver/admin/applications`
- GET `{{baseUrl}}/driver/admin/applications/:applicationId`
- Headers: `Authorization (Admin)`
- 200 `{ success, data, meta? }`

#### Xem chi tiết hồ sơ (Owner hoặc Admin)
- GET `{{baseUrl}}/driver/applications/:applicationId`
- Headers: `Authorization (Owner|Admin)`
- 200 `{ success, data }`

## Driver phạm vi hoạt động (Đà Nẵng)

#### Danh sách quận/huyện hỗ trợ
- GET `{{baseUrl}}/driver/districts`
- 200
```json
{ "success": true, "data": ["Quận Cẩm Lệ","Quận Hải Châu","Quận Liên Chiểu","Quận Ngũ Hành Sơn","Quận Sơn Trà","Quận Thanh Khê","Huyện Hòa Vang","Huyện Hoàng Sa"] }
```

#### Cập nhật phạm vi hoạt động và trạng thái
- PUT `{{baseUrl}}/profile/driver/me/areas`
- Headers: `Authorization (Driver|Admin)`, `Content-Type: application/json`
- Body
```json
{
  "serviceAreas": ["Quận Hải Châu", "Quận Thanh Khê"],
  "isOnline": true
}
```
- 200 `{ success, data: driver }`

## Vehicles - lọc theo khu vực/online
- GET `{{baseUrl}}/vehicles?district=Qu%E1%BA%ADn%20H%E1%BA%A3i%20Ch%C3%A2u&onlineOnly=true`
- Mô tả: chỉ trả xe có `driver.isOnline = true` và có `serviceAreas` chứa district chỉ định.

## Hướng dẫn cho FE (luồng chính)

### 1) Trang danh sách loại xe (cards)
- API: GET `{{baseUrl}}/vehicles/types`
- Response mẫu:
```json
{
  "success": true,
  "data": [
    { "type": "TruckSmall", "label": "Xe tải nhỏ", "maxWeightKg": 1000, "sampleImage": "https://placehold.co/600x400?text=TruckSmall" },
    { "type": "TruckMedium", "label": "Xe tải vừa", "maxWeightKg": 3000, "sampleImage": "https://placehold.co/600x400?text=TruckMedium" }
  ]
}
```
- FE hiển thị card: ảnh, tên loại, trọng lượng tối đa. Khi chọn 1 loại → chuyển sang màn lọc/đặt xe.

### 2) Lọc xe theo loại/khu vực/online
- API: GET `{{baseUrl}}/vehicles?type=TruckSmall&district=Qu%E1%BA%ADn%20H%E1%BA%A3i%20Ch%C3%A2u&onlineOnly=true&weightKg=800&page=1&limit=12`
- Response mẫu:
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

### 3) Tạo đơn nhiều item (khách)
- API: POST `{{baseUrl}}/orders` (Bearer Customer)
- Body:
```json
{
  "pickupAddress": "Số 1, Hải Châu",
  "dropoffAddress": "Số 2, Liên Chiểu",
  "items": [
    { "vehicleType": "TruckSmall", "weightKg": 800, "distanceKm": 12.5, "loadingService": true, "insurance": true },
    { "vehicleType": "TruckMedium", "weightKg": 2500, "distanceKm": 7.2, "loadingService": false, "insurance": false }
  ]
}
```
- Pricing: 40k/60k/80k/100k theo khung; phụ phí bốc hàng mặc định 50k nếu `loadingService=true`; bảo hiểm 100k-200k/item (đang set 100k trong code minh hoạ tạo đơn sample trước đây, FE có thể hiển thị confirm và set cờ `insurance`).
- Response (rút gọn):
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

### 4) Bật/tắt hoạt động (tài xế)
- API: PUT `{{baseUrl}}/orders/driver/online` (Bearer Driver)
- Body:
```json
{ "online": true }
```
- Response: `{ success, data: driver }`

### 5) Cập nhật phạm vi hoạt động (tài xế)
- API: PUT `{{baseUrl}}/profile/driver/me/areas` (Bearer Driver|Admin)
- Body:
```json
{ "serviceAreas": ["Quận Hải Châu", "Quận Thanh Khê"], "isOnline": true }
```
- Response: `{ success, data: driver }`
- FE dùng `/driver/districts` để lấy danh sách quận/huyện.

### 6) Tài xế nhận item và cập nhật trạng thái
- Nhận item: PUT `{{baseUrl}}/orders/:orderId/items/:itemId/accept` (Bearer Driver)
  - Response: `{ success, data: order }` (item chuyển `Accepted`).
  - Ràng buộc: mỗi tài xế chỉ có 1 item đang hoạt động (Accepted|PickedUp|Delivering).
- Cập nhật trạng thái: PUT `{{baseUrl}}/orders/:orderId/items/:itemId/status`
- Body:
```json
{ "status": "PickedUp" }
```
  - Allowed: `PickedUp`, `Delivering`, `Delivered`, `Cancelled`.

### 7) Danh sách + chi tiết hồ sơ nâng cấp tài xế
- Customer xem của mình: GET `{{baseUrl}}/driver/my-application`
- Admin xem danh sách: GET `{{baseUrl}}/driver/admin/applications?status=Pending&page=1&limit=20`
- Admin xem chi tiết: GET `{{baseUrl}}/driver/admin/applications/:applicationId`
- Owner/Admin xem chi tiết: GET `{{baseUrl}}/driver/applications/:applicationId`
- Admin duyệt/từ chối: PUT `{{baseUrl}}/driver/admin/applications/:applicationId/review`
- Body approve:
```json
{ "action": "approve", "adminNote": "Hồ sơ hợp lệ" }
```
- Khi approve: gửi email thông báo cấp quyền tài xế; cập nhật role/roles và upsert hồ sơ Driver.

## Chi tiết từng API (Schemas)

Lưu ý chung
- Header: `Authorization: Bearer <accessToken>` cho API yêu cầu đăng nhập
- Kiểu dữ liệu: `string`, `number`, `boolean`, `array<string>`, `object`, `date(ISO)`
- Múi giờ: các thời gian trả về dạng ISO (UTC)

### Auth
- POST `/auth/register`
  - Body
    - `name` (string, required)
    - `phone` (string, required)
    - `password` (string, required)
    - `role` (string, optional, enum: Customer|Driver|Admin; mặc định Customer)
    - `email` (string, optional)
  - 201 Response: `{ success: true, message: string }`

- POST `/auth/verify-email`
  - Body
    - `email` (string, required)
    - `code` (string, required)
  - 200: `{ success: true, message: string }`

- POST `/auth/login`
  - Body (một trong)
    - `{ phone: string, password: string }`
    - `{ email: string, password: string }`
  - 200: `{ success: true, data: { user: { id, name, email, phone, role }, accessToken: string } }`

- GET `/auth/me`
  - 200: `{ success: true, data: { _id, name, email, phone, role, address, avatarUrl } }`

- GET `/auth/roles`
  - 200: `{ success: true, data: { userId: string, roles: array<string> } }`

- POST `/auth/forgot-password`
  - Body: `{ email: string }`
  - 200: `{ success: true, message: string }`

- POST `/auth/reset-password`
  - Body: `{ email: string, code: string, newPassword: string }`
  - 200: `{ success: true, message: string }`

### Profile (User)
- GET `/profile/me`
  - 200: `{ success: true, data: User }`
- PUT `/profile/me`
  - Body: `{ name?: string, address?: string }`
  - 200: `{ success: true, data: User }`
- POST `/profile/me/avatar`
  - form-data: `file` (File, max ~5MB)
  - 200: `{ success: true, data: User }`

User schema (rút gọn)
```json
{
  "_id": "string", "name": "string", "email": "string|null", "phone": "string",
  "role": "Customer|Driver|Admin", "address": "string", "avatarUrl": "string|null",
  "createdAt": "date(ISO)", "updatedAt": "date(ISO)"
}
```

### Profile (Driver)
- GET `/profile/driver/me` (Driver|Admin)
  - 200: `{ success: true, data: Driver(populate vehicleId) }`
- PUT `/profile/driver/me` (Driver|Admin)
  - Body: `{ status: string(enum: Pending|Active|Rejected|Blocked) }`
  - 200: `{ success: true, data: Driver }`
- POST `/profile/driver/me/avatar` (Driver|Admin)
  - form-data: `file` (File, max ~5MB)
  - 200: `{ success: true, data: Driver }`
- PUT `/profile/driver/me/areas` (Driver|Admin)
  - Body
    - `serviceAreas` (array<string>, các giá trị thuộc danh sách quận/huyện Đà Nẵng)
    - `isOnline` (boolean, optional)
  - 200: `{ success: true, data: Driver }`

Driver schema (rút gọn)
```json
{
  "_id": "string", "userId": "string", "vehicleId": "string|null",
  "status": "Pending|Active|Rejected|Blocked", "isOnline": true,
  "lastOnlineAt": "date(ISO)|null", "avatarUrl": "string|null",
  "serviceAreas": ["string"], "createdAt": "date(ISO)", "updatedAt": "date(ISO)"
}
```

### Vehicle (Driver)
- PUT `/profile/vehicle/me` (Driver|Admin)
  - Body
    - `type` (string, enum: Motorbike|Pickup|TruckSmall|TruckBox|DumpTruck|PickupTruck|Trailer|TruckMedium|TruckLarge)
    - `licensePlate` (string)
  - 200: `{ success: true, data: Vehicle }`
- POST `/profile/vehicle/me/photo` (Driver|Admin)
  - form-data: `file` (File, max ~5MB)
  - 200: `{ success: true, data: Vehicle }`

Vehicle schema (rút gọn)
```json
{
  "_id": "string", "driverId": "string", "type": "string(enum)",
  "licensePlate": "string", "maxWeightKg": 1000, "photoUrl": "string|null"
}
```

### Vehicles (Public)
- GET `/vehicles/types`
  - 200: `{ success: true, data: array<{ type:string, label:string, maxWeightKg:number, sampleImage:string }> }`
- GET `/vehicles`
  - Query
    - `type` (string, optional)
    - `weightKg` (number, optional)
    - `district` (string, optional; URL-encoded)
    - `onlineOnly` (boolean, optional; true|false)
    - `page` (number, optional), `limit` (number, optional)
  - 200: `{ success: true, data: array<Vehicle & { driverId?: { status, isOnline, serviceAreas } }>, meta }`

### Orders
- POST `/orders` (Customer)
  - Body
    - `pickupAddress` (string, required)
    - `dropoffAddress` (string, required)
    - `items` (array<Item>, required)
      - Item
        - `vehicleType` (string, required; enum theo Vehicle.type)
        - `weightKg` (number, required)
        - `distanceKm` (number, required)
        - `loadingService` (boolean, optional)
        - `insurance` (boolean, optional)
  - 201: `{ success: true, data: Order }`

Order schema (rút gọn)
```json
{
  "_id":"string", "customerId":"string", "pickupAddress":"string", "dropoffAddress":"string",
  "items":[
    {
      "_id":"string", "vehicleType":"string", "weightKg":800, "distanceKm":12.5,
      "loadingService":true, "insurance":true,
      "priceBreakdown": { "basePerKm": number, "distanceCost": number, "loadCost": number, "insuranceFee": number, "total": number },
      "status":"Created|Accepted|PickedUp|Delivering|Delivered|Cancelled",
      "driverId":"string|null"
    }
  ],
  "totalPrice": number, "createdAt":"date(ISO)", "updatedAt":"date(ISO)"
}
```

- PUT `/orders/driver/online` (Driver)
  - Body: `{ online: boolean }`
  - 200: `{ success: true, data: Driver }`

- PUT `/orders/:orderId/items/:itemId/accept` (Driver)
  - Params: `orderId` (string), `itemId` (string)
  - 200: `{ success: true, data: Order }` (item→`Accepted`, set `driverId`)

- PUT `/orders/:orderId/items/:itemId/status` (Driver)
  - Params: `orderId`, `itemId`
  - Body: `{ status: string(enum: PickedUp|Delivering|Delivered|Cancelled) }`
  - 200: `{ success: true, data: Order }`

### Driver Onboarding
- GET `/driver/districts` (public)
  - 200: `{ success: true, data: array<string> }`

- POST `/driver/apply` (token)
  - form-data (File, max ~20MB/file; nhiều file cho cùng 1 key bằng cách thêm nhiều dòng trùng key)
    - `licenseFront` (File, optional)
    - `licenseBack` (File, optional)
    - `idFront` (File, optional)
    - `idBack` (File, optional)
    - `portrait` (File, optional)
    - `vehiclePhotos` (File, 0..n)
    - `vehicleDocs` (File, 0..n)
  - 201: `{ success: true, data: DriverApplication }`

- GET `/driver/my-application` (token)
  - 200: `{ success: true, data: DriverApplication|null }`

- GET `/driver/applications/:applicationId` (Owner|Admin)
  - 200: `{ success: true, data: DriverApplication }`

- GET `/driver/admin/applications` (Admin)
  - Query: `status` (enum: Pending|Approved|Rejected, default: Pending), `page`, `limit`
  - 200: `{ success: true, data: array<DriverApplication>, meta }`

- GET `/driver/admin/applications/:applicationId` (Admin)
  - 200: `{ success: true, data: DriverApplication }`

- PUT `/driver/admin/applications/:applicationId/review` (Admin)
  - Body: `{ action: 'approve'|'reject', adminNote?: string }`
  - 200: `{ success: true, message: string, data: DriverApplication }`

DriverApplication schema (rút gọn)
```json
{
  "_id":"string", "userId":"string", "status":"Pending|Approved|Rejected",
  "adminNote":"string|null",
  "docs": {
    "licenseFrontUrl":"string|null", "licenseBackUrl":"string|null",
    "idCardFrontUrl":"string|null", "idCardBackUrl":"string|null",
    "portraitUrl":"string|null", "vehiclePhotos":["string"], "vehicleDocs":["string"]
  },
  "submittedAt":"date(ISO)|null", "reviewedAt":"date(ISO)|null",
  "createdAt":"date(ISO)", "updatedAt":"date(ISO)"
}
```

### Admin
- GET `/admin/users` (Admin)
  - Query
    - `role` (string, optional enum: Customer|Driver|Admin)
    - `search` (string, optional; match name/email/phone, regex i)
    - `page` (number, default 1), `limit` (number, default 20, max 100)
    - `sort` (string, ví dụ: `createdAt:desc`)
  - 200: `{ success: true, data: array<User>, meta }`

- GET `/admin/users/:id` (Admin)
  - 200: `{ success: true, data: User }` | 404

### Lưu ý kiểu dữ liệu & ràng buộc
- `vehicleType`/`type`: theo enum trong Vehicle model
- `weightKg`, `distanceKm`: number ≥ 0
- `status` của item: theo enum đã nêu; chuyển trạng thái bởi Driver
- Upload
  - `/driver/apply`: tối đa ~20MB/file, nhiều file cho `vehiclePhotos`/`vehicleDocs`
  - Avatar user/driver/vehicle: ~5MB/file
- Quyền
  - `Driver` chỉ có thể nhận 1 item đang hoạt động tại một thời điểm (được check khi accept)
- Pricing
  - 0.5–1 tấn: 40k/km; 1–3 tấn: 60k/km; 3–5 tấn: 80k/km; 5–10 tấn: 100k/km; phụ phí bốc hàng mặc định 50k nếu chọn; bảo hiểm 100k–200k/item