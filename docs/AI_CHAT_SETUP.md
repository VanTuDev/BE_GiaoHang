# 🤖 Hướng dẫn Setup AI Chat với Gemini

## 📋 Tổng quan

Đã tích hợp Google Gemini AI để tư vấn về dịch vụ vận chuyển và giao hàng. Chat box sẽ xuất hiện ở góc dưới bên phải của Landing page.

## 🔧 Cài đặt

### Bước 1: Cài đặt package

```bash
cd BE_GiaoHangDaNang
npm install @google/generative-ai
```

### Bước 2: Cấu hình Environment Variables

Thêm vào file `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Lấy API Key từ Google AI Studio**: https://makersuite.google.com/app/apikey

### Bước 3: Restart Backend Server

```bash
npm run dev
```

## 🎨 Frontend

Chat box đã được tích hợp vào Landing page (`/`). Không cần cấu hình thêm.

## 📡 API Endpoint

### POST `/api/ai/chat`

**Request:**
```json
{
  "message": "Tôi cần vận chuyển 2 tấn hàng từ Đà Nẵng đến Hà Nội",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Xin chào"
    },
    {
      "role": "assistant",
      "content": "Xin chào! Tôi có thể giúp gì cho bạn?"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Để vận chuyển 2 tấn hàng từ Đà Nẵng đến Hà Nội, bạn nên sử dụng xe tải lớn hoặc xe thùng...",
    "timestamp": "2025-01-07T10:30:00.000Z"
  }
}
```

## 🎯 Tính năng

- ✅ Chat box floating ở góc dưới bên phải
- ✅ Tư vấn về các loại xe phù hợp
- ✅ Giải thích về dịch vụ, giá cả
- ✅ Hướng dẫn đặt đơn hàng
- ✅ Conversation history để AI hiểu context
- ✅ Responsive design
- ✅ Loading states

## 🔒 Bảo mật

- API endpoint là **public** (không cần authentication)
- API Key được lưu trong environment variables
- Không expose API Key ra frontend

## 🐛 Troubleshooting

### Lỗi: "AI service chưa được cấu hình"
- Kiểm tra `GEMINI_API_KEY` đã được set trong `.env`
- Restart server sau khi thêm env variable

### Lỗi: "Invalid API Key"
- Kiểm tra API Key có đúng không
- Đảm bảo API Key còn hiệu lực

### Chat box không hiển thị
- Kiểm tra console browser có lỗi không
- Kiểm tra component `AIChatBox` đã được import vào `Landing.jsx`

## 📝 Lưu ý

- AI có thể mắc lỗi, nên có disclaimer trong UI
- Conversation history được lưu trong session (không persist)
- Có thể thêm rate limiting nếu cần

---

**Chúc bạn sử dụng thành công! 🎉**

