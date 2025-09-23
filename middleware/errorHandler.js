export const notFound = (req, res, next) => {
   return res.status(404).json({ success: false, error: 'Không tìm thấy endpoint này' });
};

export const errorHandler = (err, req, res, next) => {
   const status = err.status || 500;
   const message = err.message || 'Lỗi máy chủ';
   return res.status(status).json({ success: false, message });
};


