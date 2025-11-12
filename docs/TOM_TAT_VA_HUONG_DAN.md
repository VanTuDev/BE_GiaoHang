# 📋 TÓM TẮT VÀ HƯỚNG DẪN - HỆ THỐNG ĐẶT XE VẬN CHUYỂN

## 🔍 PHÂN TÍCH VẤN ĐỀ

### Vấn Đề Ban Đầu
❌ **"Tài xế không thấy đơn hàng trong các tab"**

### Nguyên Nhân Tìm Ra
✅ **Đơn hàng cũ đã được nhận bởi DRIVER KHÁC!**

```javascript
// Đơn hàng 68e619bcff8b0dbaa6aabfa9
{
  items: [{
    driverId: ObjectId('68c3c4364be93330539717f1'),  // ← Driver A
    status: 'Accepted'
  }]
}

// Tài xế đang đăng nhập
{
  driverId: ObjectId('68cd06add0996c87da56b55e')  // ← Driver B (KHÁC!)
}

// Backend query
query = { 
  'items.driverId': '68cd06add0996c87da56b55e'  // ← Tìm Driver B
}

// Kết quả: KHÔNG TÌM THẤY (vì đơn thuộc Driver A)
```

---

## ✅ GIẢI PHÁP ĐÃ THỰC HIỆN

### 1. Kiểm Tra Logic Code
- ✅ `acceptOrderItem` **ĐÚNG** - Có gán `item.driverId = driver._id`
- ✅ `getDriverOrders` **ĐÚNG** - Query theo `items.driverId`
- ✅ `getAvailableOrders` **ĐÚNG** - Query `items.status = 'Created'`

### 2. Tạo Đơn Hàng Test Mới
```bash
# Đã chạy:
node scripts/create-test-order.js

# Kết quả:
Order ID: 68e62ccb88790c2bd4daa5ed
Status: Created
Item driverId: null  ← Sẵn sàng cho tài xế nhận!
```

---

## 🎯 LOGIC HOẠT ĐỘNG ĐẦY ĐỦ

### LUỒNG 1: KHÁCH HÀNG ĐẶT XE

**Endpoint**: `POST /api/orders`

**Quy trình**:
1. Frontend gửi request với thông tin đơn hàng
2. Backend tính giá cho từng item
3. Tạo Order với:
   - `order.status = "Created"`
   - `items[].status = "Created"`
   - `items[].driverId = null`  ← QUAN TRỌNG!
4. Emit Socket: `order:available:new`
5. Return order cho customer

**Code**:
```javascript
// controllers/orderController.js - createOrder()
const newOrder = new Order({
  customerId: req.user._id,
  pickupAddress: req.body.pickupAddress,
  // ...
  items: calculatedItems.map(item => ({
    ...item,
    status: 'Created',     // ← Mặc định Created
    driverId: null         // ← Chưa có driver
  })),
  status: 'Created'        // ← Order mới
});
```

---

### LUỒNG 2: TÀI XẾ XEM ĐƠN CÓ SẴN

**Endpoint**: `GET /api/orders/driver/available`

**Query MongoDB**:
```javascript
{
  'items.status': 'Created',
  'items.driverId': null
}
```

**Frontend Tab**: "Đơn có sẵn"

**Hiển thị**: Tất cả đơn chưa có tài xế nhận

---

### LUỒNG 3: TÀI XẾ NHẬN ĐƠN

**Endpoint**: `PUT /api/orders/:orderId/items/:itemId/accept`

**Quy trình**:
1. Tìm driver từ `req.user._id`
2. Tìm order và item
3. Kiểm tra `item.status === 'Created'`
4. **GÁN DRIVER**: `item.driverId = driver._id` ← KEY!
5. Cập nhật `item.status = 'Accepted'`
6. Cập nhật `item.acceptedAt = new Date()`
7. Cập nhật `order.status = 'InProgress'`
8. Emit Socket: `order:accepted`
9. Return order đã populate

**Code**:
```javascript
// controllers/orderController.js - acceptOrderItem()
const driver = await Driver.findOne({ userId: req.user._id });

const item = order.items.id(itemId);

if (item.status !== 'Created') {
  return res.status(400).json({ message: 'Đã được nhận' });
}

// ← QUAN TRỌNG NHẤT: GÁN DRIVER!
item.driverId = driver._id;
item.status = 'Accepted';
item.acceptedAt = new Date();

await order.save();

// Cập nhật order status
await updateOrderStatus(orderId);
```

---

### LUỒNG 4: TÀI XẾ XEM ĐƠN ĐÃ NHẬN

**Endpoint**: `GET /api/orders/driver/my-orders?status=Accepted`

**Query MongoDB**:
```javascript
{
  'items.driverId': driver._id,         // ← Chỉ lấy đơn của driver này
  'items.status': { $in: ['Accepted'] }
}
```

**Frontend Tab**: "Đơn đã nhận"

**Hiển thị**: Đơn tài xế vừa nhận, chưa lấy hàng

**Code**:
```javascript
// controllers/orderController.js - getDriverOrders()
const driver = await Driver.findOne({ userId: req.user._id });

const query = { 'items.driverId': driver._id };

if (status) {
  const statusArray = status.split(',');
  query['items.status'] = { $in: statusArray };
}

const orders = await Order.find(query)
  .populate('customerId')
  .populate({
    path: 'items.driverId',
    populate: { path: 'userId' }
  });

console.log(`📦 Driver: ${driver._id}, Status: ${status}, Count: ${orders.length}`);
```

---

### LUỒNG 5: TÀI XẾ CẬP NHẬT TRẠNG THÁI

**Endpoint**: `PUT /api/orders/:orderId/items/:itemId/status`

**Body**: `{ status: "PickedUp" | "Delivering" | "Delivered" }`

**Quy trình**:
1. Tìm driver từ `req.user._id`
2. Tìm order và item
3. Kiểm tra quyền: `item.driverId === driver._id`
4. Cập nhật status và timestamp
5. Nếu `Delivered`:
   - Tạo giao dịch thu nhập (DriverTransaction)
   - Cập nhật `driver.balance`
   - Kiểm tra tất cả items đã delivered → `order.status = 'Completed'`
6. Emit Socket: `order:updated`

**Frontend Tabs**:
- `PickedUp, Delivering` → "Đơn đang giao"
- `Delivered` → "Đã hoàn thành"

---

## 📊 MAPPING TRẠNG THÁI ↔ TABS

### Backend Item Status → Frontend Tab

| Item Status | Frontend Tab | Query |
|------------|--------------|-------|
| `Created` (driverId=null) | Đơn có sẵn | `status=Created&driverId=null` |
| `Accepted` | Đơn đã nhận | `status=Accepted&driverId=driver._id` |
| `PickedUp` | Đơn đang giao | `status=PickedUp&driverId=driver._id` |
| `Delivering` | Đơn đang giao | `status=Delivering&driverId=driver._id` |
| `Delivered` | Đã hoàn thành | `status=Delivered&driverId=driver._id` |
| `Cancelled` | Đã hủy | `status=Cancelled&driverId=driver._id` |

### Frontend Tabs → API Calls

```javascript
// FE_GiaoHangDaNang/src/pages/driver/Orders.jsx

const fetchOrders = async () => {
  if (activeTab === 'available') {
    // Đơn có sẵn
    const response = await orderService.getAvailableOrders();
  } else {
    // Các tab khác
    const statusMap = {
      'active': 'Accepted,PickedUp,Delivering',  // Đơn đang giao
      'received': 'Accepted',                    // Đơn đã nhận
      'completed': 'Delivered',                  // Đã hoàn thành
      'cancelled': 'Cancelled'                   // Đã hủy
    };
    
    const status = statusMap[activeTab];
    const response = await orderService.getDriverOrders({ status });
  }
};
```

---

## 🧪 HƯỚNG DẪN TEST

### Bước 1: Đăng Nhập Tài Xế

**Tìm user có driver._id = `68cd06add0996c87da56b55e`**:

```bash
node -e "import('mongoose').then(async (m) => { await m.default.connect('mongodb://localhost:27017/giaohang'); const Driver = (await import('./models/driver.model.js')).default; const User = (await import('./models/user.model.js')).default; const driver = await Driver.findById('68cd06add0996c87da56b55e'); const user = await User.findById(driver.userId); console.log('User Phone:', user.phone); console.log('User Email:', user.email); process.exit(0); })"
```

### Bước 2: Test Tab "Đơn Có Sẵn"

1. Vào `/driver/orders`
2. Click tab **"Đơn có sẵn"**
3. PHẢI THẤY đơn `68e62ccb88790c2bd4daa5ed`
4. Kiểm tra:
   - ✅ Địa chỉ: "123 Nguyễn Văn Linh → 456 Hoàng Văn Thụ"
   - ✅ Loại xe: "TruckSmall"
   - ✅ Giá: 125,000 VNĐ
   - ✅ Nút "Nhận đơn" hiển thị

### Bước 3: Nhận Đơn

1. Click **"Nhận đơn"**
2. Kiểm tra Backend Console:
   ```
   🔄 Đang cập nhật trạng thái tổng của đơn hàng...
   🚚 Đơn hàng 68e62ccb88790c2bd4daa5ed đang được xử lý
   ✅ Tài xế nhận đơn thành công: { 
     orderId: '68e62ccb88790c2bd4daa5ed',
     driverId: '68cd06add0996c87da56b55e',
     orderStatus: 'InProgress'
   }
   ```
3. Kiểm tra database:
   ```bash
   node -e "import('mongoose').then(async (m) => { await m.default.connect('mongodb://localhost:27017/giaohang'); const Order = (await import('./models/order.model.js')).default; const o = await Order.findById('68e62ccb88790c2bd4daa5ed'); console.log('Order Status:', o.status); console.log('Item Status:', o.items[0].status); console.log('Item DriverId:', o.items[0].driverId); process.exit(0); })"
   ```
   **Kết quả mong đợi**:
   ```
   Order Status: InProgress
   Item Status: Accepted
   Item DriverId: 68cd06add0996c87da56b55e  ← PHẢI KHỚP!
   ```

### Bước 4: Test Tab "Đơn Đã Nhận"

1. Click tab **"Đơn đã nhận"**
2. PHẢI THẤY đơn `68e62ccb88790c2bd4daa5ed`
3. Kiểm tra Backend Console:
   ```
   📦 [getDriverOrders] Driver: 68cd06add0996c87da56b55e, Status: Accepted, Count: 1
   ```
4. Kiểm tra Frontend Console:
   ```javascript
   [API RESPONSE] {
     url: '/api/orders/driver/my-orders?status=Accepted',
     status: 200,
     data: { success: true, data: [{ _id: '68e62ccb88790c2bd4daa5ed', ... }] }
   }
   Fetched orders: [{ _id: '68e62ccb88790c2bd4daa5ed', ... }]
   ```
5. Nút **"Đã lấy hàng"** hiển thị

### Bước 5: Cập Nhật "Đã Lấy Hàng"

1. Click **"Đã lấy hàng"**
2. API call: `PUT /api/orders/68e62ccb88790c2bd4daa5ed/items/{itemId}/status`
3. Body: `{ status: "PickedUp" }`
4. Item chuyển sang `status: "PickedUp"`

### Bước 6: Test Tab "Đơn Đang Giao"

1. Click tab **"Đơn đang giao"**
2. PHẢI THẤY đơn `68e62ccb88790c2bd4daa5ed`
3. Query: `status=PickedUp,Delivering`
4. Nút **"Đang giao hàng"** hiển thị

### Bước 7: Cập Nhật "Đang Giao Hàng"

1. Click **"Đang giao hàng"**
2. Item chuyển sang `status: "Delivering"`
3. Đơn vẫn ở tab "Đơn đang giao"

### Bước 8: Cập Nhật "Đã Giao Hàng"

1. Click **"Đã giao hàng"**
2. Backend:
   - Item chuyển sang `status: "Delivered"`
   - Tạo DriverTransaction (thu nhập)
   - Cập nhật `driver.balance += netAmount`
   - Order chuyển sang `status: "Completed"`
3. Kiểm tra giao dịch:
   ```bash
   node -e "import('mongoose').then(async (m) => { await m.default.connect('mongodb://localhost:27017/giaohang'); const DriverTransaction = (await import('./models/driverTransaction.model.js')).default; const txn = await DriverTransaction.findOne({ orderId: '68e62ccb88790c2bd4daa5ed' }); console.log('Transaction:', txn); process.exit(0); })"
   ```

### Bước 9: Test Tab "Đã Hoàn Thành"

1. Click tab **"Đã hoàn thành"**
2. PHẢI THẤY đơn `68e62ccb88790c2bd4daa5ed`
3. Hiển thị:
   - ✅ Thông tin đơn hàng
   - ✅ Thu nhập: 100,000 VNĐ (80% của 125,000)
   - ✅ Hoa hồng: 25,000 VNĐ (20%)
   - ✅ Thời gian hoàn thành

---

## 🐛 DEBUG CHECKLIST

Nếu vẫn không thấy đơn, kiểm tra:

### 1. Backend Running
```bash
# Check port
netstat -ano | findstr :8080

# Check logs
# Phải thấy: ✅ Server đang chạy ở cổng 8080
```

### 2. Frontend Proxy
```javascript
// FE_GiaoHangDaNang/vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:8080',  // ← PHẢI KHỚP VỚI BACKEND PORT!
  }
}
```

### 3. Driver ID Match
```bash
# Lấy driver ID của user đang đăng nhập
node scripts/check-order.js

# So sánh với backend logs:
📦 [getDriverOrders] Driver: <ID>, ...

# Phải KHỚP!
```

### 4. Item Has DriverId
```bash
# Kiểm tra item trong database
node -e "import('mongoose').then(async (m) => { await m.default.connect('mongodb://localhost:27017/giaohang'); const Order = (await import('./models/order.model.js')).default; const o = await Order.findById('<ORDER_ID>'); console.log('Item DriverId:', o.items[0].driverId); process.exit(0); })"

# Phải KHÔNG NULL và KHỚP với driver đang đăng nhập!
```

### 5. Frontend Console
```javascript
// Phải thấy:
[API RESPONSE] { data: { success: true, data: [...] } }
Fetched orders: [...]
Rendering orders for tab: <TAB>
Orders: [...]  // ← Phải có data!
```

### 6. Network Tab
- Status: 200 (KHÔNG PHẢI 304!)
- Response: `{ success: true, data: [...] }`
- Request Headers: `Authorization: Bearer <token>`

---

## 📚 FILES QUAN TRỌNG

### Backend
1. **`controllers/orderController.js`**
   - `createOrder()` - Tạo đơn
   - `acceptOrderItem()` - Nhận đơn ← GÁN driverId
   - `getDriverOrders()` - Lấy đơn của driver
   - `getAvailableOrders()` - Đơn có sẵn
   - `updateOrderItemStatus()` - Cập nhật trạng thái

2. **`models/order.model.js`**
   - `items[].driverId` - Link đến Driver
   - `items[].status` - Trạng thái item
   - `order.status` - Trạng thái tổng

3. **`routes/orderRoutes.js`**
   - API routes và middleware

### Frontend
1. **`src/pages/driver/Orders.jsx`**
   - 5 tabs quản lý đơn hàng
   - `fetchOrders()` - Gọi API
   - `renderOrders()` - Hiển thị

2. **`src/features/orders/api/orderService.js`**
   - `getDriverOrders()` - API call
   - `getAvailableOrders()` - API call
   - `acceptItem()` - Nhận đơn

### Scripts
1. **`scripts/create-test-order.js`** - Tạo đơn test
2. **`scripts/check-order.js`** - Kiểm tra đơn
3. **`scripts/fix-order-status.js`** - Sửa status

---

## ✅ TÓM TẮT NHANH

1. **Đơn hàng cũ thuộc driver khác** → Tạo đơn mới
2. **Code đã ĐÚNG** → Không cần sửa logic
3. **Đã tạo đơn test** → Order ID: `68e62ccb88790c2bd4daa5ed`
4. **Test theo hướng dẫn** → Đảm bảo từng bước đúng
5. **Kiểm tra `driverId` luôn được gán** khi nhận đơn

---

## 🚀 NEXT STEPS

1. ✅ Làm theo **HƯỚNG DẪN TEST** từ Bước 1-9
2. ✅ Verify từng API call qua Network tab
3. ✅ Check Backend logs cho mỗi action
4. ✅ Đảm bảo `driverId` luôn khớp trong database

**Nếu vẫn có vấn đề, cung cấp**:
- Backend console logs (khi fetch orders)
- Frontend console logs (API response)
- Database screenshot (đơn hàng sau khi nhận)
- Network tab screenshot (request/response)

