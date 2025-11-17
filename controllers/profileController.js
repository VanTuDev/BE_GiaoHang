import bcrypt from 'bcrypt';
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

// Cập nhật thông tin ngân hàng của tài xế
export const updateDriverBankInfo = async (req, res) => {
   try {
      const userId = req.user._id;
      const { bankAccountName, bankAccountNumber, bankName, bankCode } = req.body || {};

      if (!bankAccountName || !bankAccountNumber || !bankName) {
         return res.status(400).json({ success: false, message: 'Thiếu thông tin ngân hàng bắt buộc' });
      }

      const updatedDriver = await Driver.findOneAndUpdate(
         { userId },
         { $set: { bankAccountName, bankAccountNumber, bankName, bankCode } },
         { new: true }
      );

      if (!updatedDriver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài xế' });
      }

      return res.json({ success: true, data: updatedDriver, message: 'Cập nhật thông tin ngân hàng thành công' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin ngân hàng', error: error.message });
   }
};

// Cập nhật vị trí hiện tại của tài xế
export const updateDriverLocation = async (req, res) => {
   try {
      const userId = req.user._id;
      const { latitude, longitude } = req.body;

      // Validate tọa độ
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
         return res.status(400).json({ success: false, message: 'Tọa độ không hợp lệ' });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
         return res.status(400).json({ success: false, message: 'Tọa độ nằm ngoài phạm vi hợp lệ' });
      }

      // Cập nhật vị trí (GeoJSON format: [longitude, latitude])
      const updatedDriver = await Driver.findOneAndUpdate(
         { userId },
         {
            $set: {
               currentLocation: {
                  type: 'Point',
                  coordinates: [longitude, latitude]
               },
               locationUpdatedAt: new Date()
            }
         },
         { new: true }
      );

      if (!updatedDriver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài xế' });
      }

      return res.json({
         success: true,
         data: {
            currentLocation: updatedDriver.currentLocation,
            locationUpdatedAt: updatedDriver.locationUpdatedAt
         },
         message: 'Cập nhật vị trí thành công'
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật vị trí', error: error.message });
   }
};

// Đổi mật khẩu (cho Customer và Driver)
export const changePassword = async (req, res) => {
   try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;

      // Kiểm tra dữ liệu đầu vào
      if (!currentPassword || !newPassword) {
         return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
      }

      if (newPassword.length < 6) {
         return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      }

      // Lấy thông tin user
      const user = await User.findById(userId);
      if (!user) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      // Kiểm tra mật khẩu hiện tại
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
         return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
      }

      // Cập nhật mật khẩu mới
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(userId, { passwordHash });

      return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi đổi mật khẩu', error: error.message });
   }
};