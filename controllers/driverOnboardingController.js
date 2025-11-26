import DriverApplication from '../models/driverApplication.model.js';
import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import cloudinary from '../config/cloudinary.js';
import { sendDriverApprovedEmail } from '../utils/emailService.js';

const uploadStream = (buffer, folder) => new Promise((resolve, reject) => {
   if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid buffer provided'));
   }
   try {
      const s = cloudinary.uploader.upload_stream(
         { folder, resource_type: 'auto' },
         (err, result) => {
            if (err) {
               console.error('❌ [uploadStream] Cloudinary error:', err);
               return reject(err);
            }
            if (!result || !result.secure_url) {
               return reject(new Error('Upload failed: no secure_url returned'));
            }
            resolve(result);
         }
      );
      s.on('error', (err) => {
         console.error('❌ [uploadStream] Stream error:', err);
         reject(err);
      });
      s.end(buffer);
   } catch (err) {
      console.error('❌ [uploadStream] Exception:', err);
      reject(err);
   }
});

export const applyDriver = async (req, res) => {
   let uploaded = {};
   try {
      const userId = req.user._id;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      if (!user.email || !user.isEmailVerified) return res.status(403).json({ success: false, message: 'Cần có email và đã xác thực email trước khi nộp hồ sơ' });

      // Upload các file tuỳ có
      const files = req.files || {};
      uploaded = {};
      const mapSingle = async (key, folder) => {
         try {
            if (files[key]?.[0] && files[key][0].buffer) {
               const r = await uploadStream(files[key][0].buffer, folder);
               if (r && r.secure_url) {
                  uploaded[key] = r.secure_url;
               }
            }
         } catch (err) {
            console.error(`❌ [applyDriver] Lỗi upload ${key}:`, err.message);
            throw new Error(`Lỗi upload file ${key}: ${err.message}`);
         }
      };
      const mapArray = async (key, folder) => {
         try {
            if (files[key] && Array.isArray(files[key]) && files[key].length > 0) {
               uploaded[key] = [];
               for (const f of files[key]) {
                  if (f && f.buffer) {
                     const r = await uploadStream(f.buffer, folder);
                     if (r && r.secure_url) {
                        uploaded[key].push(r.secure_url);
                     }
                  }
               }
            }
         } catch (err) {
            console.error(`❌ [applyDriver] Lỗi upload ${key}:`, err.message);
            throw new Error(`Lỗi upload files ${key}: ${err.message}`);
         }
      };

      await mapSingle('licenseFront', 'onboarding/license');
      await mapSingle('licenseBack', 'onboarding/license');
      await mapSingle('idFront', 'onboarding/idcard');
      await mapSingle('idBack', 'onboarding/idcard');
      await mapSingle('portrait', 'onboarding/portrait');
      await mapArray('vehiclePhotos', 'onboarding/vehicle');
      await mapArray('vehicleDocs', 'onboarding/vehicledocs');

      // Chuẩn bị docs object, chỉ set các field có giá trị (không set undefined)
      const docsUpdate = {};
      if (uploaded.licenseFront) docsUpdate.licenseFrontUrl = uploaded.licenseFront;
      if (uploaded.licenseBack) docsUpdate.licenseBackUrl = uploaded.licenseBack;
      if (uploaded.idFront) docsUpdate.idCardFrontUrl = uploaded.idFront;
      if (uploaded.idBack) docsUpdate.idCardBackUrl = uploaded.idBack;
      if (uploaded.portrait) docsUpdate.portraitUrl = uploaded.portrait;
      if (uploaded.vehiclePhotos && Array.isArray(uploaded.vehiclePhotos) && uploaded.vehiclePhotos.length > 0) {
         docsUpdate.vehiclePhotos = uploaded.vehiclePhotos;
      }
      if (uploaded.vehicleDocs && Array.isArray(uploaded.vehicleDocs) && uploaded.vehicleDocs.length > 0) {
         docsUpdate.vehicleDocs = uploaded.vehicleDocs;
      }

      // Kiểm tra xem có file nào được upload không
      if (Object.keys(uploaded).length === 0) {
         return res.status(400).json({ 
            success: false, 
            message: 'Vui lòng upload ít nhất một file để nộp hồ sơ' 
         });
      }

      // Xây dựng update object, dùng dot notation để merge với docs cũ (nếu có)
      const updateData = {
         status: 'Pending',
         submittedAt: new Date()
      };

      // Dùng dot notation để merge từng field vào docs, không replace toàn bộ object
      if (Object.keys(docsUpdate).length > 0) {
         Object.keys(docsUpdate).forEach(key => {
            updateData[`docs.${key}`] = docsUpdate[key];
         });
      }

      try {
         const app = await DriverApplication.findOneAndUpdate(
            { userId },
            { $set: updateData },
            { upsert: true, new: true }
         );
         
         if (!app) {
            throw new Error('Failed to create or update application');
         }
         
         return res.status(201).json({ success: true, data: app });
      } catch (dbError) {
         console.error('❌ [applyDriver] Database error:', dbError);
         throw new Error(`Database error: ${dbError.message}`);
      }
   } catch (error) {
      console.error('❌ [applyDriver] Lỗi khi nộp hồ sơ tài xế:', {
         userId: req.user?._id,
         error: error.message,
         stack: error.stack,
         filesReceived: Object.keys(req.files || {}),
         uploaded: Object.keys(uploaded || {})
      });
      return res.status(500).json({ 
         success: false, 
         message: 'Lỗi nộp hồ sơ tài xế', 
         error: error.message,
         details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
   }
};

export const myApplication = async (req, res) => {
   const app = await DriverApplication.findOne({ userId: req.user._id });
   return res.json({ success: true, data: app });
};

export const adminListApplications = async (req, res) => {
   const { status = 'Pending', page = 1, limit = 20 } = req.query;
   const q = { status };
   const pageNum = Math.max(parseInt(page, 10) || 1, 1);
   const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
   const skip = (pageNum - 1) * limitNum;
   const [items, total] = await Promise.all([
      DriverApplication.find(q).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      DriverApplication.countDocuments(q)
   ]);
   return res.json({ success: true, data: items, meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
};

export const adminGetApplicationById = async (req, res) => {
   const { applicationId } = req.params;
   const app = await DriverApplication.findById(applicationId);
   if (!app) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
   return res.json({ success: true, data: app });
};

export const getApplicationById = async (req, res) => {
   const { applicationId } = req.params;
   const app = await DriverApplication.findById(applicationId);
   if (!app) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
   // Chỉ cho owner hoặc Admin xem
   const isOwner = String(app.userId) === String(req.user._id);
   const roles = Array.from(new Set([req.user.role, ...(Array.isArray(req.user.roles) ? req.user.roles : [])].filter(Boolean)));
   const isAdmin = roles.includes('Admin');
   if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
   return res.json({ success: true, data: app });
};

export const adminReviewApplication = async (req, res) => {
   try {
      const { applicationId } = req.params;
      const { action, adminNote } = req.body; // 'approve' | 'reject'
      const app = await DriverApplication.findById(applicationId);
      if (!app) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });

      if (action === 'approve') {
         app.status = 'Approved';
         app.adminNote = adminNote;
         app.reviewedAt = new Date();
         await app.save();

         // Cấp role Driver song song giữ user là Customer (đa role)
         const user = await User.findById(app.userId);
         if (user) {
            user.role = 'Driver';
            if (!Array.isArray(user.roles)) user.roles = [];
            if (!user.roles.includes('Driver')) user.roles.push('Driver');
            await user.save();
            // Gửi email thông báo
            if (user.email) {
               await sendDriverApprovedEmail(user.email, user.name || 'Bạn');
            }
         }
         // Tạo hồ sơ Driver nếu chưa có
         await Driver.findOneAndUpdate({ userId: app.userId }, { $setOnInsert: { status: 'Active' } }, { upsert: true, new: true });

         return res.json({ success: true, message: 'Đã duyệt hồ sơ tài xế', data: app });
      }

      if (action === 'reject') {
         app.status = 'Rejected';
         app.adminNote = adminNote;
         app.reviewedAt = new Date();
         await app.save();
         return res.json({ success: true, message: 'Đã từ chối hồ sơ', data: app });
      }

      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi duyệt hồ sơ', error: error.message });
   }
};


