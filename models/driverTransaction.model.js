import mongoose from 'mongoose';

// Giao dịch tài xế: thu nhập, hoa hồng, thanh toán
const driverTransactionSchema = new mongoose.Schema({
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
   orderItemId: { type: mongoose.Schema.Types.ObjectId },
   amount: { type: Number, required: true }, // Số tiền giao dịch (VND)
   fee: { type: Number, required: true }, // Phí hoa hồng (VND)
   netAmount: { type: Number, required: true }, // Số tiền thực nhận = amount - fee
   type: { type: String, enum: ['OrderEarning', 'Withdrawal', 'Bonus', 'Penalty'], required: true },
   status: { type: String, enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], default: 'Completed' },
   description: { type: String },
   paymentMethod: { type: String },
   transactionDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('DriverTransaction', driverTransactionSchema);