import { v2 as cloudinary } from 'cloudinary';

// Ưu tiên CLOUDINARY_URL nếu được cấu hình, nếu không dùng bộ 3 biến
if (process.env.CLOUDINARY_URL) {
   cloudinary.config({
      secure: true
   });
} else {
   cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
   });
}

export default cloudinary;


