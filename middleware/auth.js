import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
   try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
         return res.status(401).json({ success: false, message: 'Thiếu access token' });
      }

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('-passwordHash');
      if (!user) {
         return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
      }

      req.user = user;
      next();
   } catch (error) {
      return res.status(401).json({ success: false, message: 'Access token không hợp lệ', error: error.message });
   }
};

export const authorize = (...roles) => {
   const allowed = roles.length ? roles : ['Customer', 'Driver', 'Admin'];
   return (req, res, next) => {
      if (!req.user) {
         return res.status(401).json({ success: false, message: 'Chưa xác thực' });
      }
      const merged = Array.from(new Set([
         req.user.role,
         ...(Array.isArray(req.user.roles) ? req.user.roles : [])
      ].filter(Boolean)));
      if (!merged.some(r => allowed.includes(r))) {
         return res.status(403).json({
            success: false,
            message: 'Không có quyền truy cập',
            details: {
               userId: String(req.user._id || ''),
               userRoles: merged,
               requiredAnyOf: allowed
            }
         });
      }
      next();
   };
};

export const roles = {
   CUSTOMER: 'Customer',
   DRIVER: 'Driver',
   ADMIN: 'Admin'
};


