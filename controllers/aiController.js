import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/config.js';

// Khởi tạo Gemini AI
const apiKey = config.gemini?.apiKey && config.gemini.apiKey.trim() 
   ? config.gemini.apiKey.trim() 
   : null;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Debug: Log API key status (chỉ trong development)
if (process.env.NODE_ENV === 'development') {
   console.log('🤖 Gemini AI:', genAI ? '✅ Đã khởi tạo' : '❌ Chưa cấu hình (GEMINI_API_KEY chưa được set)');
   if (genAI) {
      console.log('📝 Model sẽ sử dụng: gemini-2.0-flash-exp');
   }
}

// System prompt cho AI tư vấn về xe di chuyển
const SYSTEM_PROMPT = `Bạn là một trợ lý AI chuyên tư vấn về dịch vụ vận chuyển và giao hàng tại Đà Nẵng. 
Nhiệm vụ của bạn là:
- Tư vấn khách hàng về các loại xe phù hợp với nhu cầu vận chuyển
- Giải thích về dịch vụ giao hàng, bốc xếp, bảo hiểm hàng hóa
- Hướng dẫn cách đặt đơn hàng
- Trả lời các câu hỏi về giá cả, thời gian giao hàng
- Tư vấn về các loại xe: Xe tải nhỏ, Xe tải vừa, Xe tải lớn, Xe thùng, Xe ben, Xe bán tải, Xe kéo

Hãy trả lời một cách thân thiện, chuyên nghiệp và hữu ích. Nếu không biết câu trả lời, hãy đề nghị khách hàng liên hệ trực tiếp với chúng tôi.`;

/**
 * Chat với AI Gemini
 * POST /api/ai/chat
 */
export const chatWithAI = async (req, res) => {
   try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || !message.trim()) {
         return res.status(400).json({ 
            success: false, 
            message: 'Vui lòng nhập câu hỏi' 
         });
      }

      if (!genAI) {
         console.error('GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào file .env');
         return res.status(500).json({ 
            success: false, 
            message: 'AI service chưa được cấu hình. Vui lòng liên hệ admin.',
            hint: process.env.NODE_ENV === 'development' ? 'Thêm GEMINI_API_KEY vào file .env và restart server' : undefined
         });
      }

      // Lấy model Gemini (sử dụng gemini-2.0-flash-exp hoặc gemini-pro)
      const model = genAI.getGenerativeModel({ 
         model: 'gemini-2.0-flash-exp' // Hoặc 'gemini-pro' nếu model trên không hoạt động
      });

      // Xây dựng prompt với system prompt và conversation history
      let fullPrompt = SYSTEM_PROMPT + '\n\n';
      
      // Thêm conversation history nếu có
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
         conversationHistory.forEach(msg => {
            if (msg.role && msg.content) {
               const roleLabel = msg.role === 'user' ? 'Khách hàng' : 'Trợ lý AI';
               fullPrompt += `${roleLabel}: ${msg.content}\n\n`;
            }
         });
      }

      // Thêm message hiện tại
      fullPrompt += `Khách hàng: ${message.trim()}\n\nTrợ lý AI:`;

      // Generate content
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const aiMessage = response.text();

      return res.json({
         success: true,
         data: {
            message: aiMessage,
            timestamp: new Date().toISOString()
         }
      });

   } catch (error) {
      console.error('Lỗi khi chat với AI:', error);
      return res.status(500).json({ 
         success: false, 
         message: 'Lỗi khi xử lý câu hỏi. Vui lòng thử lại sau.',
         error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
   }
};
