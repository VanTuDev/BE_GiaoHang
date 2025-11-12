import dotenv from 'dotenv';

// Load env nếu chưa được load từ nơi khác
dotenv.config();

const toNumber = (value, fallback) => {
   const n = Number(value);
   return Number.isNaN(n) ? fallback : n;
};

const config = {
   port: toNumber(process.env.PORT || process.env.PORT_DEV, 8080),
   clientURL: process.env.CLIENT_URL,
   mongoURI: process.env.MONGODB_URI,
   jwtSecret: process.env.JWT_SECRET,
   jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
   jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
   jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
   email: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD || ''
   },
   otpExpiry: toNumber(process.env.OTP_EXPIRY, 10),
   cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      url: process.env.CLOUDINARY_URL || ''
   },
   gemini: {
      apiKey: process.env.GEMINI_API_KEY || ''
   },
   supabase: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_KEY
   }
};

export default config;