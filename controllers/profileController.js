import cloudinary from '../config/cloudinary.js';
import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import Vehicle from '../models/vehicle.model.js';

const uploadToCloudinary = async (buffer, folder) => {
   return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
         if (err) return reject(err);
         resolve(result);
      });
      stream.end(buffer);
   });
};

// USER PROFILE CRUD
export const getMyProfile = async (req, res) => {
   const user = await User.findById(req.user._id).select('-passwordHash -refreshToken');
   return res.json({ success: true, data: user });
};

export const updateMyProfile = async (req, res) => {
   const { name, address } = req.body;
   const update = {};
   if (name) update.name = name;
   if (address) update.address = address;
   const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('-passwordHash -refreshToken');
   return res.json({ success: true, data: user });
};

export const uploadMyAvatar = async (req, res) => {
   try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Thiếu file' });
      const result = await uploadToCloudinary(req.file.buffer, 'profiles/users');
      const user = await User.findByIdAndUpdate(req.user._id, { $set: { avatarUrl: result.secure_url } }, { new: true }).select('-passwordHash -refreshToken');
      return res.json({ success: true, data: user });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi upload ảnh', error: error.message });
   }
};

// DRIVER PROFILE CRUD
export const getMyDriverProfile = async (req, res) => {
   const driver = await Driver.findOne({ userId: req.user._id }).populate('vehicleId');
   return res.json({ success: true, data: driver });
};

export const upsertMyDriverProfile = async (req, res) => {
   const { status } = req.body;
   const driver = await Driver.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { status } },
      { upsert: true, new: true }
   );
   return res.json({ success: true, data: driver });
};

export const uploadMyDriverAvatar = async (req, res) => {
   try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Thiếu file' });
      const result = await uploadToCloudinary(req.file.buffer, 'profiles/drivers');
      const driver = await Driver.findOneAndUpdate(
         { userId: req.user._id },
         { $set: { avatarUrl: result.secure_url } },
         { upsert: true, new: true }
      );
      return res.json({ success: true, data: driver });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi upload ảnh', error: error.message });
   }
};

// VEHICLE CRUD (driver)
export const upsertMyVehicle = async (req, res) => {
   const { type, licensePlate } = req.body;
   let driver = await Driver.findOne({ userId: req.user._id });
   if (!driver) driver = await Driver.create({ userId: req.user._id });

   let vehicle = await Vehicle.findOneAndUpdate(
      { driverId: driver._id },
      { $set: { type, licensePlate } },
      { upsert: true, new: true }
   );

   // Liên kết vào driver
   if (!driver.vehicleId || String(driver.vehicleId) !== String(vehicle._id)) {
      driver.vehicleId = vehicle._id;
      await driver.save();
   }

   return res.json({ success: true, data: vehicle });
};

export const uploadMyVehiclePhoto = async (req, res) => {
   try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Thiếu file' });
      const result = await uploadToCloudinary(req.file.buffer, 'profiles/vehicles');
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) return res.status(404).json({ success: false, message: 'Chưa có hồ sơ tài xế' });
      const vehicle = await Vehicle.findOneAndUpdate(
         { driverId: driver._id },
         { $set: { photoUrl: result.secure_url } },
         { upsert: true, new: true }
      );
      return res.json({ success: true, data: vehicle });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi upload ảnh', error: error.message });
   }
};

export const updateDriverServiceAreas = async (req, res) => {
   try {
      const { serviceAreas, isOnline } = req.body; // serviceAreas: string[] (tên quận/huyện)
      const allowed = [
         'Quận Cẩm Lệ', 'Quận Hải Châu', 'Quận Liên Chiểu', 'Quận Ngũ Hành Sơn',
         'Quận Sơn Trà', 'Quận Thanh Khê', 'Huyện Hòa Vang', 'Huyện Hoàng Sa'
      ];
      const areas = Array.isArray(serviceAreas) ? serviceAreas.filter(a => allowed.includes(a)) : [];
      const driver = await Driver.findOneAndUpdate(
         { userId: req.user._id },
         { $set: { serviceAreas: areas, ...(typeof isOnline === 'boolean' ? { isOnline, lastOnlineAt: new Date() } : {}) } },
         { upsert: true, new: true }
      );
      return res.json({ success: true, data: driver });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật phạm vi hoạt động', error: error.message });
   }
};


