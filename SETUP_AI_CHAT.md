# 🔧 Setup AI Chat - Hướng dẫn khắc phục lỗi

## 🚨 Lỗi: "AI service chưa được cấu hình"

### Nguyên nhân
- `GEMINI_API_KEY` chưa được thêm vào file `.env`
- Package `@google/generative-ai` chưa được cài đặt
- Server chưa restart sau khi thêm env variable

## ✅ Giải pháp

### Bước 1: Cài đặt package

```bash
cd BE_GiaoHangDaNang
npm install @google/generative-ai
```

### Bước 2: Thêm API Key vào .env

Mở file `.env` trong thư mục `BE_GiaoHangDaNang` và thêm dòng sau:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Lấy API Key từ Google AI Studio**: https://makersuite.google.com/app/apikey

**Lưu ý**: 
- File `.env` nằm ở `BE_GiaoHangDaNang/.env`
- Nếu chưa có file `.env`, tạo mới file này

### Bước 3: Restart Server

**QUAN TRỌNG**: Phải restart server sau khi thêm env variable!

```bash
# Dừng server (Ctrl+C)
# Khởi động lại
npm run dev
```

### Bước 4: Kiểm tra

1. Mở browser console (F12)
2. Thử chat với AI
3. Nếu vẫn lỗi, kiểm tra:
   - API key đã đúng chưa?
   - Server đã restart chưa?
   - Package đã được cài chưa?

## 🔍 Debug

### Kiểm tra API Key đã được load chưa

Thêm vào `controllers/aiController.js` để debug:

```javascript
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Đã có' : 'CHƯA CÓ');
console.log('config.gemini:', config.gemini);
```

### Kiểm tra package đã được cài chưa

```bash
cd BE_GiaoHangDaNang
npm list @google/generative-ai
```

Nếu không có, cài đặt:
```bash
npm install @google/generative-ai
```

## 📝 Checklist

- [ ] Package `@google/generative-ai` đã được cài
- [ ] File `.env` đã có `GEMINI_API_KEY`
- [ ] Server đã được restart
- [ ] Không có lỗi trong console

---

**Sau khi làm xong các bước trên, chat box sẽ hoạt động! 🎉**

