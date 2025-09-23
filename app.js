import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/config.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import corsOptions from './config/cors.js';

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS
app.use(cors(corsOptions));

// Health check
app.get('/healthz', (req, res) => {
   res.json({ ok: true, uptime: process.uptime() });
});

// Mount routes (giữ nguyên /api để không phá vỡ tương thích)
app.use('/api', routes);

// Route mặc định
app.get('/', (req, res) => {
   res.send('API đang chạy');
});

// 404 và error handler
app.use(notFound);
app.use(errorHandler);

export default app;


