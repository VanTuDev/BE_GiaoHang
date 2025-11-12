// Bảng giá theo trọng tải (VNĐ/km)
// 0.5-1 tấn: 40k, 1-3 tấn: 60k, 3-5 tấn: 80k, 5-10 tấn: 100k
export const pricePerKmByWeight = (weightKg) => {
   const ton = weightKg / 1000;
   if (ton <= 1) return 40000;
   if (ton <= 3) return 60000;
   if (ton <= 5) return 80000;
   if (ton <= 10) return 100000;
   // Ngoài khung -> thoả thuận
   return 150000;
};

/**
 * Tính giá đơn hàng
 * Công thức: Tổng = (Số km × Giá/km) + Phí bốc xếp + Phí bảo hiểm
 * 
 * @param {number} weightKg - Trọng lượng hàng hóa (kg)
 * @param {number} distanceKm - Khoảng cách vận chuyển (km)
 * @param {boolean} loadingService - Có sử dụng dịch vụ bốc xếp không
 * @param {number} loadingFee - Phí bốc xếp (mặc định 50k)
 * @param {number} insuranceFee - Phí bảo hiểm (mặc định 0)
 * @param {number} pricePerKm - Giá/km từ xe tài xế (tùy chọn)
 * @returns {object} priceBreakdown - Chi tiết giá cả
 */
export const calcOrderPrice = ({ weightKg, distanceKm, loadingService = false, loadingFee = 50000, insuranceFee = 0, pricePerKm = null }) => {
   // Bước 1: Tính giá cơ bản trên 1km
   // Ưu tiên dùng pricePerKm từ xe nếu có, nếu không thì tính theo trọng lượng
   let basePerKm;
   if (pricePerKm && pricePerKm > 0) {
      basePerKm = Number(pricePerKm);
   } else {
      basePerKm = pricePerKmByWeight(weightKg);
   }

   // Bước 2: Tính cước phí theo khoảng cách = Số km × Giá/km
   const distanceCost = Math.max(distanceKm || 0, 0) * basePerKm;

   // Bước 3: Phí bốc xếp (chỉ tính nếu có dịch vụ)
   const loadCost = loadingService ? (loadingFee || 50000) : 0;

   // Bước 4: Phí bảo hiểm
   const insurance = insuranceFee || 0;

   // Bước 5: Tổng = Cước phí + Phí bốc xếp + Phí bảo hiểm
   const total = distanceCost + loadCost + insurance;

   return {
      basePerKm,
      distanceCost,
      loadCost,
      insuranceFee: insurance,
      total
   };
};


