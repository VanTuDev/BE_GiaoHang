import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export const signAccessToken = (user) => {
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
   return jwt.verify(token, config.jwtSecret);
};

// Refresh token đã bị loại bỏ theo yêu cầu


