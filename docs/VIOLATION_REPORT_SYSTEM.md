# 📋 HỆ THỐNG BÁO CÁO VI PHẠM TÀI XẾ

## 🎯 Tổng quan

Hệ thống cho phép khách hàng báo cáo vi phạm của tài xế sau khi hoàn thành đơn hàng. Admin sẽ xem xét và có quyền:
- Xử lý báo cáo
- Phạt tiền tài xế
- Cấm tài khoản tài xế
- Gửi email thông báo

---

## 🔄 Luồng hoạt động

### 1️⃣ Khách hàng báo cáo vi phạm

**Endpoint:** `POST /api/violations/report`

**Yêu cầu:**
- Phải đăng nhập với role `Customer`
- Đơn hàng phải đã hoàn thành (`Completed`)

**Payload:**
```json
{
  "driverId": "64abc...",          // ID tài xế (tùy chọn nếu có orderId)
  "orderId": "64def...",            // ID đơn hàng
  "orderItemId": "64ghi...",        // ID item cụ thể (tùy chọn)
  "violationType": "LateDelivery",  // Loại vi phạm
  "description": "Mô tả chi tiết",  // Mô tả (20-1000 ký tự)
  "photos": ["url1", "url2"],       // Ảnh chứng minh (tùy chọn)
  "severity": "High",               // Mức độ: Low, Medium, High, Critical
  "isAnonymous": false              // Báo cáo ẩn danh
}
```

**Các loại vi phạm:**
- `LatePickup` - Trễ lấy hàng
- `LateDelivery` - Trễ giao hàng
- `RudeBehavior` - Thái độ không tốt
- `DamagedGoods` - Làm hỏng hàng hóa
- `Overcharging` - Tính phí quá cao
- `UnsafeDriving` - Lái xe không an toàn
- `NoShow` - Không đến đúng giờ
- `Other` - Khác

---

### 2️⃣ Admin xem và quản lý báo cáo

#### Lấy tất cả báo cáo
**Endpoint:** `GET /api/violations/admin/all`

**Query params:**
```
page=1
limit=10
status=Pending          // Pending, Investigating, Resolved, Dismissed
violationType=LateDelivery
driverId=64abc...
severity=High
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64jkl...",
      "reporterId": {
        "name": "Nguyễn Văn A",
        "email": "customer@example.com"
      },
      "driverId": {
        "_id": "64abc...",
        "userId": {
          "name": "Tài xế B",
          "phone": "0901234567",
          "email": "driver@example.com"
        }
      },
      "orderId": {
        "pickupAddress": "123 Lê Duẩn",
        "dropoffAddress": "456 Trần Phú"
      },
      "violationType": "LateDelivery",
      "description": "Trễ 2 tiếng so với cam kết",
      "photos": ["url1", "url2"],
      "severity": "High",
      "status": "Pending",
      "isAnonymous": false,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

#### Lấy thống kê vi phạm
**Endpoint:** `GET /api/violations/admin/stats`

**Query params:**
```
driverId=64abc...     // Thống kê cho tài xế cụ thể (tùy chọn)
timeRange=30d         // 7d, 30d, 90d
```

---

### 3️⃣ Admin xử lý báo cáo

**Endpoint:** `PUT /api/violations/admin/:violationId/status`

**Payload:**
```json
{
  "status": "Resolved",              // Pending, Investigating, Resolved, Dismissed
  "adminNotes": "Đã xác minh...",   // Ghi chú của admin
  "penalty": 500000,                 // Phạt tiền (VND)
  "warningCount": 1,                 // Số lần cảnh báo
  "banDriver": true,                 // Có cấm tài xế không?
  "banDuration": "30 ngày"           // Thời gian cấm
}
```

**Hành động tự động:**

1. **Nếu có phạt tiền (`penalty > 0`):**
   - Trừ tiền từ `incomeBalance` của tài xế

2. **Nếu cấm tài xế (`banDriver: true`):**
   - Cập nhật `driver.status` = `"Blocked"`
   - Đặt `driver.isOnline` = `false`
   - Gửi email thông báo cho tài xế về lệnh cấm

3. **Nếu xử lý xong (`status: "Resolved"`):**
   - Gửi email cảm ơn khách hàng
   - Thông báo kết quả xử lý

**Response:**
```json
{
  "success": true,
  "message": "Đã cập nhật và cấm tài xế thành công",
  "data": {
    "_id": "64jkl...",
    "status": "Resolved",
    "adminId": "64mno...",
    "adminNotes": "Đã xác minh...",
    "penalty": 500000,
    "warningCount": 1,
    "resolvedAt": "2025-01-15T14:00:00Z"
  }
}
```

---

### 4️⃣ Admin cấm/mở cấm tài xế trực tiếp

#### Cấm tài xế
**Endpoint:** `PUT /api/admin/drivers/:driverId/ban`

**Payload:**
```json
{
  "reason": "Vi phạm nghiêm trọng nhiều lần",
  "duration": "Vĩnh viễn"      // hoặc "30 ngày", "3 tháng"
}
```

**Hành động:**
- Cập nhật `driver.status` = `"Blocked"`
- Đặt `driver.isOnline` = `false`
- Gửi email thông báo cho tài xế

#### Mở cấm tài xế
**Endpoint:** `PUT /api/admin/drivers/:driverId/unban`

**Hành động:**
- Cập nhật `driver.status` = `"Active"`

---

## 📧 Email Templates

### Email thông báo cấm tài xế

**Tiêu đề:** ⚠️ Thông báo tài khoản bị tạm khóa

**Nội dung:**
- Thông báo tài khoản bị tạm khóa
- Lý do cấm
- Thời gian cấm
- Hậu quả của việc bị cấm
- Thông tin liên hệ hỗ trợ (Fanpage, Hotline, Email)

### Email cảm ơn khách hàng

**Tiêu đề:** ✅ Báo cáo của bạn đã được xử lý

**Nội dung:**
- Cảm ơn khách hàng đã báo cáo
- Thông tin về loại vi phạm
- Kết quả xử lý
- Cam kết cải thiện dịch vụ
- Thông tin liên hệ hỗ trợ

---

## 🛡️ Kiểm tra và Validation

### Báo cáo vi phạm
1. ✅ Kiểm tra đơn hàng tồn tại
2. ✅ Kiểm tra quyền sở hữu đơn hàng
3. ✅ Kiểm tra đơn hàng đã hoàn thành
4. ✅ Kiểm tra tài xế tồn tại
5. ✅ Kiểm tra không spam (không báo cáo trùng)

### Xử lý báo cáo
1. ✅ Chỉ Admin mới có quyền xử lý
2. ✅ Validate trạng thái hợp lệ
3. ✅ Tự động gửi email khi cần
4. ✅ Log đầy đủ các hành động

---

## 🔐 Bảo mật

1. **Authentication:** Tất cả API đều yêu cầu xác thực
2. **Authorization:** 
   - Customer chỉ báo cáo được đơn của mình
   - Admin mới có quyền xử lý báo cáo
3. **Rate limiting:** Chống spam báo cáo
4. **Data validation:** Validate đầy đủ input

---

## 📊 Database Schema

### Violation Model
```javascript
{
  reporterId: ObjectId,        // Người báo cáo
  driverId: ObjectId,          // Tài xế bị báo cáo
  orderId: ObjectId,           // Đơn hàng liên quan
  orderItemId: ObjectId,       // Item cụ thể
  violationType: String,       // Loại vi phạm
  description: String,         // Mô tả (maxLength: 1000)
  photos: [String],            // URLs ảnh chứng minh
  severity: String,            // Low, Medium, High, Critical
  status: String,              // Pending, Investigating, Resolved, Dismissed
  adminId: ObjectId,           // Admin xử lý
  adminNotes: String,          // Ghi chú admin
  penalty: Number,             // Tiền phạt (VND)
  warningCount: Number,        // Số lần cảnh báo
  resolvedAt: Date,            // Thời gian xử lý
  isAnonymous: Boolean,        // Báo cáo ẩn danh
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `driverId` - Tìm vi phạm của tài xế
- `reporterId` - Tìm báo cáo của khách hàng
- `orderId` - Tìm vi phạm theo đơn hàng
- `status` - Lọc theo trạng thái
- `violationType` - Lọc theo loại vi phạm

---

## 🧪 Testing

### Test Cases

1. **Báo cáo vi phạm:**
   - ✅ Báo cáo thành công với đầy đủ thông tin
   - ✅ Không cho phép báo cáo đơn chưa hoàn thành
   - ✅ Không cho phép báo cáo đơn không phải của mình
   - ✅ Không cho phép spam báo cáo

2. **Admin xử lý:**
   - ✅ Cập nhật trạng thái thành công
   - ✅ Phạt tiền tài xế chính xác
   - ✅ Cấm tài xế và gửi email
   - ✅ Gửi email cảm ơn khách hàng

3. **Email:**
   - ✅ Email cấm tài xế được gửi đúng
   - ✅ Email cảm ơn khách hàng được gửi đúng
   - ✅ Xử lý lỗi khi không gửi được email

---

## 📝 Logs và Monitoring

### Console Logs
```
✅ Đã gửi email cấm tài xế: driver@example.com
⚠️ Tài xế 64abc... đã bị cấm
✅ Đã gửi email cảm ơn khách hàng: customer@example.com
❌ Lỗi cập nhật báo cáo vi phạm: [error message]
```

### Các sự kiện quan trọng
1. Báo cáo mới được tạo
2. Admin cập nhật trạng thái báo cáo
3. Tài xế bị cấm
4. Tài xế được mở cấm
5. Email được gửi thành công/thất bại

---

## 🔄 Flow Chart

```
Khách hàng
    ↓
Báo cáo vi phạm → Lưu vào DB (status: Pending)
    ↓
Admin xem báo cáo
    ↓
Admin xử lý:
    ├─ Investigating
    ├─ Resolved → Gửi email cảm ơn khách hàng
    │   ├─ Phạt tiền → Trừ incomeBalance
    │   └─ Cấm tài xế → Chuyển status = Blocked
    │                 → Gửi email thông báo
    └─ Dismissed
```

---

## 🚀 Triển khai

### Environment Variables
Đảm bảo có cấu hình email trong `.env`:
```env
EMAIL=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
CLIENT_URL=http://localhost:3000
```

### Khởi động
```bash
npm start
```

---

## 📞 Liên hệ hỗ trợ

- **Fanpage:** https://facebook.com/giaohangdanang
- **Hotline:** 1900-xxxx
- **Email:** support@giaohangdanang.com

---

**Ngày cập nhật:** 2025-01-18
**Phiên bản:** 1.0.0

