import User from '../models/user.model.js';

// GET /api/admin/users?role=Customer|Driver|Admin&search=...&page=1&limit=20&sort=createdAt:desc
export const getUsers = async (req, res) => {
   try {
      const { role, search, page = 1, limit = 20, sort = 'createdAt:desc' } = req.query;

      const query = {};
      if (role && ['Customer', 'Driver', 'Admin'].includes(role)) {
         query.role = role;
      }

      if (search) {
         const s = String(search).trim();
         query.$or = [
            { name: { $regex: s, $options: 'i' } },
            { email: { $regex: s, $options: 'i' } },
            { phone: { $regex: s, $options: 'i' } },
         ];
      }

      const [sortField, sortDirRaw] = String(sort).split(':');
      const sortDir = (sortDirRaw || 'desc').toLowerCase() === 'asc' ? 1 : -1;
      const sortObj = { [sortField || 'createdAt']: sortDir };

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
         User.find(query)
            .select('-passwordHash -refreshToken')
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum),
         User.countDocuments(query)
      ]);

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
      return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng', error: error.message });
   }
};

// GET /api/admin/users/:id
export const getUserById = async (req, res) => {
   try {
      const { id } = req.params;
      const user = await User.findById(id).select('-passwordHash -refreshToken');
      if (!user) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
      return res.json({ success: true, data: user });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi lấy thông tin người dùng', error: error.message });
   }
};


