import mongoose from 'mongoose';

const driverApplicationSchema = new mongoose.Schema({
   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
   status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
   adminNote: { type: String },
   emailVerifiedAt: { type: Date },
   docs: {
      licenseFrontUrl: String,
      licenseBackUrl: String,
      idCardFrontUrl: String,
      idCardBackUrl: String,
      portraitUrl: String,
      vehiclePhotos: [String],
      vehicleDocs: [String]
   },
   reviewedAt: { type: Date },
   submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('DriverApplication', driverApplicationSchema);


