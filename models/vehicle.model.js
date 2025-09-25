import mongoose from "mongoose";

// Phương tiện của tài xế
const vehicleSchema = new mongoose.Schema({
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
   type: {
      type: String,
      enum: [
         "TruckSmall",    // Xe tải nhỏ (0.5-1 tấn)
         "TruckMedium",   // Xe tải vừa (1-3 tấn)
         "TruckLarge",    // Xe tải to (3-5 tấn)
         "TruckBox",      // Xe thùng (5-10 tấn)
         "DumpTruck",     // Xe ben
         "PickupTruck",   // Xe bán tải
         "Trailer"        // Xe kéo
      ],
      required: true
   },
   licensePlate: { type: String, required: true },
   maxWeightKg: { type: Number, default: 1000 },
   vehicleDocs: [String],
   photoUrl: { type: String },
   status: { type: String, enum: ["Active", "Maintenance", "Inactive"], default: "Active" },
   description: { type: String },
   features: [String],
}, { timestamps: true });

export default mongoose.model("Vehicle", vehicleSchema);