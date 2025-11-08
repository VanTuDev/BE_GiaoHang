# 📋 HƯỚNG DẪN DEBUG LUỒNG ĐẶT ĐƠN VÀ CHẤP NHẬN ĐƠN

## 🚀 LUỒNG HOẠT ĐỘNG

### 1. KHÁCH HÀNG ĐẶT ĐƠN

#### Frontend → Backend
```
Customer → OrderCreate.jsx → orderService.createOrder() 
→ POST /api/orders → orderController.createOrder()
```

#### Console Logs Backend (Khi khách hàng đặt đơn):
```
🚀 ========== [FLOW] KHÁCH HÀNG ĐẶT ĐƠN ==========
📥 [createOrder] Nhận request từ khách hàng: {...}
📋 [createOrder] Dữ liệu đơn hàng: {...}
📦 [createOrder] Bắt đầu xử lý X items...
  🔸 [createOrder] Xử lý Item 1/X: {...}
  🔍 [createOrder] Tìm xe phù hợp: type=..., weightKg=...
  ✅ [createOrder] Tìm thấy xe phù hợp: {...}
💰 Tính giá item: {...}
💾 [createOrder] Tạo đơn hàng trong database...
✅ [createOrder] Đơn hàng đã được tạo trong database: {...}
📡 [createOrder] Chuẩn bị phát tín hiệu Socket.IO...
📤 [createOrder] Socket payload: {...}
✅ [createOrder] Đã emit socket event "order:available:new" đến room "drivers"
✅ [createOrder] ========== TẠO ĐƠN HÀNG THÀNH CÔNG ==========
```

#### Điểm quan trọng cần kiểm tra:
- ✅ `order.status = 'Created'`
- ✅ `item.status = 'Created'`
- ✅ `item.driverId = null` (hoặc `driverIdIsNull: true`)
- ✅ Socket event đã được emit

---

### 2. TÀI XẾ XEM ĐƠN CÓ SẴN

#### Frontend → Backend
```
Driver → Orders.jsx (tab "available") → orderService.getAvailableOrders()
→ GET /api/orders/driver/available → orderController.getAvailableOrders()
```

#### Console Logs Frontend:
```
🚀 [FRONTEND] ========== FETCH ĐƠN HÀNG ==========
📋 [FRONTEND] Active tab: available
📤 [FRONTEND] Gọi API getAvailableOrders...
📥 [FRONTEND] Response từ API getAvailableOrders: {...}
✅ [FRONTEND] Đã cập nhật state availableOrders: {...}
```

#### Console Logs Backend:
```
🚀 ========== [FLOW] TÀI XẾ XEM ĐƠN CÓ SẴN ==========
📥 [getAvailableOrders] Nhận request từ tài xế: {...}
👤 [getAvailableOrders] Thông tin tài xế: {...}
🔍 [getAvailableOrders] Thông tin xe của tài xế: {...}
🔍 [getAvailableOrders] Query MongoDB: {...}
📊 [getAvailableOrders] Đang query database...
📦 [getAvailableOrders] Kết quả query database: {...}
📋 [getAvailableOrders] Phân tích tất cả items trong đơn hàng...
  📦 Đơn 1 (...): X items
    🔸 Item 1: {...}
🚗 [getAvailableOrders] Tổng kết vehicle types: {...}
🔍 [getAvailableOrders] Bắt đầu filter items...
  📦 [getAvailableOrders] Xử lý đơn 1/X (...):
    🔸 Item 1 (...): {...}
    ✅ Đơn 1: Tìm thấy X items có thể nhận
✅ [getAvailableOrders] ========== KẾT QUẢ FILTER ==========
📊 [getAvailableOrders] Tổng kết: {...}
```

#### Điểm quan trọng cần kiểm tra:
- ✅ Tài xế có xe hoạt động (`status: 'Active'`)
- ✅ Query tìm thấy đơn có `status: 'Created'`
- ✅ Items có `status: 'Created'` và `driverId: null`
- ✅ `vehicleType` của item khớp với `vehicle.type` của tài xế
- ✅ `weightKg` của item <= `maxWeightKg` của xe

---

### 3. SOCKET.IO REALTIME

#### Backend → Frontend
```
Backend emit → io.to('drivers').emit('order:available:new', payload)
→ Frontend socket.on('order:available:new') → refetchAvailableOrders()
```

#### Console Logs Frontend:
```
📨 [FRONTEND] ========== NHẬN SOCKET EVENT ==========
📥 [FRONTEND] Socket event: order:available:new {...}
📋 [FRONTEND] Active tab hiện tại: available
🔄 [FRONTEND] Đang ở tab "available", refetch ngay...
🔄 [FRONTEND] ========== REFETCH ĐƠN CÓ SẴN ==========
📤 [FRONTEND] Gọi API getAvailableOrders...
📥 [FRONTEND] Response từ API: {...}
```

---

## 🔍 CÁCH DEBUG KHI TÀI XẾ KHÔNG THẤY ĐƠN

### Bước 1: Kiểm tra Console Backend khi khách hàng đặt đơn

Tìm các log sau:
```
✅ [createOrder] Đơn hàng đã được tạo trong database:
  - orderStatus: 'Created' ✅
  - items[].status: 'Created' ✅
  - items[].driverId: null ✅
```

### Bước 2: Kiểm tra Console Backend khi tài xế xem đơn

Tìm các log sau:
```
📦 [getAvailableOrders] Kết quả query database:
  - totalOrdersFound: X (phải > 0)
  
📋 [getAvailableOrders] Phân tích tất cả items:
  - Item có status: 'Created' và driverId: null
  
🔍 [getAvailableOrders] Bắt đầu filter items:
  - matchesVehicle: "TruckSmall === TruckSmall = true" ✅
  - matchesWeight: "500 <= 1000 = true" ✅
  - canAccept: true ✅
```

### Bước 3: Kiểm tra Console Frontend

Tìm các log sau:
```
📥 [FRONTEND] Response từ API getAvailableOrders:
  - success: true ✅
  - dataCount: X (phải > 0 nếu có đơn)
  - data: [...] (phải có items)
```

---

## ⚠️ CÁC VẤN ĐỀ THƯỜNG GẶP

### 1. Đơn không được tạo với status 'Created'
**Triệu chứng:** Backend log không thấy `orderStatus: 'Created'`
**Giải pháp:** Kiểm tra `createOrder` có set `status: 'Created'` không

### 2. Item không có driverId = null
**Triệu chứng:** Backend log thấy `driverIdIsNull: false`
**Giải pháp:** Kiểm tra khi tạo item có set `driverId: null` không

### 3. VehicleType không khớp
**Triệu chứng:** Backend log thấy `matchesVehicle: false`
**Giải pháp:** 
- Kiểm tra `item.vehicleType` trong đơn hàng
- Kiểm tra `vehicle.type` của tài xế
- Đảm bảo chúng khớp nhau (case-sensitive)

### 4. Weight không phù hợp
**Triệu chứng:** Backend log thấy `matchesWeight: false`
**Giải pháp:**
- Kiểm tra `item.weightKg` <= `vehicle.maxWeightKg`
- Đảm bảo cả hai đều là số

### 5. Query không tìm thấy đơn
**Triệu chứng:** Backend log thấy `totalOrdersFound: 0`
**Giải pháp:**
- Kiểm tra có đơn nào có `status: 'Created'` trong database không
- Kiểm tra query MongoDB có đúng không

### 6. Socket không hoạt động
**Triệu chứng:** Frontend không nhận được socket event
**Giải pháp:**
- Kiểm tra Socket.IO server đang chạy
- Kiểm tra tài xế đã join room 'drivers' chưa
- Kiểm tra network connection

---

## 📊 CHECKLIST DEBUG

Khi tài xế không thấy đơn, kiểm tra:

- [ ] Backend: Đơn đã được tạo với `status: 'Created'`?
- [ ] Backend: Items có `status: 'Created'` và `driverId: null`?
- [ ] Backend: Socket event đã được emit?
- [ ] Backend: Query tìm thấy đơn có `status: 'Created'`?
- [ ] Backend: Filter items: `vehicleType` khớp?
- [ ] Backend: Filter items: `weightKg` <= `maxWeightKg`?
- [ ] Frontend: API trả về `success: true`?
- [ ] Frontend: `dataCount > 0`?
- [ ] Frontend: Socket event đã được nhận?
- [ ] Frontend: State `availableOrders` đã được cập nhật?

---

## 🎯 CÁCH SỬ DỤNG

1. **Mở Console Backend** (terminal chạy `npm start`)
2. **Mở Console Frontend** (Browser DevTools → Console)
3. **Khách hàng đặt đơn** → Xem logs backend
4. **Tài xế mở tab "Đơn có sẵn"** → Xem logs cả backend và frontend
5. **So sánh logs** với checklist trên để tìm vấn đề

---

## 📝 LƯU Ý

- Tất cả logs đều có prefix `[createOrder]` hoặc `[getAvailableOrders]` hoặc `[FRONTEND]`
- Logs được format với emoji để dễ nhận biết
- Logs quan trọng có dấu `==========` để dễ tìm

