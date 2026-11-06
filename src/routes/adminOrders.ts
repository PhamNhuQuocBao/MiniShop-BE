import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../auth';
import { orderDto } from '../dto';
import { Order } from '../models/Order';

export const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAuth, requireRole('ADMIN'));
const route = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

adminOrdersRouter.get('/', route(async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).lean();
  res.json({ orders: orders.map(orderDto) });
}));

adminOrdersRouter.get('/:id', route(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID đơn hàng không hợp lệ' } });
    return;
  }
  const order = await Order.findById(req.params.id).lean();
  if (!order) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' } });
    return;
  }
  res.json({ order: orderDto(order) });
}));
