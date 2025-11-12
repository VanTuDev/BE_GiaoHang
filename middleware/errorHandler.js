export const notFound = (req, res, next) => {
   return res.status(404).json({ success: false, error: 'Không tìm thấy endpoint này' });
};

export const errorHandler = (err, req, res, next) => {
   // Log chi tiết lỗi để debug
   console.error('❌ [ERROR HANDLER]', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      status: err.status || 500
   });

   const status = err.status || 500;
   // Trong production, không trả về stack trace
   const message = process.env.NODE_ENV === 'production'
      ? (err.message || 'Lỗi máy chủ')
      : (err.message || 'Lỗi máy chủ');

   return res.status(status).json({
      success: false,
      message,
      // Chỉ trả về error detail trong development
      ...(process.env.NODE_ENV !== 'production' && { error: err.message, stack: err.stack })
   });
};


