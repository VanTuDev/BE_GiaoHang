import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
   code: { type: String, required: true },
   purpose: { type: String, enum: ['verify_email', 'reset_password'], required: true },
   expiresAt: { type: Date, required: true, index: true },
   used: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Otp', otpSchema);


