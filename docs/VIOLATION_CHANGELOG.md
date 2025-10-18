# 📝 CHANGELOG - HỆ THỐNG BÁO CÁO VI PHẠM

## 🎯 Tổng quan thay đổi

Đã hoàn thiện hệ thống báo cáo vi phạm tài xế với đầy đủ chức năng:
- ✅ Khách hàng báo cáo vi phạm
- ✅ Admin xem và quản lý báo cáo
- ✅ Admin cấm/mở cấm tài xế
- ✅ Tự động gửi email thông báo

---

## 📂 Files đã thay đổi

### 1. `utils/emailService.js` ✅ HOÀN THÀNH

**Thêm mới:**

#### `sendDriverBannedEmail(email, name, reason, banDuration)`
Gửi email thông báo tài xế bị cấm

**Tham số:**
- `email`: Email tài xế
- `name`: Tên tài xế
- `reason`: Lý do cấm
- `banDuration`: Thời gian cấm

**Nội dung email:**
- Thông báo tài khoản bị tạm khóa
- Lý do và thời gian cấm
- Hậu quả của việc bị cấm
- Thông tin liên hệ hỗ trợ (Fanpage, Hotline, Email)

#### `sendReportResolvedEmail(email, customerName, violationType, resolution)`
Gửi email cảm ơn khách hàng sau khi xử lý báo cáo

**Tham số:**
- `email`: Email khách hàng
- `customerName`: Tên khách hàng
- `violationType`: Loại vi phạm
- `resolution`: Kết quả xử lý

**Nội dung email:**
- Cảm ơn khách hàng đã báo cáo
- Thông tin về loại vi phạm và kết quả xử lý
- Cam kết cải thiện dịch vụ
- Link đến trang đơn hàng
- Thông tin liên hệ hỗ trợ

---

### 2. `controllers/violationController.js` ✅ HOÀN THÀNH

**Import thêm:**
```javascript
import User from '../models/user.model.js';
import { sendDriverBannedEmail, sendReportResolvedEmail } from '../utils/emailService.js';
```

**Cập nhật hàm `updateViolationStatus()`:**

**Tham số mới:**
- `banDriver`: boolean - Có cấm tài xế không?
- `banDuration`: string - Thời gian cấm

**Chức năng bổ sung:**

1. **Cấm tài xế (nếu `banDriver: true`):**
   ```javascript
   // Cập nhật trạng thái driver
   driver.status = 'Blocked';
   driver.isOnline = false;
   await driver.save();
   
   // Gửi email thông báo
   await sendDriverBannedEmail(
      driver.userId.email,
      driver.userId.name,
      banReason,
      banDuration
   );
   ```

2. **Gửi email cảm ơn khách hàng (nếu `status: "Resolved"`):**
   ```javascript
   await sendReportResolvedEmail(
      violation.reporterId.email,
      violation.reporterId.name,
      violation.violationType,
      resolutionMessage
   );
   ```

3. **Populate thêm dữ liệu:**
   ```javascript
   .populate('driverId', 'userId')
   .populate('reporterId', 'name email');
   ```

4. **Response thông báo:**
   ```javascript
   return res.json({ 
      success: true, 
      data: violation,
      message: banDriver 
         ? 'Đã cập nhật và cấm tài xế thành công' 
         : 'Đã cập nhật báo cáo thành công'
   });
   ```

**Console logs:**
```javascript
console.log(`✅ Đã gửi email cấm tài xế: ${driver.userId.email}`);
console.log(`⚠️ Tài xế ${driver._id} đã bị cấm`);
console.log(`✅ Đã gửi email cảm ơn khách hàng: ${violation.reporterId.email}`);
console.error('❌ Lỗi cập nhật báo cáo vi phạm:', error);
```

---

### 3. `controllers/adminController.js` ✅ HOÀN THÀNH

**Import thêm:**
```javascript
import { sendDriverBannedEmail } from '../utils/emailService.js';
```

**Thêm 2 hàm mới:**

#### `banDriver(req, res)`
Admin cấm tài xế trực tiếp

**Endpoint:** `PUT /api/admin/drivers/:driverId/ban`

**Tham số:**
- `driverId`: ID tài xế (từ URL params)
- `reason`: Lý do cấm (từ body)
- `duration`: Thời gian cấm (từ body)

**Chức năng:**
1. Tìm driver và populate userId
2. Cập nhật `status = 'Blocked'` và `isOnline = false`
3. Gửi email thông báo cho tài xế
4. Log hành động

**Response:**
```json
{
  "success": true,
  "message": "Đã cấm tài xế thành công",
  "data": { /* driver object */ }
}
```

#### `unbanDriver(req, res)`
Admin mở cấm tài xế

**Endpoint:** `PUT /api/admin/drivers/:driverId/unban`

**Chức năng:**
1. Kiểm tra driver có bị cấm không
2. Cập nhật `status = 'Active'`
3. Log hành động

**Response:**
```json
{
  "success": true,
  "message": "Đã mở cấm tài xế thành công",
  "data": { /* driver object */ }
}
```

---

### 4. `routes/adminRoutes.js` ✅ HOÀN THÀNH

**Import thêm:**
```javascript
import {
   // ... existing imports
   banDriver,
   unbanDriver
} from '../controllers/adminController.js';
```

**Routes mới:**
```javascript
// Cấm/Mở cấm tài xế
router.put('/drivers/:driverId/ban', banDriver);
router.put('/drivers/:driverId/unban', unbanDriver);
```

---

### 5. `docs/VIOLATION_REPORT_SYSTEM.md` ✅ MỚI

Tài liệu đầy đủ về hệ thống báo cáo vi phạm, bao gồm:
- Tổng quan và luồng hoạt động
- Chi tiết các API endpoints
- Email templates
- Validation và bảo mật
- Database schema
- Testing guidelines
- Flow chart

---

## 🔄 API Endpoints

### Endpoints hiện có (đã cập nhật)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/violations/report` | Customer | Báo cáo vi phạm |
| GET | `/api/violations/my-reports` | Customer | Lấy báo cáo của mình |
| GET | `/api/violations/admin/all` | Admin | Lấy tất cả báo cáo |
| **PUT** | `/api/violations/admin/:violationId/status` | Admin | **Xử lý báo cáo (ĐÃ CẬP NHẬT)** |
| GET | `/api/violations/admin/stats` | Admin | Thống kê vi phạm |

### Endpoints mới

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| **PUT** | `/api/admin/drivers/:driverId/ban` | Admin | **Cấm tài xế** |
| **PUT** | `/api/admin/drivers/:driverId/unban` | Admin | **Mở cấm tài xế** |

---

## 📧 Email Notifications

### 1. Email cấm tài xế

**Kích hoạt khi:**
- Admin xử lý báo cáo với `banDriver: true`
- Admin cấm tài xế trực tiếp

**Thông tin gửi:**
- Thông báo tài khoản bị khóa
- Lý do cấm
- Thời gian cấm
- Hậu quả
- Thông tin liên hệ hỗ trợ

### 2. Email cảm ơn khách hàng

**Kích hoạt khi:**
- Admin xử lý báo cáo với status `Resolved`

**Thông tin gửi:**
- Cảm ơn đã báo cáo
- Loại vi phạm đã báo cáo
- Kết quả xử lý
- Cam kết cải thiện
- Thông tin liên hệ hỗ trợ

---

## 🛠️ Cách sử dụng

### 1. Xử lý báo cáo và cấm tài xế

```bash
PUT /api/violations/admin/64abc123/status
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "status": "Resolved",
  "adminNotes": "Xác minh tài xế giao hàng trễ 3 giờ, thái độ không tốt",
  "penalty": 500000,
  "warningCount": 2,
  "banDriver": true,
  "banDuration": "30 ngày"
}
```

**Kết quả:**
- Báo cáo được đánh dấu đã xử lý
- Tài xế bị phạt 500,000 VND
- Tài xế bị cấm 30 ngày
- Email thông báo gửi cho tài xế
- Email cảm ơn gửi cho khách hàng

### 2. Cấm tài xế trực tiếp

```bash
PUT /api/admin/drivers/64def456/ban
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "reason": "Vi phạm nghiêm trọng nhiều lần",
  "duration": "Vĩnh viễn"
}
```

### 3. Mở cấm tài xế

```bash
PUT /api/admin/drivers/64def456/unban
Authorization: Bearer <admin_token>
```

---

## 🧪 Testing

### Test báo cáo và cấm tài xế

1. **Tạo báo cáo:**
   ```bash
   POST /api/violations/report
   # Với đơn hàng đã hoàn thành
   ```

2. **Admin xử lý và cấm:**
   ```bash
   PUT /api/violations/admin/:violationId/status
   # Với banDriver: true
   ```

3. **Kiểm tra:**
   - Driver status = "Blocked"
   - Driver isOnline = false
   - Email đã được gửi
   - Console logs hiển thị đúng

4. **Mở cấm:**
   ```bash
   PUT /api/admin/drivers/:driverId/unban
   ```

5. **Kiểm tra:**
   - Driver status = "Active"

---

## 📊 Database Changes

### Violation Model (không thay đổi)
- Tất cả fields đã có sẵn từ trước
- Không cần migration

### Driver Model (không thay đổi)
- `status` field đã hỗ trợ "Blocked"
- `isOnline` field đã có sẵn

---

## 🔒 Security & Validation

### Authorization
- ✅ Chỉ Customer có thể báo cáo
- ✅ Chỉ Admin có thể xử lý báo cáo
- ✅ Chỉ Admin có thể cấm/mở cấm tài xế

### Validation
- ✅ Kiểm tra đơn hàng đã hoàn thành
- ✅ Kiểm tra quyền sở hữu đơn hàng
- ✅ Kiểm tra không spam báo cáo
- ✅ Validate input data

### Error Handling
- ✅ Try-catch cho tất cả async functions
- ✅ Detailed error messages
- ✅ Console logs cho debugging

---

## 📝 Notes

### Quan trọng
1. **Email configuration:** Cần cấu hình EMAIL và EMAIL_PASSWORD trong `.env`
2. **Test mode:** Nếu không có email config, hệ thống sẽ chỉ log ra console
3. **Driver status:** Tài xế bị cấm sẽ không thể:
   - Nhận đơn hàng mới
   - Truy cập chức năng tài xế
   - Đăng nhập vào hệ thống tài xế

### Cải tiến trong tương lai
- [ ] Tự động mở cấm sau thời gian cấm
- [ ] Hệ thống điểm vi phạm tích lũy
- [ ] Dashboard thống kê vi phạm
- [ ] Thông báo realtime cho tài xế
- [ ] Appeal system (khiếu nại)

---

**Người thực hiện:** AI Assistant  
**Ngày hoàn thành:** 2025-01-18  
**Phiên bản:** 1.0.0  
**Status:** ✅ HOÀN THÀNH

