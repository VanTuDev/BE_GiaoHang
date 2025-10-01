import { v2 as cloudinary } from 'cloudinary';
import config from './config.js';

// Ưu tiên CLOUDINARY_URL nếu được cấu hình, nếu không dùng bộ 3 biến
if (config.cloudinary.url) {
   cloudinary.config({
      secure: true
   });
} else {
   cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true
   });
}

export default cloudinary;