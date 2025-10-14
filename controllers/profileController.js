import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import cloudinary from '../config/cloudinary.js';

const uploadStream = (buffer, folder) => new Promise((resolve, reject) => {
   const s = cloudinary.uploader.upload_stream({ folder }, (err, result) => err ? reject(err) : resolve(result));
   s.end(buffer);
});

// Lấy thông tin profile của người dùng hiện tại
export const getProfile = async (req, res) => {
   try {
      const userId = req.user._id;
      const user = await User.findById(userId).select('-passwordHash');

      if (!user) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      return res.json({ success: true, data: user });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin profile', error: error.message });
   }
};

// Cập nhật thông tin profile
export const updateProfile = async (req, res) => {
   try {
      const userId = req.user._id;
      const { name, phone, address } = req.body;

      // Kiểm tra dữ liệu đầu vào
      if (!name) {
         return res.status(400).json({ success: false, message: 'Tên không được để trống' });
      }

      // Cập nhật thông tin
      const updatedUser = await User.findByIdAndUpdate(
         userId,
         { $set: { name, phone, address } },
         { new: true }
      ).select('-passwordHash');

      if (!updatedUser) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      return res.json({ success: true, data: updatedUser, message: 'Cập nhật thông tin thành công' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin profile', error: error.message });
   }
};

// Upload avatar
export const uploadAvatar = async (req, res) => {
   try {
      const userId = req.user._id;

      // Kiểm tra dữ liệu đầu vào
      const { avatarUrl } = req.body;

      if (!avatarUrl) {
         return res.status(400).json({ success: false, message: 'URL avatar không được để trống' });
      }

      // Cập nhật URL avatar trong database
      const updatedUser = await User.findByIdAndUpdate(
         userId,
         { $set: { avatarUrl } },
         { new: true }
      ).select('-passwordHash');

      if (!updatedUser) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      // Nếu là tài xế, cập nhật cả trong bảng Driver
      if (req.user.role === 'Driver' || (Array.isArray(req.user.roles) && req.user.roles.includes('Driver'))) {
         await Driver.findOneAndUpdate(
            { userId },
            { $set: { avatarUrl } }
         );
      }

      return res.json({
         success: true,
         data: { avatarUrl, user: updatedUser },
         message: 'Cập nhật avatar thành công'
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật avatar', error: error.message });
   }
};

// Lấy thông tin profile tài xế (bao gồm cả thông tin user)
export const getDriverProfile = async (req, res) => {
   try {
      const userId = req.user._id;

      // Lấy thông tin tài xế
      const driver = await Driver.findOne({ userId }).populate('userId', '-passwordHash');

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài xế' });
      }

      return res.json({ success: true, data: driver });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin tài xế', error: error.message });
   }
};

// Cập nhật khu vực hoạt động của tài xế
export const updateServiceAreas = async (req, res) => {
   try {
      const userId = req.user._id;
      const { serviceAreas } = req.body;

      if (!Array.isArray(serviceAreas)) {
         return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
      }

      // Cập nhật khu vực hoạt động
      const updatedDriver = await Driver.findOneAndUpdate(
         { userId },
         { $set: { serviceAreas } },
         { new: true }
      );

      if (!updatedDriver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài xế' });
      }

      return res.json({
         success: true,
         data: updatedDriver,
         message: 'Cập nhật khu vực hoạt động thành công'
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật khu vực hoạt động', error: error.message });
   }
};