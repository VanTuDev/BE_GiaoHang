# LOGIC ĐẶT XE VẬN CHUYỂN - THIẾT KẾ LẠI

## 🎯 Mục Tiêu
Thiết kế lại toàn bộ luồng đặt xe từ khách hàng đến tài xế với logic rõ ràng, dễ debug.

---

## 📊 LUỒNG HOẠT ĐỘNG

```
KHÁCH HÀNG                    HỆ THỐNG                    TÀI XẾ
    |                             |                          |
    | 1. Đặt xe                   |                          |
    |-------------------------->  |                          |
    |                             |                          |
    |                        [TẠO ĐƠN]                       |
    |                      Order.status = "Created"          |
    |                      Item.status = "Created"           |
    |                      Item.driverId = null              |
    |                             |                          |
    |                             | Socket: 'new_order'      |
    |                             |------------------------->|
    |                             |                          |
    |                             |      2. Tài xế xem đơn   |
    |                             |      "Đơn có sẵn"        |
    |                             |<-------------------------|
    |                             |                          |
    |                             |      3. Tài xế nhận đơn  |
    |                             |<-------------------------|
    |                             |                          |
    |                      [CẬP NHẬT]                        |
    |                   Item.status = "Accepted"             |
    |                   Item.driverId = driver._id ← KEY!    |
    |                   Order.status = "InProgress"          |
    |                             |                          |
    |    Socket: 'order_accepted' |                          |
    |<----------------------------|                          |
    |                             |                          |
    |                             |     4. "Đơn đã nhận"     |
    |                             |     Tài xế thấy đơn      |
    |                             |                          |
    |                             |   5. Tài xế lấy hàng     |
    |                             |<-------------------------|
    |                             |                          |
    |                      Item.status = "PickedUp"          |
    |                             |                          |
    |                             |                          |
    |                             |   6. "Đơn đang giao"     |
    |                             |     Đang vận chuyển      |
    |                             |<-------------------------|
    |                             |                          |
    |                      Item.status = "Delivering"        |
    |                             |                          |
    |                             |                          |
    |                             |   7. Giao hàng xong      |
    |                             |<-------------------------|
    |                             |                          |
    |                      Item.status = "Delivered"         |
    |                      Order.status = "Completed"        |
    |                      [TẠO GIAO DỊCH THU NHẬP]          |
    |                             |                          |
    | 8. Đánh giá & Báo cáo       |                          |
    |-------------------------->  |                          |
```

---

## 🗂️ CẤU TRÚC DỮ LIỆU

### Order Schema
```javascript
{
  _id: ObjectId,
  customerId: ObjectId(User),
  
  // Địa chỉ
  pickupAddress: String,
  dropoffAddress: String,
  
  // Danh sách items (có thể nhiều loại xe)
  items: [
    {
      _id: ObjectId,  // Item ID
      vehicleType: String,
      weightKg: Number,
      distanceKm: Number,
      
      // QUAN TRỌNG: Tài xế nhận item này
      driverId: ObjectId(Driver) | null,
      
      // Trạng thái của ITEM (không phải Order)
      status: "Created" | "Accepted" | "PickedUp" | "Delivering" | "Delivered" | "Cancelled",
      
      // Timestamps
      acceptedAt: Date,
      pickedUpAt: Date,
      deliveredAt: Date,
      
      priceBreakdown: { ... }
    }
  ],
  
  // Trạng thái TỔNG của đơn hàng
  status: "Created" | "InProgress" | "Completed" | "Cancelled",
  
  totalPrice: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Driver Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId(User),  // Link đến User collection
  vehicleType: String,
  rating: Number,
  totalTrips: Number,
  balance: Number,
  isOnline: Boolean
}
```

---

## 🔧 API ENDPOINTS

### 1. Khách Hàng Đặt Xe
**POST** `/api/orders`

```javascript
// Request Body
{
  pickupAddress: "...",
  dropoffAddress: "...",
  items: [
    {
      vehicleType: "Xe tải nhỏ",
      weightKg: 500,
      distanceKm: 10,
      loadingService: true,
      insurance: false
    }
  ],
  customerNote: "Hàng dễ vỡ"
}

// Response
{
  success: true,
  data: {
    _id: "...",
    status: "Created",
    items: [
      {
        _id: "...",
        status: "Created",
        driverId: null  // ← Chưa có tài xế
      }
    ]
  }
}
```

**Controller Logic**:
```javascript
export const createOrder = async (req, res) => {
  // 1. Tính giá cho từng item
  // 2. Tạo Order với status = "Created"
  // 3. Items có status = "Created", driverId = null
  // 4. Emit Socket: 'order:available:new'
  // 5. Return order
};
```

---

### 2. Tài Xế Xem Đơn Có Sẵn
**GET** `/api/orders/driver/available`

```javascript
// Response
{
  success: true,
  data: [
    {
      _id: "...",
      customerId: { name: "...", phone: "..." },
      pickupAddress: "...",
      dropoffAddress: "...",
      items: [
        {
          _id: "...",
          vehicleType: "Xe tải nhỏ",
          status: "Created",  // ← Chưa có ai nhận
          driverId: null
        }
      ]
    }
  ]
}
```

**Controller Logic**:
```javascript
export const getAvailableOrders = async (req, res) => {
  // Query: items có status = "Created" AND driverId = null
  const orders = await Order.find({
    'items.status': 'Created',
    'items.driverId': null
  })
  .populate('customerId', 'name phone avatarUrl')
  .sort({ createdAt: -1 });
  
  return res.json({ success: true, data: orders });
};
```

---

### 3. Tài Xế Nhận Đơn
**PUT** `/api/orders/:orderId/items/:itemId/accept`

```javascript
// Response
{
  success: true,
  data: {
    _id: "...",
    status: "InProgress",  // ← Order status đã thay đổi
    items: [
      {
        _id: "...",
        status: "Accepted",  // ← Item status
        driverId: "68cd06add0996c87da56b55e",  // ← GÁN TÀI XẾ
        acceptedAt: "2025-10-08T10:00:00Z"
      }
    ]
  }
}
```

**Controller Logic**:
```javascript
export const acceptOrderItem = async (req, res) => {
  const { orderId, itemId } = req.params;
  
  // 1. Tìm driver từ req.user._id
  const driver = await Driver.findOne({ userId: req.user._id });
  
  // 2. Tìm order và item
  const order = await Order.findById(orderId);
  const item = order.items.id(itemId);
  
  // 3. Kiểm tra item phải là "Created"
  if (item.status !== 'Created') {
    return res.status(400).json({ message: 'Item đã được nhận' });
  }
  
  // 4. GÁN DRIVER CHO ITEM ← QUAN TRỌNG NHẤT!
  item.driverId = driver._id;
  item.status = 'Accepted';
  item.acceptedAt = new Date();
  
  // 5. Cập nhật order status
  order.status = 'InProgress';
  
  await order.save();
  
  // 6. Emit socket
  io.to(`customer_${order.customerId}`).emit('order:accepted', order);
  
  // 7. Populate và return
  const updatedOrder = await Order.findById(orderId)
    .populate('customerId')
    .populate({
      path: 'items.driverId',
      populate: { path: 'userId' }
    });
  
  return res.json({ success: true, data: updatedOrder });
};
```

---

### 4. Tài Xế Xem Đơn Đã Nhận
**GET** `/api/orders/driver/my-orders?status=Accepted`

```javascript
// Response
{
  success: true,
  data: [
    {
      _id: "...",
      customerId: { name: "...", phone: "..." },
      items: [
        {
          _id: "...",
          status: "Accepted",
          driverId: {
            _id: "68cd06add0996c87da56b55e",  // ← Khớp với driver đang đăng nhập
            userId: { name: "...", phone: "..." }
          }
        }
      ]
    }
  ]
}
```

**Controller Logic**:
```javascript
export const getDriverOrders = async (req, res) => {
  const { status } = req.query;  // VD: "Accepted" hoặc "PickedUp,Delivering"
  
  // 1. Tìm driver
  const driver = await Driver.findOne({ userId: req.user._id });
  
  // 2. Query: items có driverId = driver._id AND status khớp
  const query = { 'items.driverId': driver._id };
  
  if (status) {
    const statusArray = status.split(',');
    query['items.status'] = { $in: statusArray };
  }
  
  // 3. Tìm orders
  const orders = await Order.find(query)
    .populate('customerId', 'name phone avatarUrl')
    .populate({
      path: 'items.driverId',
      populate: { path: 'userId', select: 'name phone avatarUrl' }
    })
    .sort({ createdAt: -1 });
  
  console.log(`📦 [getDriverOrders] Driver: ${driver._id}, Status: ${status}, Count: ${orders.length}`);
  
  return res.json({ success: true, data: orders });
};
```

---

### 5. Tài Xế Cập Nhật Trạng Thái
**PUT** `/api/orders/:orderId/items/:itemId/status`

```javascript
// Request Body
{
  status: "PickedUp" | "Delivering" | "Delivered"
}

// Response
{
  success: true,
  data: { /* updated order */ }
}
```

**Controller Logic**:
```javascript
export const updateOrderItemStatus = async (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;
  
  // 1. Tìm driver
  const driver = await Driver.findOne({ userId: req.user._id });
  
  // 2. Tìm order và item
  const order = await Order.findById(orderId);
  const item = order.items.id(itemId);
  
  // 3. Kiểm tra quyền (chỉ driver của item mới cập nhật được)
  if (String(item.driverId) !== String(driver._id)) {
    return res.status(403).json({ message: 'Không có quyền' });
  }
  
  // 4. Cập nhật status
  item.status = status;
  
  if (status === 'PickedUp') {
    item.pickedUpAt = new Date();
  } else if (status === 'Delivered') {
    item.deliveredAt = new Date();
    
    // Tạo giao dịch thu nhập
    await createDriverTransaction(driver._id, order._id, item._id, item.priceBreakdown.total);
    
    // Cập nhật order status nếu tất cả items đã delivered
    const allDelivered = order.items.every(i => i.status === 'Delivered');
    if (allDelivered) {
      order.status = 'Completed';
    }
  }
  
  await order.save();
  
  // 5. Emit socket
  io.to(`customer_${order.customerId}`).emit('order:updated', order);
  
  return res.json({ success: true, data: order });
};
```

---

## 🎨 FRONTEND - TAB PHÂN LOẠI

### Tài Xế - 5 Tabs

#### 1. **Đơn có sẵn** (Available Orders)
- **Query**: `GET /api/orders/driver/available`
- **Điều kiện**: `items.status = "Created" AND items.driverId = null`
- **Hiển thị**: Tất cả đơn chưa có ai nhận
- **Action**: Nút "Nhận đơn"

#### 2. **Đơn đã nhận** (Received Orders)
- **Query**: `GET /api/orders/driver/my-orders?status=Accepted`
- **Điều kiện**: `items.driverId = driver._id AND items.status = "Accepted"`
- **Hiển thị**: Đơn tài xế vừa nhận, chưa lấy hàng
- **Action**: Nút "Đã lấy hàng" → chuyển sang PickedUp

#### 3. **Đơn đang giao** (In Progress)
- **Query**: `GET /api/orders/driver/my-orders?status=PickedUp,Delivering`
- **Điều kiện**: `items.driverId = driver._id AND items.status IN ["PickedUp", "Delivering"]`
- **Hiển thị**: Đơn đang vận chuyển
- **Action**: Nút "Đã giao hàng" → chuyển sang Delivered

#### 4. **Đã hoàn thành** (Completed)
- **Query**: `GET /api/orders/driver/my-orders?status=Delivered`
- **Điều kiện**: `items.driverId = driver._id AND items.status = "Delivered"`
- **Hiển thị**: Lịch sử đơn đã giao
- **Action**: Xem chi tiết, doanh thu

#### 5. **Đã hủy** (Cancelled)
- **Query**: `GET /api/orders/driver/my-orders?status=Cancelled`
- **Điều kiện**: `items.driverId = driver._id AND items.status = "Cancelled"`
- **Hiển thị**: Đơn bị hủy

---

## 🐛 TẠI SAO HIỆN TẠI KHÔNG CÓ DỮ LIỆU?

### Vấn Đề 1: Item Không Có `driverId`
```javascript
// Database hiện tại
{
  _id: "68e619bcff8b0dbaa6aabfa9",
  items: [
    {
      status: "Accepted",  // ← Có status Accepted
      driverId: null       // ← NHƯNG KHÔNG CÓ DRIVER ID!
    }
  ]
}
```

**Nguyên nhân**: Khi tài xế nhận đơn, code KHÔNG GÁN `driverId` cho item.

**Fix**: Sửa `acceptOrderItem` controller để **BẮT BUỘC** gán `item.driverId = driver._id`

### Vấn Đề 2: Query Không Tìm Thấy
```javascript
// Backend query
const query = { 
  'items.driverId': driver._id,  // ← Tìm items có driverId = driver._id
  'items.status': 'Accepted'
};

// Nhưng database có
{
  items: [{ driverId: null, status: "Accepted" }]  // ← null ≠ driver._id
}
```

**Kết quả**: `count: 0` vì không có item nào khớp điều kiện!

---

## ✅ GIẢI PHÁP

### Bước 1: Sửa Controller `acceptOrderItem`
Đảm bảo GÁN `driverId` khi nhận đơn:

```javascript
// File: controllers/orderController.js
export const acceptOrderItem = async (req, res) => {
  // ...
  
  // QUAN TRỌNG: GÁN DRIVER ID
  item.driverId = driver._id;  // ← PHẢI CÓ DÒNG NÀY!
  item.status = 'Accepted';
  item.acceptedAt = new Date();
  
  // ...
};
```

### Bước 2: Fix Dữ Liệu Cũ
Chạy script sửa các đơn đã tồn tại:

```javascript
// Script: fix-missing-driver-id.js
const ordersToFix = await Order.find({
  'items.status': { $in: ['Accepted', 'PickedUp', 'Delivering', 'Delivered'] },
  'items.driverId': null
});

// Không thể tự động fix vì không biết driver nào nhận!
// → Phải tạo đơn mới để test
```

### Bước 3: Test Lại Toàn Bộ Luồng
1. Khách hàng tạo đơn mới
2. Tài xế nhận đơn → CHECK: `items[0].driverId` PHẢI CÓ GIÁ TRỊ
3. Tài xế vào tab "Đơn đã nhận" → PHẢI THẤY ĐƠN
4. Tài xế cập nhật "Đã lấy hàng" → Chuyển sang "Đơn đang giao"
5. Tài xế "Đã giao hàng" → Chuyển sang "Đã hoàn thành"

---

## 📝 CHECKLIST TRIỂN KHAI

- [ ] Sửa `acceptOrderItem` controller - GÁN `driverId`
- [ ] Sửa `getAvailableOrders` - Query đúng
- [ ] Sửa `getDriverOrders` - Query đúng
- [ ] Sửa `updateOrderItemStatus` - Kiểm tra quyền
- [ ] Frontend: Test 5 tabs
- [ ] Tạo đơn mới để test
- [ ] Verify database có `driverId` sau khi nhận đơn
- [ ] Test Socket real-time
- [ ] Test giao dịch thu nhập khi hoàn thành

---

## 🚀 BƯỚC TIẾP THEO

1. **XÓA TẤT CẢ ĐƠN HÀNG CŨ** (vì không có driverId)
2. **SỬA CODE** theo logic trên
3. **TẠO ĐƠN MỚI** để test từ đầu
4. **VERIFY** từng bước một

Bạn muốn tôi implement ngay không? 🛠️

