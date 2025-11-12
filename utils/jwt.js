import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export const signAccessToken = (user) => {
   if (!config.jwtSecret) {
      throw new Error('JWT_SECRET chưa được cấu hình trong biến môi trường');
   }

   const payload = { role: user.role };
   const options = { subject: String(user._id) };
   const accessExp = (config.jwtExpiresIn ?? '').toString().trim().toLowerCase();
   if (accessExp && accessExp !== 'never') {
      options.expiresIn = accessExp;
   }
   return jwt.sign(payload, config.jwtSecret, options);
};

// Refresh token đã bị loại bỏ theo yêu cầu

export const verifyAccessToken = (token) => {
   if (!config.jwtSecret) {
      throw new Error('JWT_SECRET chưa được cấu hình trong biến môi trường');
   }
   return jwt.verify(token, config.jwtSecret);
};

// Refresh token đã bị loại bỏ theo yêu cầu


