# API DOANH THU TÀI XẾ

## 📊 TỔNG QUAN

API cho phép tài xế xem thống kê doanh thu, giao dịch và thu nhập của mình.

---

## 🔧 ENDPOINTS

### 1. Lấy Tổng Quan Doanh Thu
**GET** `/api/driver/revenue/overview`

**Headers**:
```
Authorization: Bearer <driver_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": {
      "totalOrders": 45,
      "totalRevenue": 50000000,
      "totalFee": 10000000,
      "totalPayout": 40000000
    },
    "monthly": {
      "monthlyOrders": 12,
      "monthlyRevenue": 15000000,
      "monthlyPayout": 12000000
    },
    "yearly": {
      "yearlyOrders": 38,
      "yearlyRevenue": 42000000,
      "yearlyPayout": 33600000
    },
    "recentTransactions": [
      {
        "_id": "...",
        "amount": 400000,
        "fee": 80000,
        "netAmount": 320000,
        "orderId": {
          "pickupAddress": "...",
          "dropoffAddress": "..."
        },
        "transactionDate": "2025-10-08T10:00:00Z"
      }
    ],
    "balance": 5000000
  }
}
```

---

### 2. Lấy Thống Kê Theo Thời Gian
**GET** `/api/driver/revenue/stats`

**Headers**:
```
Authorization: Bearer <driver_token>
```

**Query Parameters**:
- `startDate` (optional): ISO date string, mặc định = đầu năm
- `endDate` (optional): ISO date string, mặc định = hôm nay
- `granularity` (optional): `day` | `week` | `month` | `quarter` | `year`, mặc định = `month`

**Example**:
```
GET /api/driver/revenue/stats?startDate=2025-01-01&endDate=2025-12-31&granularity=month
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "label": "Th1/2025",
      "period": { "year": 2025, "month": 1 },
      "orders": 8,
      "distanceKm": 120,
      "revenue": 3500000,
      "fee": 700000,
      "payout": 2800000
    },
    {
      "label": "Th2/2025",
      "period": { "year": 2025, "month": 2 },
      "orders": 12,
      "distanceKm": 180,
      "revenue": 5000000,
      "fee": 1000000,
      "payout": 4000000
    }
  ],
  "totals": {
    "orders": 20,
    "distanceKm": 300,
    "revenue": 8500000,
    "fee": 1700000,
    "payout": 6800000
  },
  "meta": {
    "driverId": "...",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "granularity": "month"
  }
}
```

---

### 3. Lấy Danh Sách Giao Dịch
**GET** `/api/driver/revenue/transactions`

**Headers**:
```
Authorization: Bearer <driver_token>
```

**Query Parameters**:
- `page` (optional): Trang, mặc định = 1
- `limit` (optional): Số items/trang, mặc định = 20, max = 100
- `type` (optional): `OrderEarning` | `Withdrawal` | `Bonus` | `Penalty`
- `status` (optional): `Pending` | `Completed` | `Failed` | `Cancelled`
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Example**:
```
GET /api/driver/revenue/transactions?page=1&limit=20&type=OrderEarning&status=Completed
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "68e62ccb88790c2bd4daa5ed",
      "driverId": "68cd06add0996c87da56b55e",
      "orderId": {
        "_id": "...",
        "pickupAddress": "123 Nguyễn Văn Linh",
        "dropoffAddress": "456 Hoàng Văn Thụ",
        "totalPrice": 125000
      },
      "amount": 125000,
      "fee": 25000,
      "netAmount": 100000,
      "type": "OrderEarning",
      "status": "Completed",
      "description": "Thu nhập từ đơn hàng #...",
      "transactionDate": "2025-10-08T10:00:00.000Z",
      "createdAt": "2025-10-08T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## 💰 CÔNG THỨC TÍNH TOÁN

### 1. Thu Nhập Từ Đơn Hàng
```javascript
revenue = order.totalPrice           // Tổng giá trị đơn hàng
fee = revenue * 0.2                  // Hoa hồng 20%
payout = revenue - fee               // Thực nhận 80%
```

### 2. Aggregation Theo Thời Gian
- **Ngày**: Group by `year`, `month`, `day`
- **Tuần**: Group by `year`, `week` (1-52)
- **Tháng**: Group by `year`, `month` (1-12)
- **Quý**: Group by `year`, `quarter` (1-4)
- **Năm**: Group by `year`

### 3. Khoảng Cách
```javascript
// Tính từ Order items
distanceKm = SUM(order.items.distanceKm) 
WHERE items.driverId = driver._id 
  AND items.status = 'Delivered'
  AND items.deliveredAt BETWEEN startDate AND endDate
```

---

## 📊 DỮ LIỆU MẪU

### Driver Transaction Schema
```javascript
{
  "_id": ObjectId,
  "driverId": ObjectId(Driver),
  "orderId": ObjectId(Order),
  "orderItemId": ObjectId,
  
  "amount": 125000,        // Tổng doanh thu
  "fee": 25000,           // Hoa hồng (20%)
  "netAmount": 100000,    // Thực nhận (80%)
  
  "type": "OrderEarning",  // Loại giao dịch
  "status": "Completed",   // Trạng thái
  "description": "Thu nhập từ đơn hàng #...",
  
  "transactionDate": Date,
  "createdAt": Date,
  "updatedAt": Date
}
```

### Loại Giao Dịch (Type)
- `OrderEarning`: Thu nhập từ đơn hàng
- `Withdrawal`: Rút tiền
- `Bonus`: Thưởng
- `Penalty`: Phạt

### Trạng Thái (Status)
- `Pending`: Đang chờ
- `Completed`: Hoàn thành
- `Failed`: Thất bại
- `Cancelled`: Đã hủy

---

## 🎨 FRONTEND INTEGRATION

### 1. Service Setup
```javascript
// src/features/revenue/api/revenueService.js
import axiosClient from "../../../authentication/api/axiosClient";

export const revenueService = {
   getOverview: () => axiosClient.get('/api/driver/revenue/overview'),
   getStats: (params) => axiosClient.get('/api/driver/revenue/stats', { params }),
   getTransactions: (params) => axiosClient.get('/api/driver/revenue/transactions', { params }),
};
```

### 2. Component Usage
```javascript
// src/pages/driver/Revenue.jsx
import { revenueService } from "../../features/revenue/api/revenueService";

const fetchRevenueData = async () => {
   const response = await revenueService.getStats({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity: 'month'
   });
   
   if (response.data?.success) {
      setData(response.data.data);
      setTotals(response.data.totals);
   }
};
```

---

## 🧪 TEST SCENARIOS

### Scenario 1: Xem Doanh Thu Tháng Này
```bash
# Request
GET /api/driver/revenue/stats?startDate=2025-10-01&endDate=2025-10-31&granularity=day

# Expected: Trả về data theo ngày trong tháng 10
```

### Scenario 2: Xem Doanh Thu Năm Nay
```bash
# Request
GET /api/driver/revenue/stats?startDate=2025-01-01&endDate=2025-12-31&granularity=month

# Expected: Trả về 12 tháng với data tương ứng
```

### Scenario 3: Xem Giao Dịch Gần Đây
```bash
# Request
GET /api/driver/revenue/transactions?page=1&limit=10&type=OrderEarning&status=Completed

# Expected: 10 giao dịch hoàn thành gần nhất
```

---

## 📝 NOTES

1. **Authentication**: Tất cả endpoints yêu cầu driver token
2. **Authorization**: Chỉ driver mới truy cập được dữ liệu của mình
3. **Date Format**: Sử dụng ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
4. **Granularity**: 
   - `day`: Tốt nhất cho 1 tháng
   - `week`: Tốt nhất cho 3-6 tháng
   - `month`: Tốt nhất cho 1 năm
   - `quarter`: Tốt nhất cho nhiều năm
   - `year`: Tốt nhất cho so sánh lâu dài

5. **Performance**: 
   - Sử dụng aggregation pipeline cho tốc độ
   - Index trên `driverId` và `transactionDate`
   - Pagination cho danh sách giao dịch

---

## ✅ CHECKLIST IMPLEMENTATION

- [x] Backend controller (`driverRevenueController.js`)
- [x] Backend routes (`driverRevenueRoutes.js`)
- [x] Frontend service (`revenueService.js`)
- [x] Frontend component (`Revenue.jsx`)
- [x] API endpoints integration
- [x] Charts và biểu đồ
- [x] Tài liệu API

---

## 🚀 HOÀN THÀNH

**Tất cả API đã sẵn sàng sử dụng!**
- ✅ `/api/driver/revenue/overview`
- ✅ `/api/driver/revenue/stats`
- ✅ `/api/driver/revenue/transactions`

**Frontend đã tích hợp**:
- ✅ Thống kê theo thời gian
- ✅ Biểu đồ cột (đơn hàng)
- ✅ Biểu đồ đường (doanh thu & thực nhận)
- ✅ Bảng chi tiết

