import Vehicle from '../models/vehicle.model.js';
import Driver from '../models/driver.model.js';
import User from '../models/user.model.js';
import cloudinary from '../config/cloudinary.js';
import multer from 'multer';

// Upload helper
const uploadToCloudinary = (buffer, folder) => new Promise((resolve, reject) => {
   const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
   });
   stream.end(buffer);
});

// List vehicles cho khách: lọc theo type hoặc theo maxWeightKg >= weightNeeded
export const listVehicles = async (req, res) => {
   try {
      const { type, weightKg, page = 1, limit = 12, district, onlineOnly } = req.query;
      const query = {};
      if (type) query.type = type;
      if (weightKg) query.maxWeightKg = { $gte: Number(weightKg) };
      query.status = 'Active'; // Chỉ lấy xe đang hoạt động

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      // Lọc online và khu vực: cần populate driver và filter theo điều kiện
      const driverMatch = {};
      if (String(onlineOnly).toLowerCase() === 'true') driverMatch.isOnline = true;
      if (district) driverMatch.serviceAreas = { $in: [district] };

      const [itemsRaw, total] = await Promise.all([
         Vehicle.find(query)
            .populate({
               path: 'driverId',
               match: driverMatch,
               select: 'status isOnline serviceAreas rating totalTrips userId',
               populate: {
                  path: 'userId',
                  select: 'name phone'
               }
            })
            .skip(skip)
            .limit(limitNum),
         Vehicle.countDocuments(query)
      ]);

      // Nếu có điều kiện driverMatch thì lọc bỏ những xe không có driver match
      const items = (driverMatch && Object.keys(driverMatch).length)
         ? itemsRaw.filter(v => v.driverId)
         : itemsRaw;

      return res.json({
         success: true,
         data: items,
         meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách xe', error: error.message });
   }
};

// Danh sách loại xe dùng cho FE hiển thị card
export const getVehicleTypes = async (req, res) => {
   const types = [
      {
         type: 'TruckSmall',
         label: 'Xe tải nhỏ',
         maxWeightKg: 1000,
         pricePerKm: 40000,
         description: 'Phù hợp cho hàng nhỏ, nhẹ (0.5-1 tấn)',
         sampleImage: '/imgs/small-truck.jpg'
      },
      {
         type: 'TruckMedium',
         label: 'Xe tải vừa',
         maxWeightKg: 3000,
         pricePerKm: 60000,
         description: 'Phù hợp cho hàng trung bình (1-3 tấn)',
         sampleImage: '/imgs/medium-truck.png'
      },
      {
         type: 'TruckLarge',
         label: 'Xe tải to',
         maxWeightKg: 10000,
         pricePerKm: 100000,
         description: 'Phù hợp cho hàng lớn, nặng (5-10 tấn)',
         sampleImage: '/imgs/large-truck.jpg'
      },
      {
         type: 'TruckBox',
         label: 'Xe thùng',
         maxWeightKg: 5000,
         pricePerKm: 80000,
         description: 'Bảo vệ hàng hóa tốt, chống nước (3-5 tấn)',
         sampleImage: '/imgs/box-truck.png'
      },
      {
         type: 'DumpTruck',
         label: 'Xe ben',
         maxWeightKg: 10000,
         pricePerKm: 100000,
         description: 'Phù hợp cho vật liệu xây dựng, đất đá',
         sampleImage: '/imgs/bright-yellow-dump-truck.png'
      },
      {
         type: 'PickupTruck',
         label: 'Xe bán tải',
         maxWeightKg: 800,
         pricePerKm: 40000,
         description: 'Linh hoạt, phù hợp hàng nhỏ, đường hẹp',
         sampleImage: '/imgs/classic-red-pickup.png'
      },
      {
         type: 'Trailer',
         label: 'Xe kéo',
         maxWeightKg: 20000,
         pricePerKm: 150000,
         description: 'Vận chuyển hàng siêu trọng, container',
         sampleImage: '/imgs/trailer-truck.jpg'
      }
   ];
   return res.json({ success: true, data: types });
};

// Driver thêm xe mới
export const addVehicle = async (req, res) => {
   try {
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      const { type, licensePlate, maxWeightKg, description, features, photoUrl } = req.body;

      if (!type || !licensePlate) {
         return res.status(400).json({ success: false, message: 'Thiếu thông tin loại xe hoặc biển số' });
      }

      // Sử dụng photoUrl từ request.body nếu có
      let finalPhotoUrl = photoUrl || '';

      // Upload ảnh xe nếu có file
      if (req.file) {
         finalPhotoUrl = await uploadToCloudinary(req.file.buffer, 'vehicles');
      }

      const vehicle = await Vehicle.create({
         driverId: driver._id,
         type,
         licensePlate,
         maxWeightKg: Number(maxWeightKg) || 1000,
         photoUrl: finalPhotoUrl,
         description,
         features: Array.isArray(features) ? features : (features ? [features] : []),
         status: 'Active'
      });

      return res.status(201).json({ success: true, data: vehicle });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi thêm xe', error: error.message });
   }
};

// Driver cập nhật thông tin xe
export const updateVehicle = async (req, res) => {
   try {
      const { vehicleId } = req.params;
      const driver = await Driver.findOne({ userId: req.user._id });

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      // Kiểm tra xe có thuộc về tài xế không
      const vehicle = await Vehicle.findOne({ _id: vehicleId, driverId: driver._id });
      if (!vehicle) {
         return res.status(403).json({ success: false, message: 'Không có quyền cập nhật xe này' });
      }

      const { type, licensePlate, maxWeightKg, description, features, status, photoUrl } = req.body;
      const updateData = {};

      if (type) updateData.type = type;
      if (licensePlate) updateData.licensePlate = licensePlate;
      if (maxWeightKg) updateData.maxWeightKg = Number(maxWeightKg);
      if (description) updateData.description = description;
      if (features) updateData.features = Array.isArray(features) ? features : [features];
      if (status) updateData.status = status;

      // Sử dụng photoUrl từ request.body nếu có
      if (photoUrl) {
         updateData.photoUrl = photoUrl;
      }

      // Upload ảnh xe mới nếu có file
      if (req.file) {
         updateData.photoUrl = await uploadToCloudinary(req.file.buffer, 'vehicles');
      }

      const updatedVehicle = await Vehicle.findByIdAndUpdate(
         vehicleId,
         { $set: updateData },
         { new: true }
      );

      return res.json({ success: true, data: updatedVehicle });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật xe', error: error.message });
   }
};

// Driver xóa xe
export const deleteVehicle = async (req, res) => {
   try {
      const { vehicleId } = req.params;
      const driver = await Driver.findOne({ userId: req.user._id });

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      // Kiểm tra xe có thuộc về tài xế không
      const vehicle = await Vehicle.findOne({ _id: vehicleId, driverId: driver._id });
      if (!vehicle) {
         return res.status(403).json({ success: false, message: 'Không có quyền xóa xe này' });
      }

      await Vehicle.findByIdAndDelete(vehicleId);
      return res.json({ success: true, message: 'Đã xóa xe thành công' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi xóa xe', error: error.message });
   }
};

// Driver lấy danh sách xe của mình
export const getMyVehicles = async (req, res) => {
   try {
      const driver = await Driver.findOne({ userId: req.user._id });

      if (!driver) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ tài xế' });
      }

      const vehicles = await Vehicle.find({ driverId: driver._id });
      return res.json({ success: true, data: vehicles });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách xe', error: error.message });
   }
};