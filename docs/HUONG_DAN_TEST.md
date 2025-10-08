# HƯỚNG DẪN KIỂM TRA HỆ THỐNG ĐẶT XE

## 1. Chuẩn Bị

### Backend
```bash
cd BE_GiaoHangDaNang
npm install
npm start
```

### Frontend
```bash
cd FE_GiaoHangDaNang
npm install
npm run dev
```

## 2. Sửa Dữ Liệu Cũ (Chỉ chạy 1 lần)

Nếu có đơn hàng cũ bị lỗi trạng thái:

```bash
cd BE_GiaoHangDaNang
node scripts/fix-order-status.js
```

Script này sẽ:
- Tìm các đơn có items đã được nhận nhưng order.status vẫn là "Created"
- Cập nhật thành "InProgress"

## 3. Test Luồng Đầy Đủ

### Bước 1: Đăng Nhập Khách Hàng
1. Mở `http://localhost:3000`
2. Đăng nhập với tài khoản khách hàng
3. Vào menu "Đặt xe"

### Bước 2: Tạo Đơn Hàng
1. Nhập địa chỉ lấy hàng và giao hàng
2. Chọn loại xe, trọng lượng, khoảng cách
3. Chọn dịch vụ (bốc xếp, bảo hiểm)
4. Click "Đặt xe"

**Kiểm tra**:
- ✅ Đơn hàng được tạo thành công
- ✅ Trạng thái: "Đang tìm tài xế"
- ✅ Item status trong DB: `Created`
- ✅ Order status trong DB: `Created`

### Bước 3: Tài Xế Nhận Đơn
1. Đăng nhập với tài khoản tài xế
2. Vào menu "Đơn hàng"
3. Chuyển tab "Đơn có sẵn"

**Kiểm tra**:
- ✅ Đơn vừa tạo hiển thị trong "Đơn có sẵn"
- ✅ Thông tin đầy đủ: địa chỉ, loại xe, giá tiền

4. Click "Nhận đơn ngay"

**Kiểm tra Backend Console**:
```
🔄 Đang cập nhật trạng thái tổng của đơn hàng...
🚚 Đơn hàng <orderId> đang được xử lý
✅ Tài xế nhận đơn thành công: { orderId, itemId, driverId, orderStatus: 'InProgress' }
```

**Kiểm tra Database**:
- ✅ Item status: `Created` -> `Accepted`
- ✅ Item driverId: được gán ID tài xế
- ✅ Item acceptedAt: có timestamp
- ✅ **Order status: `Created` -> `InProgress`** (QUAN TRỌNG!)

**Kiểm tra Frontend**:
- ✅ Đơn chuyển từ "Đơn có sẵn" sang "Đơn đã nhận"
- ✅ Tài xế có thể xem chi tiết đơn

### Bước 4: Đơn Đang Giao
1. Tài xế vào tab "Đơn đã nhận"
2. Click "Xem chi tiết"
3. Click "Đã lấy hàng"

**Kiểm tra**:
- ✅ Item status: `Accepted` -> `PickedUp`
- ✅ Item pickedUpAt: có timestamp
- ✅ Đơn hiển thị trong tab "Đơn đang giao"

4. Click "Đang giao hàng"

**Kiểm tra**:
- ✅ Item status: `PickedUp` -> `Delivering`
- ✅ Đơn vẫn hiển thị trong tab "Đơn đang giao"

### Bước 5: Hoàn Thành Đơn
1. Click "Hoàn thành giao hàng"

**Kiểm tra Backend Console**:
```
💰 Đã tạo giao dịch thu nhập cho tài xế: { driverId, amount, netAmount }
🎉 Đơn hàng <orderId> đã hoàn thành tất cả items
✅ Cập nhật trạng thái thành công: Delivered
```

**Kiểm tra Database**:
- ✅ Item status: `Delivering` -> `Delivered`
- ✅ Item deliveredAt: có timestamp
- ✅ Order status: `InProgress` -> `Completed`
- ✅ Có record mới trong `drivertransactions`:
  - amount: tổng tiền
  - fee: 20% hoa hồng
  - netAmount: tiền tài xế nhận
  - type: "OrderEarning"
  - status: "Completed"

**Kiểm tra Frontend**:
- ✅ Đơn chuyển sang tab "Đã hoàn thành"
- ✅ Khách hàng thấy đơn "Đã hoàn thành"
- ✅ Khách hàng có thể đánh giá và báo cáo

## 4. Test Hủy Đơn

### Hủy Bởi Khách Hàng (Chưa Có Tài Xế)
1. Khách hàng tạo đơn mới
2. Vào "Đơn hàng của tôi"
3. Click "Chi tiết" -> "Hủy đơn hàng"

**Kiểm tra**:
- ✅ Đơn bị xóa khỏi database
- ✅ Không hiển thị ở bất kỳ đâu

### Hủy Bởi Tài Xế
1. Tài xế nhận đơn
2. Vào chi tiết đơn
3. Click "Hủy đơn"

**Kiểm tra**:
- ✅ Item status: -> `Cancelled`
- ✅ Item cancelledAt: có timestamp
- ✅ Đơn chuyển sang tab "Đã hủy"
- ✅ Nếu tất cả items hủy -> Order status: `Cancelled`

## 5. Test API Endpoints

### Tạo đơn
```bash
POST http://localhost:8080/api/orders
Headers: Authorization: Bearer <token>
Body:
{
  "pickupAddress": "Cầu vượt Hòa Cầm, Đà Nẵng",
  "dropoffAddress": "Ngũ Hành Sơn, Đà Nẵng",
  "items": [{
    "vehicleType": "TruckMedium",
    "weightKg": 100,
    "distanceKm": 10,
    "loadingService": true,
    "insurance": true
  }],
  "customerNote": "Hàng dễ vỡ",
  "paymentMethod": "Cash"
}
```

### Lấy đơn có sẵn (Tài xế)
```bash
GET http://localhost:8080/api/orders/driver/available
Headers: Authorization: Bearer <driver-token>
```

### Nhận đơn
```bash
PUT http://localhost:8080/api/orders/:orderId/items/:itemId/accept
Headers: Authorization: Bearer <driver-token>
```

**Response phải có**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "status": "InProgress",  // <-- QUAN TRỌNG
    "items": [{
      "status": "Accepted",
      "driverId": "...",
      "acceptedAt": "..."
    }]
  }
}
```

### Lấy đơn của tài xế
```bash
# Đơn đã nhận
GET http://localhost:8080/api/orders/driver/my-orders?status=Accepted

# Đơn đang giao
GET http://localhost:8080/api/orders/driver/my-orders?status=PickedUp,Delivering

# Đã hoàn thành
GET http://localhost:8080/api/orders/driver/my-orders?status=Delivered
```

### Cập nhật trạng thái
```bash
PUT http://localhost:8080/api/orders/:orderId/items/:itemId/status
Headers: Authorization: Bearer <driver-token>
Body:
{
  "status": "PickedUp"  // hoặc "Delivering", "Delivered", "Cancelled"
}
```

## 6. Kiểm Tra Console Logs

### Backend - Khi nhận đơn:
```
🔄 Đang cập nhật trạng thái tổng của đơn hàng...
🚚 Đơn hàng <id> đang được xử lý
✅ Tài xế nhận đơn thành công: { orderId, itemId, driverId, orderStatus: 'InProgress' }
```

### Backend - Khi hoàn thành:
```
💰 Đã tạo giao dịch thu nhập cho tài xế: { driverId, amount, netAmount }
🎉 Đơn hàng <id> đã hoàn thành tất cả items
✅ Cập nhật trạng thái thành công: Delivered
```

### Frontend - Khi fetch đơn:
```
📦 [getDriverOrders] Lấy đơn hàng cho tài xế: { driverId, status, count, total }
```

## 7. Các Vấn Đề Thường Gặp

### Đơn không hiển thị trong "Đơn đã nhận"
**Nguyên nhân**: Order status vẫn là "Created" thay vì "InProgress"

**Giải pháp**:
1. Kiểm tra backend console có log "🔄 Đang cập nhật trạng thái tổng..."
2. Chạy script sửa dữ liệu: `node scripts/fix-order-status.js`
3. Kiểm tra lại database xem order.status đã là "InProgress" chưa

### Đơn không hiển thị trong "Đơn đang giao"
**Nguyên nhân**: Frontend query sai hoặc item status không đúng

**Kiểm tra**:
1. Console Frontend có log "Fetched orders: ..."
2. Database có items với status "PickedUp" hoặc "Delivering"
3. Items có driverId khớp với tài xế đang đăng nhập

### Không tạo được giao dịch thu nhập
**Nguyên nhân**: 
- Item không có priceBreakdown
- Driver không tồn tại

**Kiểm tra**:
1. Console backend có log "💰 Đã tạo giao dịch..."
2. Database collection `drivertransactions` có record mới
3. Driver.incomeBalance và totalTrips được cập nhật

## 8. Checklist Hoàn Chỉnh

- [ ] Khách hàng tạo đơn thành công
- [ ] Đơn hiển thị trong "Đơn có sẵn" của tài xế
- [ ] Tài xế nhận đơn thành công
- [ ] Order status tự động chuyển `Created` -> `InProgress`
- [ ] Đơn hiển thị trong "Đơn đã nhận"
- [ ] Tài xế cập nhật "Đã lấy hàng" thành công
- [ ] Tài xế cập nhật "Đang giao hàng" thành công
- [ ] Đơn hiển thị trong "Đơn đang giao"
- [ ] Tài xế hoàn thành đơn thành công
- [ ] Giao dịch thu nhập được tạo tự động
- [ ] Order status chuyển `InProgress` -> `Completed`
- [ ] Đơn hiển thị trong "Đã hoàn thành"
- [ ] Khách hàng có thể đánh giá và báo cáo
- [ ] Khách hàng có thể hủy đơn (chưa có tài xế)
- [ ] Tài xế có thể hủy đơn
- [ ] Realtime notification hoạt động

## 9. Monitoring

### Logs Quan Trọng Cần Theo Dõi
```
✅ Tạo đơn hàng thành công
📡 Đã phát tín hiệu đơn mới cho tài xế
✅ Tài xế nhận đơn thành công + orderStatus
🚚 Đơn hàng đang được xử lý
💰 Đã tạo giao dịch thu nhập
🎉 Đơn hàng đã hoàn thành
```

### Database Collections Cần Kiểm Tra
- `orders`: status, items.status, items.driverId
- `drivertransactions`: type, status, amount, netAmount
- `drivers`: incomeBalance, totalTrips

---

**Lưu Ý**: 
- Luôn kiểm tra backend console logs khi test
- Kiểm tra database sau mỗi thao tác quan trọng
- Nếu gặp lỗi, xem lại file `docs/LUONG_DAT_XE.md`

