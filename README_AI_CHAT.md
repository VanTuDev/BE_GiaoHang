# 🤖 AI Chat với Gemini - Quick Start

## ⚡ Cài đặt nhanh

### 1. Cài package
```bash
cd BE_GiaoHangDaNang
npm install @google/generative-ai
```

### 2. Thêm vào `.env`
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Lấy API Key từ Google AI Studio**: https://makersuite.google.com/app/apikey

### 3. Restart server
```bash
npm run dev
```

## ✅ Hoàn thành!

Chat box sẽ xuất hiện ở góc dưới bên phải của Landing page (`/`).

## 📝 Files đã tạo

- `BE_GiaoHangDaNang/controllers/aiController.js` - Backend controller
- `BE_GiaoHangDaNang/routes/aiRoutes.js` - API routes
- `FE_GiaoHangDaNang/src/components/landing/AIChatBox.jsx` - Frontend component
- Đã tích hợp vào `Landing.jsx`

## 🎯 API Endpoint

**POST** `/api/ai/chat`

Xem chi tiết trong `docs/AI_CHAT_SETUP.md`

