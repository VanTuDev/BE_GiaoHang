import Vehicle from '../models/vehicle.model.js';
import Driver from '../models/driver.model.js';

// List vehicles cho khách: lọc theo type hoặc theo maxWeightKg >= weightNeeded
export const listVehicles = async (req, res) => {
   try {
      const { type, weightKg, page = 1, limit = 12, district, onlineOnly } = req.query;
      const query = {};
      if (type) query.type = type;
      if (weightKg) query.maxWeightKg = { $gte: Number(weightKg) };

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
      const skip = (pageNum - 1) * limitNum;

      // Lọc online và khu vực: cần populate driver và filter theo điều kiện
      const driverMatch = {};
      if (String(onlineOnly).toLowerCase() === 'true') driverMatch.isOnline = true;
      if (district) driverMatch.serviceAreas = { $in: [district] };

      const [itemsRaw, total] = await Promise.all([
         Vehicle.find(query)
            .populate({ path: 'driverId', match: driverMatch, select: 'status isOnline serviceAreas' })
            .skip(skip)
            .limit(limitNum),
         Vehicle.countDocuments(query)
      ]);

      // Nếu có điều kiện driverMatch thì lọc bỏ những xe không có driver match
      const items = (driverMatch && Object.keys(driverMatch).length)
         ? itemsRaw.filter(v => v.driverId)
         : itemsRaw;

      return res.json({ success: true, data: items, meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách xe', error: error.message });
   }
};

// Danh sách loại xe dùng cho FE hiển thị card
export const getVehicleTypes = async (req, res) => {
   const types = [
      { type: 'TruckSmall', label: 'Xe tải nhỏ', maxWeightKg: 1000, sampleImage: 'https://placehold.co/600x400?text=TruckSmall' },
      { type: 'TruckMedium', label: 'Xe tải vừa', maxWeightKg: 3000, sampleImage: 'https://placehold.co/600x400?text=TruckMedium' },
      { type: 'TruckLarge', label: 'Xe tải to', maxWeightKg: 10000, sampleImage: 'https://placehold.co/600x400?text=TruckLarge' },
      { type: 'TruckBox', label: 'Xe thùng', maxWeightKg: 5000, sampleImage: 'https://placehold.co/600x400?text=TruckBox' },
      { type: 'DumpTruck', label: 'Xe ben', maxWeightKg: 10000, sampleImage: 'https://placehold.co/600x400?text=DumpTruck' },
      { type: 'PickupTruck', label: 'Xe bán tải', maxWeightKg: 800, sampleImage: 'https://placehold.co/600x400?text=PickupTruck' },
      { type: 'Trailer', label: 'Xe kéo', maxWeightKg: 20000, sampleImage: 'https://placehold.co/600x400?text=Trailer' }
   ];
   return res.json({ success: true, data: types });
};


