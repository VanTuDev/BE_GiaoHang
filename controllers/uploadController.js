import cloudinary from '../config/cloudinary.js';

/**
 * Upload một ảnh lên Cloudinary
 * @param {Buffer} buffer - Buffer của file ảnh
 * @param {string} folder - Thư mục lưu trữ trên Cloudinary
 * @returns {Promise<Object>} - Kết quả upload từ Cloudinary
 */
const uploadToCloudinary = (buffer, folder) => new Promise((resolve, reject) => {
   const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
         if (error) return reject(error);
         resolve(result);
      }
   );

   uploadStream.end(buffer);
});

/**
 * API upload một ảnh
 */
export const uploadImage = async (req, res) => {
   try {
      // Kiểm tra file upload
      if (!req.file) {
         return res.status(400).json({ success: false, message: 'Không có file được upload' });
      }

      // Lấy thư mục từ query hoặc body
      const folder = req.body.folder || req.query.folder || 'default';

      // Upload lên Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, folder);

      return res.json({
         success: true,
         data: {
            url: result.secure_url, // Sử dụng secure_url cho frontend
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type
         }
      });
   } catch (error) {
      console.error('Lỗi khi upload ảnh:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi khi upload ảnh',
         error: error.message
      });
   }
};

/**
 * API upload nhiều ảnh
 */
export const uploadMultipleImages = async (req, res) => {
   try {
      // Kiểm tra files upload
      if (!req.files || req.files.length === 0) {
         return res.status(400).json({ success: false, message: 'Không có file được upload' });
      }

      // Lấy thư mục từ query hoặc body
      const folder = req.body.folder || req.query.folder || 'default';

      // Upload lên Cloudinary
      const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, folder));
      const results = await Promise.all(uploadPromises);

      // Format kết quả
      const formattedResults = results.map(result => ({
         url: result.secure_url, // Sử dụng secure_url cho frontend
         publicId: result.public_id,
         width: result.width,
         height: result.height,
         format: result.format,
         resourceType: result.resource_type
      }));

      return res.json({
         success: true,
         data: formattedResults
      });
   } catch (error) {
      console.error('Lỗi khi upload ảnh:', error);
      return res.status(500).json({
         success: false,
         message: 'Lỗi khi upload ảnh',
         error: error.message
      });
   }
};