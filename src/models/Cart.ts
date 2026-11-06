import { Schema, model } from 'mongoose';

const line = new Schema({ productId: { type: Schema.Types.ObjectId, required: true }, quantity: { type: Number, required: true, min: 1 } });
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  lines: { type: [line], default: [] },
  appliedCoupons: { type: [String], default: [] },
}, { timestamps: true });

export const Cart = model('Cart', schema);
