# LUỒNG ĐẶT XE TỪ KHÁCH HÀNG ĐẾN TÀI XẾ

## Tổng Quan Luồng Hoạt Động

```
KHÁCH HÀNG ĐẶT XE
       ↓
   Đơn có sẵn (Created)
       ↓
TÀI XẾ NHẬN ĐƠN
       ↓
   Đơn đã nhận (Accepted)
       ↓
TÀI XẾ LẤY HÀNG & GIAO HÀNG
       ↓
   Đơn đang giao (PickedUp/Delivering)
       ↓
TÀI XẾ HOÀN THÀNH
       ↓
   Đã hoàn thành (Delivered)
```

## Chi Tiết Từng Bước

### BƯỚC 1: KHÁCH HÀNG TẠO ĐƠN HÀNG

**File**: `controllers/orderController.js` - Hàm `createOrder()`

**Mô tả**: Khách hàng tạo đơn hàng mới với thông tin:
- Địa chỉ lấy hàng và giao hàng
- Loại xe cần thuê
- Trọng lượng hàng hóa
- Khoảng cách vận chuyển
- Dịch vụ bổ sung (bốc xếp, bảo hiểm)

**Kết quả**:
- Item status: `Created` (Đơn có sẵn)
- Order status: `Created`
- Phát tín hiệu realtime cho tài xế qua Socket.IO

**Hiển thị trên Frontend**:
- Tài xế: Tab "Đơn có sẵn"
- Khách hàng: Tab "Đơn hàng của tôi" với trạng thái "Đang tìm tài xế"

---

### BƯỚC 2: TÀI XẾ NHẬN ĐƠN

**File**: `controllers/orderController.js` - Hàm `acceptOrderItem()`

**Mô tả**: Tài xế chọn đơn từ "Đơn có sẵn" và nhận đơn

**Xử lý Backend**:
1. Tìm driver từ user đã đăng nhập
2. Kiểm tra item phải có status = `Created`
3. Cập nhật:
   - `item.driverId` = ID của tài xế
   - `item.status` = `Accepted`
   - `item.acceptedAt` = thời gian hiện tại
4. Gọi `updateOrderStatus()` để cập nhật trạng thái tổng:
   - Order status: `Created` → `InProgress`

**Hiển thị trên Frontend**:
- Tài xế: Chuyển từ "Đơn có sẵn" sang "Đơn đã nhận"
- Khách hàng: Hiển thị thông tin tài xế đã nhận đơn

---

### BƯỚC 3: TÀI XẾ CẬP NHẬT TRẠNG THÁI

**File**: `controllers/orderController.js` - Hàm `updateOrderItemStatus()`

**Mô tả**: Tài xế cập nhật tiến trình giao hàng

#### 3.1. Đã lấy hàng (PickedUp)
- Item status: `Accepted` → `PickedUp`
- Ghi nhận thời gian `pickedUpAt`
- Order status: `InProgress`

#### 3.2. Đang giao hàng (Delivering)
- Item status: `PickedUp` → `Delivering`
- Order status: `InProgress`

**Hiển thị trên Frontend**:
- Tài xế: Tab "Đơn đang giao"
- Khách hàng: Hiển thị "Đang giao hàng"

---

### BƯỚC 4: HOÀN THÀNH GIAO HÀNG

**File**: `controllers/orderController.js` - Hàm `updateOrderItemStatus()`

**Mô tả**: Tài xế xác nhận đã giao hàng thành công

**Xử lý Backend**:
1. Cập nhật:
   - Item status: `Delivering` → `Delivered`
   - Ghi nhận `deliveredAt`
2. Tạo giao dịch thu nhập cho tài xế:
   - Tính phí hoa hồng (20%)
   - Tạo record trong `DriverTransaction`
   - Cập nhật số dư tài xế
   - Tăng số chuyến hoàn thành
3. Gọi `updateOrderStatus()`:
   - Nếu TẤT CẢ items đều `Delivered` → Order status: `Completed`

**Hiển thị trên Frontend**:
- Tài xế: Tab "Đã hoàn thành"
- Khách hàng: Tab "Đã hoàn thành", có thể đánh giá và báo cáo

---

### BƯỚC 5: HỦY ĐƠN (Tuỳ chọn)

#### 5.1. Khách hàng hủy (chưa có tài xế nhận)
**File**: `controllers/orderController.js` - Hàm `cancelOrder()`
- Chỉ được phép khi TẤT CẢ items có status = `Created`
- Xóa đơn hàng khỏi database

#### 5.2. Tài xế hủy
**File**: `controllers/orderController.js` - Hàm `updateOrderItemStatus()`
- Item status: → `Cancelled`
- Ghi nhận `cancelledAt` và `cancelReason`
- Nếu TẤT CẢ items đều `Cancelled` → Order status: `Cancelled`

**Hiển thị trên Frontend**:
- Tài xế: Tab "Đơn hủy"
- Khách hàng: Tab "Đơn hàng của tôi" với trạng thái "Đã hủy"

---

## Bảng Trạng Thái

### Trạng Thái Item (items[].status)

| Trạng thái | Mô tả | Hiển thị trên FE (Tài xế) | Hiển thị trên FE (Khách) |
|------------|-------|---------------------------|--------------------------|
| `Created` | Mới tạo, chờ tài xế | Đơn có sẵn | Đang tìm tài xế |
| `Accepted` | Tài xế đã nhận | Đơn đã nhận | Đã có tài xế |
| `PickedUp` | Đã lấy hàng | Đơn đang giao | Đang giao hàng |
| `Delivering` | Đang giao hàng | Đơn đang giao | Đang giao hàng |
| `Delivered` | Đã giao xong | Đã hoàn thành | Đã hoàn thành |
| `Cancelled` | Đã hủy | Đơn hủy | Đã hủy |

### Trạng Thái Đơn Hàng Tổng (order.status)

| Trạng thái | Điều kiện |
|------------|-----------|
| `Created` | Chưa có tài xế nhận bất kỳ item nào |
| `InProgress` | Có ít nhất 1 item đang được xử lý (Accepted/PickedUp/Delivering) |
| `Completed` | TẤT CẢ items đều Delivered |
| `Cancelled` | TẤT CẢ items đều Cancelled |

---

## Mapping Frontend Tabs

### Tài xế (Driver Orders)

| Tab Frontend | Trạng thái Query |
|--------------|------------------|
| Đơn có sẵn | `items.status = Created` (không có driverId) |
| Đơn đã nhận | `items.status = Accepted` AND `items.driverId = current driver` |
| Đơn đang giao | `items.status IN [PickedUp, Delivering]` AND `items.driverId = current driver` |
| Đã hoàn thành | `items.status = Delivered` AND `items.driverId = current driver` |
| Đơn hủy | `items.status = Cancelled` AND `items.driverId = current driver` |

### Khách hàng (Customer Orders)

| Tab Frontend | Điều kiện |
|--------------|-----------|
| Tất cả đơn | Lấy tất cả orders của customer |
| Đang tìm tài xế | `order.status = Created` |
| Đang giao | `order.status = InProgress` |
| Đã hoàn thành | `order.status = Completed` |
| Đã hủy | `order.status = Cancelled` |

---

## API Endpoints

### 1. Tạo đơn hàng
```
POST /api/orders
Body: { pickupAddress, dropoffAddress, items, customerNote, paymentMethod }
Response: { success: true, data: order }
```

### 2. Lấy đơn có sẵn (cho tài xế)
```
GET /api/orders/driver/available
Response: { success: true, data: orders[], meta: { page, total } }
```

### 3. Nhận đơn hàng
```
PUT /api/orders/:orderId/items/:itemId/accept
Response: { success: true, data: order }
```

### 4. Cập nhật trạng thái item
```
PUT /api/orders/:orderId/items/:itemId/status
Body: { status: "PickedUp" | "Delivering" | "Delivered" | "Cancelled" }
Response: { success: true, data: order }
```

### 5. Lấy đơn hàng của tài xế
```
GET /api/orders/driver/my-orders?status=Accepted,PickedUp,Delivering
Response: { success: true, data: orders[], meta: { page, total } }
```

### 6. Hủy đơn hàng (khách hàng)
```
DELETE /api/orders/:orderId
Body: { reason: "string" }
Response: { success: true, message: "Đơn hàng đã được hủy" }
```

---

## Realtime Events (Socket.IO)

### Server → Drivers
```javascript
io.to('drivers').emit('order:available:new', {
   orderId,
   pickupAddress,
   dropoffAddress,
   totalPrice,
   createdAt
});
```

**Khi nào**: Khi khách hàng tạo đơn mới
**Mục đích**: Thông báo cho tài xế có đơn mới trong "Đơn có sẵn"

---

## Models Reference

### Order Model
- `customerId`: ID khách hàng
- `pickupAddress`, `dropoffAddress`: Địa chỉ
- `items[]`: Danh sách mục hàng
- `totalPrice`: Tổng giá trị đơn
- `status`: Trạng thái tổng (`Created`, `InProgress`, `Completed`, `Cancelled`)

### Order Item (trong items[])
- `vehicleType`: Loại xe
- `weightKg`: Trọng lượng
- `distanceKm`: Khoảng cách
- `status`: Trạng thái item
- `driverId`: ID tài xế (được gán khi nhận đơn)
- `acceptedAt`, `pickedUpAt`, `deliveredAt`, `cancelledAt`: Timestamps

### Driver Transaction
- `driverId`: ID tài xế
- `orderId`, `orderItemId`: Liên kết đơn hàng
- `amount`: Tổng tiền
- `fee`: Phí hoa hồng (20%)
- `netAmount`: Tiền thực nhận
- `type`: "OrderEarning"
- `status`: "Completed"

---

## Lưu Ý Quan Trọng

1. **Một đơn hàng có nhiều items**: Mỗi item có thể được tài xế khác nhau nhận
2. **Trạng thái tổng tự động**: Order status được tự động cập nhật dựa trên items
3. **Chỉ nhận 1 đơn**: Tài xế chỉ được nhận đơn mới khi không có đơn active
4. **Giao dịch tự động**: Khi hoàn thành, hệ thống tự động tạo giao dịch thu nhập
5. **Hủy đơn có điều kiện**: Khách chỉ hủy được khi chưa có tài xế nhận

---

## Testing Flow

### Test Case 1: Luồng thành công
1. Khách hàng tạo đơn → Kiểm tra status = Created
2. Tài xế nhận đơn → Kiểm tra driverId được gán, status = Accepted
3. Tài xế lấy hàng → status = PickedUp
4. Tài xế giao hàng → status = Delivering
5. Hoàn thành → status = Delivered, tạo transaction

### Test Case 2: Hủy đơn
1. Khách tạo đơn → status = Created
2. Khách hủy đơn → Đơn bị xóa
3. Tài xế nhận → Tài xế hủy → status = Cancelled

### Test Case 3: Nhiều items
1. Tạo đơn với 2 items
2. Tài xế A nhận item 1 → Order status = InProgress
3. Tài xế B nhận item 2 → Order vẫn InProgress
4. Cả 2 hoàn thành → Order status = Completed

