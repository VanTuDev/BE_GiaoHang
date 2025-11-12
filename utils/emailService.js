import nodemailer from 'nodemailer';
import config from '../config/config.js';

// Log thông tin cấu hình email (ẩn mật khẩu)
console.log('Cấu hình email:', {
   host: 'smtp.gmail.com',
   port: 587,
   user: config.email.user || 'Chưa cấu hình',
   hasPassword: config.email.pass ? 'Đã cấu hình' : 'Chưa cấu hình'
});

// Tạo transporter để gửi email
let transporter;

// Kiểm tra nếu cấu hình email đã được thiết lập
if (config.email.user && config.email.pass) {
   transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
         user: config.email.user,
         pass: config.email.pass
      },
      secure: false,
      tls: {
         rejectUnauthorized: false
      },
      debug: true // Thêm debug để xem thông tin chi tiết
   });

   // Kiểm tra kết nối email
   transporter.verify((error, success) => {
      if (error) {
         console.error('Lỗi kết nối email:', error);
         console.error('Chi tiết lỗi email:', {
            name: error.name,
            code: error.code,
            command: error.command,
            message: error.message
         });
         console.log('=== HƯỚNG DẪN FIX LỖI EMAIL ===');
         console.log('1. Kiểm tra .env có EMAIL và EMAIL_PASSWORD đúng không');
         console.log('2. Nếu dùng Gmail, cần tạo App Password: https://myaccount.google.com/apppasswords');
         console.log('3. Trong Gmail, cần bật "Less secure app access" hoặc dùng OAuth2');
         console.log('=====================================');
      } else {
         console.log('Server email sẵn sàng nhận tin nhắn');
      }
   });
} else {
   console.warn('CẢNH BÁO: Thông tin email chưa được cấu hình trong .env');
   console.log('Chế độ TEST được kích hoạt, OTP sẽ chỉ hiển thị trên console!');
}

// Gửi email OTP để xác thực
export const sendOTPEmail = async (email, otp) => {
   try {
      console.log('Đang gửi email với mã OTP:', otp, 'tới địa chỉ:', email);

      if (!config.email.user || !config.email.pass) {
         console.error('CẢNH BÁO: Thông tin email chưa được cấu hình!');
         console.log(`[TEST MODE] OTP cho ${email}: ${otp}`);
         return { success: false, error: 'Email chưa được cấu hình, chỉ hiển thị OTP trên console' };
      }

      const mailOptions = {
         from: `"SPA Service" <${config.email.user}>`,
         to: email,
         subject: 'Xác thực tài khoản của bạn',
         html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Xác thực tài khoản</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP sau để xác thực tài khoản của bạn:</p>
          <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
            <strong>${otp}</strong>
          </div>
          <p>Mã OTP này sẽ hết hạn sau ${config.otpExpiry} phút.</p>
          <p>Nếu bạn không yêu cầu xác thực này, vui lòng bỏ qua email này.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            © ${new Date().getFullYear()} SPA Service. Tất cả các quyền đã được bảo lưu.
          </p>
        </div>
      `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email đã được gửi:', info.messageId);
      return { success: true };
   } catch (error) {
      console.error('Lỗi gửi email:', error);
      console.error('Chi tiết lỗi gửi email:', {
         name: error.name,
         code: error.code,
         command: error.command,
         message: error.message
      });
      console.log(`[TEST MODE] OTP cho ${email}: ${otp}`);
      return { success: false, error: error.message };
   }
};

// Gửi email chào mừng sau khi tài khoản được xác thực
export const sendWelcomeEmail = async (email, name) => {
   try {
      console.log('Đang gửi email chào mừng tới:', email);

      if (!config.email.user || !config.email.pass) {
         console.error('CẢNH BÁO: Thông tin email chưa được cấu hình!');
         console.log(`[TEST MODE] Email chào mừng cho ${email}`);
         return { success: false, error: 'Email chưa được cấu hình' };
      }

      const mailOptions = {
         from: `"SPA Service" <${config.email.user}>`,
         to: email,
         subject: 'Chào mừng bạn đến với SPA Service',
         html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Chào mừng, ${name}!</h2>
          <p>Tài khoản của bạn đã được xác thực thành công và bạn đã trở thành thành viên của SPA Service.</p>
          <p>Bạn có thể đăng nhập và sử dụng tất cả các tính năng của chúng tôi ngay bây giờ.</p>
          <div style="margin: 25px 0;">
            <a href="${config.clientURL}/login" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Đăng nhập</a>
          </div>
          <p>Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi!</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            © ${new Date().getFullYear()} SPA Service. Tất cả các quyền đã được bảo lưu.
          </p>
        </div>
      `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email chào mừng đã được gửi:', info.messageId);
      return { success: true };
   } catch (error) {
      console.error('Lỗi gửi email chào mừng:', error);
      console.error('Chi tiết lỗi gửi email:', {
         name: error.name,
         code: error.code,
         command: error.command,
         message: error.message
      });
      return { success: false, error: error.message };
   }
};

// Tạo transporter dự phòng với mailtrap.io nếu cần test
export const createTestTransporter = () => {
   return nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
         user: "your-mailtrap-user",
         pass: "your-mailtrap-pass"
      }
   });
};

// Gửi email khi tài khoản được duyệt làm tài xế
export const sendDriverApprovedEmail = async (email, name) => {
   try {
      if (!config.email.user || !config.email.pass) {
         console.log(`[TEST MODE] Driver approved for ${email} (${name})`);
         return { success: false, error: 'Email chưa được cấu hình' };
      }
      const mailOptions = {
         from: `"SPA Service" <${config.email.user}>`,
         to: email,
         subject: 'Bạn đã được cấp quyền Tài xế',
         html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Chúc mừng, ${name}!</h2>
          <p>Tài khoản của bạn đã được hệ thống duyệt và cấp quyền <strong>Tài xế</strong>.</p>
          <p>Bạn có thể đăng nhập và bắt đầu nhận đơn ngay bây giờ.</p>
          <div style="margin: 25px 0;">
            <a href="${config.clientURL}/login" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Đăng nhập</a>
          </div>
          <p>Chúc bạn có những chuyến đi an toàn và hiệu quả!</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            © ${new Date().getFullYear()} SPA Service.
          </p>
        </div>
      `
      };
      const info = await transporter.sendMail(mailOptions);
      console.log('Email approve driver đã được gửi:', info.messageId);
      return { success: true };
   } catch (error) {
      console.error('Lỗi gửi email approve driver:', error);
      return { success: false, error: error.message };
   }
};

// Gửi email thông báo tài xế bị cấm
export const sendDriverBannedEmail = async (email, name, reason, banDuration) => {
   try {
      if (!config.email.user || !config.email.pass) {
         console.log(`[TEST MODE] Driver banned email for ${email} (${name})`);
         return { success: false, error: 'Email chưa được cấu hình' };
      }

      const mailOptions = {
         from: `"Giao Hàng Đà Nẵng" <${config.email.user}>`,
         to: email,
         subject: '⚠️ Thông báo tài khoản bị tạm khóa',
         html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff0000; border-radius: 5px; background-color: #fff5f5;">
            <div style="background-color: #ff0000; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0; margin: -20px -20px 20px -20px;">
               <h2 style="margin: 0;">⚠️ THÔNG BÁO QUAN TRỌNG</h2>
            </div>
            
            <p>Kính gửi: <strong>${name}</strong>,</p>
            
            <p style="color: #d32f2f;">Tài khoản tài xế của bạn đã bị <strong>TẠM KHÓA</strong> do vi phạm quy định của hệ thống.</p>
            
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #ff0000; margin: 20px 0;">
               <h3 style="color: #d32f2f; margin-top: 0;">Lý do:</h3>
               <p style="margin: 10px 0;">${reason}</p>
               
               ${banDuration ? `
               <h3 style="color: #d32f2f; margin-top: 15px;">Thời gian khóa:</h3>
               <p style="margin: 10px 0;">${banDuration}</p>
               ` : ''}
            </div>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
               <h3 style="color: #1976d2; margin-top: 0;">📋 Hậu quả:</h3>
               <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Bạn không thể nhận đơn hàng mới</li>
                  <li>Bạn không thể truy cập các tính năng tài xế</li>
                  <li>Tài khoản sẽ bị đánh dấu trạng thái "Blocked"</li>
               </ul>
            </div>
            
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
               <h3 style="color: #f57c00; margin-top: 0;">📞 Liên hệ hỗ trợ:</h3>
               <p style="margin: 10px 0;">Nếu bạn có thắc mắc hoặc muốn khiếu nại, vui lòng liên hệ với chúng tôi qua:</p>
               <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Fanpage:</strong> <a href="https://facebook.com/giaohangdanang" target="_blank">Giao Hàng Đà Nẵng</a></li>
                  <li><strong>Hotline:</strong> 1900-xxxx</li>
                  <li><strong>Email:</strong> support@giaohangdanang.com</li>
               </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
               Chúng tôi rất tiếc vì sự bất tiện này. Hãy tuân thủ quy định để đảm bảo quyền lợi cho cả tài xế và khách hàng.
            </p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px;">
               © ${new Date().getFullYear()} Giao Hàng Đà Nẵng. Tất cả các quyền đã được bảo lưu.
            </p>
         </div>
         `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email thông báo cấm tài xế đã được gửi:', info.messageId);
      return { success: true };
   } catch (error) {
      console.error('❌ Lỗi gửi email thông báo cấm:', error);
      return { success: false, error: error.message };
   }
};

// Gửi email cảm ơn khách hàng sau khi admin xử lý báo cáo
export const sendReportResolvedEmail = async (email, customerName, violationType, resolution) => {
   try {
      if (!config.email.user || !config.email.pass) {
         console.log(`[TEST MODE] Report resolved email for ${email}`);
         return { success: false, error: 'Email chưa được cấu hình' };
      }

      const violationLabels = {
         LatePickup: 'Trễ lấy hàng',
         LateDelivery: 'Trễ giao hàng',
         RudeBehavior: 'Thái độ không tốt',
         DamagedGoods: 'Làm hỏng hàng hóa',
         Overcharging: 'Tính phí quá cao',
         UnsafeDriving: 'Lái xe không an toàn',
         NoShow: 'Không đến đúng giờ',
         Other: 'Khác'
      };

      const mailOptions = {
         from: `"Giao Hàng Đà Nẵng" <${config.email.user}>`,
         to: email,
         subject: '✅ Báo cáo của bạn đã được xử lý',
         html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #4CAF50; border-radius: 5px;">
            <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0; margin: -20px -20px 20px -20px;">
               <h2 style="margin: 0;">✅ CẢM ƠN BẠN ĐÃ PHẢN HỒI</h2>
            </div>
            
            <p>Kính gửi: <strong>${customerName}</strong>,</p>
            
            <p>Cảm ơn bạn đã gửi báo cáo vi phạm cho chúng tôi. Báo cáo của bạn đã được xem xét và xử lý.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
               <h3 style="color: #333; margin-top: 0;">📋 Thông tin báo cáo:</h3>
               <p style="margin: 10px 0;"><strong>Loại vi phạm:</strong> ${violationLabels[violationType] || violationType}</p>
               <p style="margin: 10px 0;"><strong>Kết quả xử lý:</strong> ${resolution}</p>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
               <h3 style="color: #1976d2; margin-top: 0;">🎯 Cam kết của chúng tôi:</h3>
               <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Xử lý nghiêm túc mọi vi phạm</li>
                  <li>Đảm bảo chất lượng dịch vụ tốt nhất</li>
                  <li>Bảo vệ quyền lợi khách hàng</li>
                  <li>Không ngừng cải thiện dịch vụ</li>
               </ul>
            </div>
            
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
               <h3 style="color: #f57c00; margin-top: 0;">📞 Cần hỗ trợ thêm?</h3>
               <p style="margin: 10px 0;">Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ với chúng tôi qua:</p>
               <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Fanpage:</strong> <a href="https://facebook.com/giaohangdanang" target="_blank" style="color: #1976d2;">Giao Hàng Đà Nẵng</a></li>
                  <li><strong>Hotline:</strong> 1900-xxxx</li>
                  <li><strong>Email:</strong> support@giaohangdanang.com</li>
               </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
               <a href="${config.clientURL}/user/orders" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Xem đơn hàng của tôi
               </a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
               Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi! 🙏
            </p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
               © ${new Date().getFullYear()} Giao Hàng Đà Nẵng. Tất cả các quyền đã được bảo lưu.
            </p>
         </div>
         `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email cảm ơn khách hàng đã được gửi:', info.messageId);
      return { success: true };
   } catch (error) {
      console.error('❌ Lỗi gửi email cảm ơn:', error);
      return { success: false, error: error.message };
   }
};

