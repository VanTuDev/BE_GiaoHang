import mongoose from 'mongoose';
import ChatMessage from '../models/chatMessage.model.js';
import Order from '../models/order.model.js';
import Driver from '../models/driver.model.js';

const MAX_HISTORY_LIMIT = 100;
const LONG_POLL_TIMEOUT_MS = 25000;
const LONG_POLL_INTERVAL_MS = 1500;

const toObjectId = (value) => {
   if (!value) return null;
   return value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);
};

const normalizeId = (value) => String(value?._id || value);

const buildChatContext = async ({ orderId, user, requestedItemId }) => {
   const order = await Order.findById(orderId)
      .populate('customerId', 'name phone avatarUrl')
      .populate({
         path: 'items.driverId',
         populate: {
            path: 'userId',
            select: 'name phone avatarUrl'
         }
      });

   if (!order) {
      const error = new Error('Không tìm thấy đơn hàng');
      error.statusCode = 404;
      throw error;
   }

   const driverItems = order.items.filter(item => item.driverId);
   if (!driverItems.length) {
      const error = new Error('Đơn hàng này chưa có tài xế nhận cuốc');
      error.statusCode = 400;
      throw error;
   }

   const customerDoc = order.customerId?._id ? order.customerId : {
      _id: order.customerId,
      name: '',
      phone: '',
      avatarUrl: ''
   };

   const isCustomer = normalizeId(customerDoc) === normalizeId(user);
   const requestedItemObjectId = requestedItemId ? toObjectId(requestedItemId) : null;

   let driverDoc = null;
   let participantRole = 'Customer';
   let allowedDriverIds = driverItems.map(item => item.driverId?._id || item.driverId);
   let allowedItemIds = driverItems.map(item => item._id);
   let activeItem = null;

   if (isCustomer) {
      if (requestedItemObjectId) {
         const found = order.items.id(requestedItemObjectId);
         if (!found || !found.driverId) {
            const error = new Error('Không tìm thấy chuyến hàng hợp lệ để chat');
            error.statusCode = 404;
            throw error;
         }
         activeItem = found;
      } else if (driverItems.length === 1) {
         activeItem = driverItems[0];
      }
   } else {
      driverDoc = await Driver.findOne({ userId: user._id })
         .populate('userId', 'name phone avatarUrl');
      if (!driverDoc) {
         const error = new Error('Không tìm thấy hồ sơ tài xế');
         error.statusCode = 403;
         throw error;
      }

      const assignedItem = driverItems.find(item => normalizeId(item.driverId) === normalizeId(driverDoc._id));
      if (!assignedItem) {
         const error = new Error('Bạn không phụ trách đơn hàng này');
         error.statusCode = 403;
         throw error;
      }

      participantRole = 'Driver';
      allowedDriverIds = [driverDoc._id];
      allowedItemIds = [assignedItem._id];

      if (requestedItemObjectId) {
         if (normalizeId(requestedItemObjectId) !== normalizeId(assignedItem._id)) {
            const error = new Error('Bạn không thể chat cho chuyến hàng này');
            error.statusCode = 403;
            throw error;
         }
         activeItem = assignedItem;
      } else {
         activeItem = assignedItem;
      }
   }

   if (!activeItem) {
      const error = new Error('Vui lòng chọn chuyến hàng để chat');
      error.statusCode = 400;
      throw error;
   }

   const orderStatus = order.status;
   const isCompleted = orderStatus === 'Completed';
   const isCancelled = orderStatus === 'Cancelled';

   const lockedReason = isCompleted
      ? 'Đơn hàng đã hoàn thành, chat đã bị khóa'
      : isCancelled
         ? 'Đơn hàng đã bị hủy, không thể chat thêm'
         : null;

   const driverOptions = driverItems.map(item => ({
      orderItemId: item._id,
      driverId: item.driverId?._id || item.driverId,
      driverName: item.driverId?.userId?.name || '',
      driverPhone: item.driverId?.userId?.phone || '',
      driverAvatar: item.driverId?.userId?.avatarUrl || '',
      status: item.status
   }));

   return {
      order,
      customer: customerDoc,
      driverDoc,
      participantRole,
      activeItem,
      allowedDriverIds,
      allowedItemIds,
      driverOptions,
      canChat: !(isCompleted || isCancelled),
      lockedReason
   };
};

export const getChatMeta = async (req, res) => {
   try {
      const { orderId } = req.params;
      const { orderItemId } = req.query;
      const context = await buildChatContext({
         orderId,
         user: req.user,
         requestedItemId: orderItemId
      });

      const lastMessage = await ChatMessage.findOne({
         orderId: context.order._id,
         driverId: { $in: context.allowedDriverIds },
         orderItemId: { $in: context.allowedItemIds }
      }).sort({ createdAt: -1 });

      return res.json({
         success: true,
         data: {
            orderId: context.order._id,
            orderStatus: context.order.status,
            canChat: context.canChat,
            lockedReason: context.lockedReason,
            participantRole: context.participantRole,
            customer: context.customer,
            driverProfile: context.driverDoc,
            driverOptions: context.driverOptions,
            activeItemId: context.activeItem._id,
            pickupAddress: context.order.pickupAddress,
            dropoffAddress: context.order.dropoffAddress,
            lastMessageAt: lastMessage?.createdAt || null
         }
      });
   } catch (error) {
      console.error('[chat] getChatMeta error:', error);
      return res.status(error.statusCode || 500).json({
         success: false,
         message: error.message || 'Không thể lấy thông tin chat'
      });
   }
};

export const getChatHistory = async (req, res) => {
   try {
      const { orderId } = req.params;
      const { orderItemId, limit = 50, before } = req.query;
      const context = await buildChatContext({
         orderId,
         user: req.user,
         requestedItemId: orderItemId
      });

      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), MAX_HISTORY_LIMIT);

      const query = {
         orderId: context.order._id,
         driverId: { $in: context.allowedDriverIds },
         orderItemId: { $in: context.allowedItemIds }
      };

      if (before) {
         const beforeDate = new Date(before);
         if (!Number.isNaN(beforeDate.valueOf())) {
            query.createdAt = { $lt: beforeDate };
         }
      }

      const messages = await ChatMessage.find(query)
         .populate('senderId', 'name avatarUrl role')
         .sort({ createdAt: -1 })
         .limit(limitNum);

      return res.json({
         success: true,
         data: messages.reverse()
      });
   } catch (error) {
      console.error('[chat] getChatHistory error:', error);
      return res.status(error.statusCode || 500).json({
         success: false,
         message: error.message || 'Không thể lấy lịch sử chat'
      });
   }
};

export const sendChatMessage = async (req, res) => {
   try {
      const { orderId, orderItemId, message } = req.body;

      if (!message || !message.trim()) {
         return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
      }

      const trimmedMessage = message.trim();
      if (trimmedMessage.length > 2000) {
         return res.status(400).json({ success: false, message: 'Tin nhắn vượt quá 2000 ký tự' });
      }

      const context = await buildChatContext({
         orderId,
         user: req.user,
         requestedItemId: orderItemId
      });

      if (!context.canChat) {
         return res.status(403).json({
            success: false,
            message: context.lockedReason || 'Chat đã bị khóa cho đơn hàng này'
         });
      }

      const driverId = context.activeItem.driverId?._id || context.activeItem.driverId;
      const newMessage = await ChatMessage.create({
         orderId: context.order._id,
         orderItemId: context.activeItem._id,
         driverId,
         customerId: context.customer._id || context.customer,
         senderId: req.user._id,
         senderRole: context.participantRole,
         message: trimmedMessage
      });

      const populatedMessage = await newMessage.populate('senderId', 'name avatarUrl role');

      return res.status(201).json({
         success: true,
         data: populatedMessage
      });
   } catch (error) {
      console.error('[chat] sendChatMessage error:', error);
      return res.status(error.statusCode || 500).json({
         success: false,
         message: error.message || 'Không thể gửi tin nhắn'
      });
   }
};

export const longPollMessages = async (req, res) => {
   try {
      const { orderId } = req.params;
      const { orderItemId, since } = req.query;
      const context = await buildChatContext({
         orderId,
         user: req.user,
         requestedItemId: orderItemId
      });

      let sinceDate = since ? new Date(since) : new Date();
      if (Number.isNaN(sinceDate.valueOf())) {
         sinceDate = new Date();
      }
      const baseQuery = {
         orderId: context.order._id,
         driverId: { $in: context.allowedDriverIds },
         orderItemId: { $in: context.allowedItemIds },
         createdAt: { $gt: sinceDate }
      };

      let settled = false;
      let timeoutId = null;
      const startedAt = Date.now();

      const finalize = (payload) => {
         if (settled) return;
         settled = true;
         clearTimeout(timeoutId);
         return res.json(payload);
      };

      const poll = async () => {
         if (settled) return;
         try {
            const messages = await ChatMessage.find(baseQuery)
               .populate('senderId', 'name avatarUrl role')
               .sort({ createdAt: 1 });

            if (messages.length > 0) {
               return finalize({
                  success: true,
                  data: messages,
                  serverTime: new Date().toISOString()
               });
            }

            if (Date.now() - startedAt >= LONG_POLL_TIMEOUT_MS) {
               return finalize({
                  success: true,
                  data: [],
                  serverTime: new Date().toISOString(),
                  timeout: true
               });
            }

            timeoutId = setTimeout(poll, LONG_POLL_INTERVAL_MS);
         } catch (error) {
            console.error('[chat] longPollMessages error:', error);
            return finalize({
               success: false,
               message: error.message || 'Không thể long poll'
            });
         }
      };

      req.on('close', () => {
         if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
         }
      });

      poll();
   } catch (error) {
      console.error('[chat] longPollMessages error (outer):', error);
      return res.status(error.statusCode || 500).json({
         success: false,
         message: error.message || 'Không thể thiết lập long polling'
      });
   }
};

