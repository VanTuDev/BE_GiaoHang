import dotenv from 'dotenv';
import { VNPay } from 'vnpay';

dotenv.config();

// Khởi tạo VNPay client theo cấu hình từ .env
export const vnpay = new VNPay({
   tmnCode: process.env.VNP_TMN_CODE,
   secureSecret: process.env.VNP_HASH_SECRET,
   vnpayHost: process.env.VNP_URL?.includes('sandbox') ? 'https://sandbox.vnpayment.vn' : 'https://vnpayment.vn',
   testMode: true,
});


