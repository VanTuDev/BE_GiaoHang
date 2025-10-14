import bcrypt from 'bcrypt';
import User from '../models/user.model.js';
import Otp from '../models/otp.model.js';
import { signAccessToken } from '../utils/jwt.js';
import config from '../config/config.js';
import { sendOTPEmail } from '../utils/emailService.js';

export const register = async (req, res) => {
   try {
      let { name, email, phone, password, role } = req.body;
      if (email) email = String(email).trim().toLowerCase();
      if (phone) phone = String(phone).trim();
      if (!phone || !password || !name) {
         return res.status(400).json({ success: false, message: 'Thiếu tên, số điện thoại hoặc mật khẩu' });
      }

      // Cho phép đăng ký bằng email hoặc không email, nhưng nếu có email thì unique
      if (email) {
         const emailExists = await User.findOne({ email });
         if (emailExists) return res.status(409).json({ success: false, message: 'Email đã tồn tại' });
      }

      const phoneExists = await User.findOne({ phone });
      if (phoneExists) return res.status(409).json({ success: false, message: 'Số điện thoại đã tồn tại' });

      const passwordHash = await bcrypt.hash(password, 10);
      const normalizedRole = ['Customer', 'Driver', 'Admin'].includes(role) ? role : 'Customer';
      const user = await User.create({ name, email, phone, passwordHash, role: normalizedRole });

      // Tạo OTP xác thực nếu có email
      if (email) {
         const code = Math.floor(100000 + Math.random() * 900000).toString();
         const expiresAt = new Date(Date.now() + config.otpExpiry * 60 * 1000);
         await Otp.create({ userId: user._id, code, purpose: 'verify_email', expiresAt });
         await sendOTPEmail(email, code);
      }

      return res.status(201).json({ success: true, message: 'Đăng ký thành công. Vui lòng xác thực email nếu đã cung cấp email.' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi đăng ký', error: error.message });
   }
};

export const login = async (req, res) => {
   try {
      let { email, phone, password } = req.body;
      if (email) email = String(email).trim().toLowerCase();
      if (phone) phone = String(phone).trim();
      if ((!email && !phone) || !password) {
         return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng nhập' });
      }

      const user = email ? await User.findOne({ email }) : await User.findOne({ phone });
      if (!user) {
         return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
         return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
      }

      // Nếu có email thì yêu cầu đã xác thực email mới cho đăng nhập
      if (user.email && !user.isEmailVerified) {
         return res.status(403).json({ success: false, message: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư để nhập mã OTP.' });
      }

      const accessToken = signAccessToken(user);
      return res.status(200).json({
         success: true,
         data: {
            user: {
               id: user._id,
               name: user.name,
               email: user.email,
               phone: user.phone,
               role: user.role
            },
            accessToken
         }
      });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi đăng nhập', error: error.message });
   }
};

// refresh/logout đã được loại bỏ theo yêu cầu

export const verifyEmail = async (req, res) => {
   try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ success: false, message: 'Thiếu email hoặc mã OTP' });

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

      const otp = await Otp.findOne({ userId: user._id, code, purpose: 'verify_email', used: false, expiresAt: { $gt: new Date() } });
      if (!otp) return res.status(400).json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });

      user.isEmailVerified = true;
      await user.save();
      otp.used = true;
      await otp.save();

      return res.json({ success: true, message: 'Xác thực email thành công' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi xác thực email', error: error.message });
   }
};

export const forgotPassword = async (req, res) => {
   try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Thiếu email' });

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + config.otpExpiry * 60 * 1000);
      await Otp.create({ userId: user._id, code, purpose: 'reset_password', expiresAt });
      await sendOTPEmail(email, code);

      return res.json({ success: true, message: 'Đã gửi OTP đặt lại mật khẩu' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi quên mật khẩu', error: error.message });
   }
};

export const resetPassword = async (req, res) => {
   try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

      const otp = await Otp.findOne({ userId: user._id, code, purpose: 'reset_password', used: false, expiresAt: { $gt: new Date() } });
      if (!otp) return res.status(400).json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await user.save();
      otp.used = true;
      await otp.save();

      return res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi đặt lại mật khẩu', error: error.message });
   }
};


