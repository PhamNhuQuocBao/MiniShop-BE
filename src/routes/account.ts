import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Auth, requireAuth } from '../auth';
import { addressDto, orderDto, userDto } from '../dto';
import { Order } from '../models/Order';
import { User } from '../models/User';

export const accountRouter = Router();
accountRouter.use(requireAuth);
const route = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
const error = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });
const session = (res: Response) => res.locals.auth as Auth;

accountRouter.get('/orders', route(async (_req, res) => {
  const orders = await Order.find({ userId: session(res).id }).sort({ createdAt: -1 }).lean();
  res.json({ orders: orders.map(orderDto) });
}));

accountRouter.get('/orders/:id', route(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 400, 'INVALID_ID', 'ID đơn hàng không hợp lệ'); return; }
  const order = await Order.findOne({ _id: req.params.id, userId: session(res).id }).lean();
  if (!order) { error(res, 404, 'NOT_FOUND', 'Không tìm thấy đơn hàng'); return; }
  res.json({ order: orderDto(order) });
}));

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.union([z.literal(''), z.string().trim().regex(/^[0-9+(). -]{8,20}$/)]),
}).partial().refine(input => Object.keys(input).length > 0, 'Cần ít nhất một trường');

accountRouter.patch('/profile', route(async (req, res) => {
  const input = profileSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(session(res).id, { $set: input }, { new: true, runValidators: true }).lean();
  if (!user) { error(res, 404, 'NOT_FOUND', 'Không tìm thấy tài khoản'); return; }
  res.json({ user: userDto(user) });
}));

accountRouter.get('/addresses', route(async (_req, res) => {
  const user = await User.findById(session(res).id).lean();
  if (!user) { error(res, 404, 'NOT_FOUND', 'Không tìm thấy tài khoản'); return; }
  res.json({ addresses: (user.addresses || []).map(addressDto) });
}));

const addressSchema = z.object({
  label: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[0-9+(). -]{8,20}$/),
  address: z.string().trim().min(8).max(300),
});

accountRouter.post('/addresses', route(async (req, res) => {
  const input = addressSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(session(res).id, { $push: { addresses: input } }, { new: true, runValidators: true }).lean();
  if (!user) { error(res, 404, 'NOT_FOUND', 'Không tìm thấy tài khoản'); return; }
  res.status(201).json({ addresses: (user.addresses || []).map(addressDto) });
}));
