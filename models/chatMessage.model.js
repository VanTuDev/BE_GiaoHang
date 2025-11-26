import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
   orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
   },
   orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
   },
   driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true
   },
   customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
   },
   senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
   },
   senderRole: {
      type: String,
      enum: ['Customer', 'Driver', 'System'],
      required: true
   },
   message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
   },
   isSystem: {
      type: Boolean,
      default: false
   },
   readByCustomerAt: {
      type: Date
   },
   readByDriverAt: {
      type: Date
   }
}, { timestamps: true });

chatMessageSchema.index({ orderId: 1, orderItemId: 1, createdAt: 1 });
chatMessageSchema.index({ driverId: 1, createdAt: -1 });
chatMessageSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.model('ChatMessage', chatMessageSchema);












