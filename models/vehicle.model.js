import mongoose from "mongoose";

// Phương tiện của tài xế
const vehicleSchema = new mongoose.Schema({
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
   type: { type: String, enum: ["Motorbike", "Pickup", "TruckSmall", "TruckBox", "DumpTruck", "PickupTruck", "Trailer", "TruckMedium", "TruckLarge"], required: true },
   licensePlate: { type: String, required: true },
   maxWeightKg: { type: Number, default: 1000 },
   vehicleDocs: [String],
   photoUrl: { type: String },
}, { timestamps: true });

export default mongoose.model("Vehicle", vehicleSchema);
