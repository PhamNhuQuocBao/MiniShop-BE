import { Schema, model } from 'mongoose';

const schema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, required: true, enum: ['percent', 'fixed', 'bogo', 'bundle'] },
  value: { type: Number, required: true, min: 0 },
  rules: { type: Schema.Types.Mixed, required: true },
  stackable: { type: Boolean, default: false },
  maxUses: { type: Number, required: true, min: 1 },
  uses: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export const Coupon = model('Coupon', schema);
