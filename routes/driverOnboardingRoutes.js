import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import multer from 'multer';
import { applyDriver, myApplication, adminListApplications, adminReviewApplication, adminGetApplicationById, getApplicationById } from '../controllers/driverOnboardingController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 30 } });
const router = express.Router();

// Danh sách quận/huyện hoạt động
router.get('/districts', (req, res) => {
   return res.json({
      success: true, data: [
         'Quận Cẩm Lệ', 'Quận Hải Châu', 'Quận Liên Chiểu', 'Quận Ngũ Hành Sơn',
         'Quận Sơn Trà', 'Quận Thanh Khê', 'Huyện Hòa Vang', 'Huyện Hoàng Sa'
      ]
   });
});

// User nộp hồ sơ nâng cấp lên tài xế
// form-data fields: licenseFront, licenseBack, idFront, idBack, portrait, vehiclePhotos[], vehicleDocs[]
const applyFields = upload.fields([
   { name: 'licenseFront', maxCount: 1 },
   { name: 'licenseBack', maxCount: 1 },
   { name: 'idFront', maxCount: 1 },
   { name: 'idBack', maxCount: 1 },
   { name: 'portrait', maxCount: 1 },
   { name: 'vehiclePhotos', maxCount: 20 },
   { name: 'vehicleDocs', maxCount: 20 }
]);

router.post('/apply', authenticate, (req, res, next) => {
   applyFields(req, res, (err) => {
      if (err) {
         return res.status(400).json({ success: false, message: err.message, code: err.code, field: err.field });
      }
      return applyDriver(req, res);
   });
});

// Xem hồ sơ của tôi
router.get('/my-application', authenticate, myApplication);
// Xem chi tiết hồ sơ (owner hoặc Admin)
router.get('/applications/:applicationId', authenticate, getApplicationById);

// Admin duyệt hồ sơ
router.get('/admin/applications', authenticate, authorize(roles.ADMIN), adminListApplications);
router.get('/admin/applications/:applicationId', authenticate, authorize(roles.ADMIN), adminGetApplicationById);
router.put('/admin/applications/:applicationId/review', authenticate, authorize(roles.ADMIN), adminReviewApplication);

export default router;


