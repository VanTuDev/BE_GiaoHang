import Payment from '../models/payment.model.js';
import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';
import DriverTransaction from '../models/driverTransaction.model.js';
import { vnpay } from '../config/vnpay.js';

// Tạo URL thanh toán VNPay cho 1 order/item
export const createVNPayPayment = async (req, res) => {
   try {
      const { orderId, orderItemId, amount, bankCode } = req.body || {};
      if (!orderId || !amount) {
         return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc amount' });
      }

      // Kiểm tra đơn
      const order = await Order.findById(orderId);
      if (!order) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      // Lưu Payment Pending
      const payment = await Payment.create({
         orderId,
         orderItemId: orderItemId || undefined,
         method: 'VNPay',
         amount,
         status: 'Pending'
      });

      // Tạo URL thanh toán
      const paymentUrl = vnpay.buildPaymentUrl({
         vnp_Amount: Math.round(Number(amount) * 100),
         vnp_IpAddr: req.ip,
         vnp_TxnRef: String(payment._id),
         vnp_OrderInfo: `Order ${orderId}${orderItemId ? ` - Item ${orderItemId}` : ''}`,
         vnp_ReturnUrl: process.env.VNP_RETURN_URL,
         vnp_BankCode: bankCode || undefined
      });

      return res.json({ success: true, paymentUrl, paymentId: payment._id });
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán VNPay', error: error.message });
   }
};

// IPN từ VNPay: xác thực và cập nhật DB
export const vnpIpn = async (req, res) => {
   try {
      const isValid = vnpay.verifyIpn(req.query);
      if (!isValid) return res.status(400).send('Invalid checksum');

      const txnRef = req.query['vnp_TxnRef']; // paymentId
      const rsp = req.query['vnp_ResponseCode']; // '00' success
      const vnpAmount = Number(req.query['vnp_Amount'] || 0) / 100;

      const payment = await Payment.findById(txnRef);
      if (!payment) return res.status(404).send('Payment not found');

      // Idempotent
      if (payment.status === 'Paid') return res.status(200).send('OK');

      if (rsp === '00') {
         payment.status = 'Paid';
         payment.transactionCode = req.query['vnp_TransactionNo'];
         await payment.save();

         const order = await Order.findById(payment.orderId);
         if (order) {
            // Xác định item để đánh dấu Delivered
            let targetItem = null;
            if (payment.orderItemId) {
               targetItem = order.items.id(payment.orderItemId);
            } else {
               targetItem = order.items.find(i => i.status !== 'Delivered' && i.driverId);
            }

            if (targetItem) {
               targetItem.status = 'Delivered';
               targetItem.deliveredAt = new Date();

               const amountGross = Number(targetItem?.priceBreakdown?.total || payment.amount || vnpAmount) || 0;
               const fee = Math.round(amountGross * 0.2);
               const net = amountGross - fee;

               // Cộng ví tài xế + log giao dịch
               if (targetItem.driverId) {
                  const driver = await Driver.findById(targetItem.driverId);
                  if (driver) {
                     await DriverTransaction.create({
                        driverId: driver._id,
                        orderId: order._id,
                        orderItemId: targetItem._id,
                        amount: amountGross,
                        fee,
                        netAmount: net,
                        type: 'OrderEarning',
                        status: 'Completed',
                        description: `Thu nhập từ đơn hàng #${order._id}`
                     });
                     await Driver.findByIdAndUpdate(driver._id, { $inc: { incomeBalance: net, totalTrips: 1 } });
                  }
               }

               // TODO: Cộng ví Admin nếu có mô hình ví Admin

               await order.save();

               // Cập nhật trạng thái tổng của đơn hàng (tương tự helper)
               const allDelivered = order.items.every(i => i.status === 'Delivered');
               const allCancelled = order.items.every(i => i.status === 'Cancelled');
               if (allDelivered) {
                  order.status = 'Completed';
                  await order.save();
               } else if (allCancelled) {
                  order.status = 'Cancelled';
                  await order.save();
               } else {
                  const anyActive = order.items.some(i => ['Accepted', 'PickedUp', 'Delivering'].includes(i.status));
                  if (anyActive && order.status !== 'InProgress') {
                     order.status = 'InProgress';
                     await order.save();
                  }
               }
            }
         }

         return res.status(200).send('OK');
      } else {
         payment.status = 'Failed';
         await payment.save();
         return res.status(200).send('OK');
      }
   } catch (error) {
      return res.status(500).send('ERROR');
   }
};


