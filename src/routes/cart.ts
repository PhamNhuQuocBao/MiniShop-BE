import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { auth, normalizeRole } from '../auth';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { CartState, CouponError, priceCart } from '../services/coupon';

export const cartRouter = Router();
const empty = (): CartState => ({ lines: [], appliedCoupons: [] });
const cookieName = 'minishop_guest_cart';
const secret = process.env.JWT_SECRET!;
const itemSchema = z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) });
const quantitySchema = z.object({ quantity: z.number().int().min(1).max(99) });
const couponSchema = z.object({ code: z.string().trim().min(1).max(40) });

function guestToken(req: Request) {
  const raw = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  return raw ? decodeURIComponent(raw.slice(cookieName.length + 1)) : undefined;
}

export function readGuestCart(req: Request): CartState {
  try {
    const token = guestToken(req);
    if (!token) return empty();
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    if (payload.kind !== 'guest-cart' || !Array.isArray(payload.lines) || !Array.isArray(payload.appliedCoupons)) throw new Error('Invalid guest cart');
    const lines = payload.lines.filter((line: any) => mongoose.isValidObjectId(line.lineId) && mongoose.isValidObjectId(line.productId) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99).slice(0, 30);
    const appliedCoupons = payload.appliedCoupons.filter((code: unknown) => typeof code === 'string').slice(0, 8);
    return { lines, appliedCoupons };
  } catch { return empty(); }
}

export class CartError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function resolveCart(req: Request): Promise<{ state: CartState; userId?: string }> {
  const session = auth(req);
  if (req.header('authorization') && !session) throw new CartError(401, 'UNAUTHORIZED', 'Phiên không hợp lệ');
  if (session) {
    const user = await User.findById(session.id).lean();
    if (!user || normalizeRole(user.role) !== session.role) throw new CartError(401, 'UNAUTHORIZED', 'Phiên không hợp lệ');
    const cart = await Cart.findOne({ userId: user._id }).lean();
    return { userId: session.id, state: cart ? { lines: cart.lines.map((line: any) => ({ lineId: String(line._id), productId: String(line.productId), quantity: line.quantity })), appliedCoupons: cart.appliedCoupons } : empty() };
  }
  return { state: readGuestCart(req) };
}

async function saveCart(state: CartState, userId?: string) {
  if (userId) await Cart.updateOne({ userId }, { $set: { lines: state.lines.map(line => ({ _id: line.lineId, productId: line.productId, quantity: line.quantity })), appliedCoupons: state.appliedCoupons } }, { upsert: true });
  return userId ? undefined : jwt.sign({ kind: 'guest-cart', lines: state.lines, appliedCoupons: state.appliedCoupons }, secret, { expiresIn: '7d' });
}

function wrapped(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(error => {
    if (error instanceof CartError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    if (error instanceof CouponError) { res.status(422).json({ error: { code: 'COUPON_INVALID', message: error.message } }); return; }
    next(error);
  });
}

async function respond(res: Response, state: CartState, userId?: string, strict = true) {
  let cart;
  try { cart = await priceCart(state); }
  catch (error) {
    if (strict || !(error instanceof CouponError)) throw error;
    state.appliedCoupons = [];
    cart = await priceCart(state);
  }
  const token = await saveCart(state, userId);
  res.json({ cart, ...(token ? { guestToken: token } : {}) });
}

cartRouter.get('/', wrapped(async (req, res) => {
  const { state, userId } = await resolveCart(req);
  try { res.json({ cart: await priceCart(state) }); }
  catch (error) {
    if (!(error instanceof CouponError)) throw error;
    state.appliedCoupons = [];
    const guest = await saveCart(state, userId);
    res.json({ cart: await priceCart(state), ...(guest ? { guestToken: guest } : {}) });
  }
}));

cartRouter.post('/items', wrapped(async (req, res) => {
  const input = itemSchema.parse(req.body);
  if (!mongoose.isValidObjectId(input.productId)) throw new CartError(400, 'INVALID_ID', 'ID sản phẩm không hợp lệ');
  const product = await Product.findById(input.productId).lean();
  if (!product) throw new CartError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  const { state, userId } = await resolveCart(req);
  const existing = state.lines.find(line => line.productId === input.productId);
  const quantity = (existing?.quantity || 0) + input.quantity;
  if (quantity > product.stock) throw new CartError(409, 'OUT_OF_STOCK', 'Không đủ hàng');
  if (existing) existing.quantity = quantity;
  else {
    if (state.lines.length >= 30) throw new CartError(400, 'CART_FULL', 'Giỏ hàng đã đủ 30 sản phẩm');
    state.lines.push({ lineId: new mongoose.Types.ObjectId().toString(), productId: input.productId, quantity });
  }
  await respond(res, state, userId, false);
}));

cartRouter.patch('/items/:lineId', wrapped(async (req, res) => {
  const { quantity } = quantitySchema.parse(req.body);
  const { state, userId } = await resolveCart(req);
  const line = state.lines.find(item => item.lineId === req.params.lineId);
  if (!line) throw new CartError(404, 'NOT_FOUND', 'Không tìm thấy dòng hàng');
  const product = await Product.findById(line.productId).lean();
  if (!product) throw new CartError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  if (quantity > product.stock) throw new CartError(409, 'OUT_OF_STOCK', 'Không đủ hàng');
  line.quantity = quantity;
  await respond(res, state, userId, false);
}));

cartRouter.delete('/items/:lineId', wrapped(async (req, res) => {
  const { state, userId } = await resolveCart(req);
  if (!state.lines.some(item => item.lineId === req.params.lineId)) throw new CartError(404, 'NOT_FOUND', 'Không tìm thấy dòng hàng');
  state.lines = state.lines.filter(item => item.lineId !== req.params.lineId);
  await respond(res, state, userId, false);
}));

cartRouter.post('/coupons', wrapped(async (req, res) => {
  const { code } = couponSchema.parse(req.body);
  const { state, userId } = await resolveCart(req);
  const normalized = code.toUpperCase();
  if (!state.appliedCoupons.includes(normalized)) state.appliedCoupons.push(normalized);
  if (state.appliedCoupons.length > 8) throw new CartError(400, 'TOO_MANY_COUPONS', 'Giỏ hàng đã đủ 8 coupon');
  await respond(res, state, userId);
}));

cartRouter.delete('/coupons/:code', wrapped(async (req, res) => {
  const { state, userId } = await resolveCart(req);
  const code = req.params.code.toUpperCase();
  state.appliedCoupons = state.appliedCoupons.filter(item => item !== code);
  await respond(res, state, userId, false);
}));

cartRouter.post('/merge', wrapped(async (req, res) => {
  const session = auth(req);
  if (!session) throw new CartError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
  const guest = readGuestCart(req);
  const { state, userId } = await resolveCart(req);
  const products = await Product.find({ _id: { $in: guest.lines.map(line => line.productId) } }).lean();
  const stock = new Map(products.map(product => [String(product._id), product.stock]));
  for (const line of guest.lines) {
    if (!stock.has(line.productId) || stock.get(line.productId)! < 1) continue;
    const existing = state.lines.find(item => item.productId === line.productId);
    if (existing) existing.quantity = Math.min(stock.get(line.productId)!, existing.quantity + line.quantity);
    else state.lines.push({ ...line, quantity: Math.min(stock.get(line.productId)!, line.quantity) });
  }
  state.appliedCoupons = [...new Set([...state.appliedCoupons, ...guest.appliedCoupons])];
  if (state.lines.length > 30) throw new CartError(400, 'CART_FULL', 'Giỏ hàng đã đủ 30 sản phẩm');
  await respond(res, state, userId, false);
}));
