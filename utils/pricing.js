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

export const calcOrderPrice = ({ weightKg, distanceKm, loadingService = false, loadingFee = 50000, insuranceFee = 0 }) => {
   const basePerKm = pricePerKmByWeight(weightKg);
   const distanceCost = Math.max(distanceKm || 0, 0) * basePerKm;
   const loadCost = loadingService ? loadingFee : 0;
   const total = distanceCost + loadCost + (insuranceFee || 0);
   return {
      basePerKm,
      distanceCost,
      loadCost,
      insuranceFee,
      total
   };
};


