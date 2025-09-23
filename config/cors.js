import config from './config.js';

// Danh sách origin được phép; có thể mở rộng bằng ENV: CORS_ORIGINS=...
const envOrigins = (process.env.CORS_ORIGINS || '')
   .split(',')
   .map(s => s.trim())
   .filter(Boolean);

const allowedOrigins = Array.from(new Set([
   config.clientURL,
   ...envOrigins
]));

export const corsOptions = {
   origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Cho phép tools không gửi Origin (Postman, curl)
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin không được phép bởi CORS'), false);
   },
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Access-Control-Allow-Credentials'],
   exposedHeaders: ['Authorization'],
   preflightContinue: false,
   optionsSuccessStatus: 204
};

export default corsOptions;


