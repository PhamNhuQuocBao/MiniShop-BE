import { Schema, model } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true },
  trackingUrl: { type: String, required: true },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

export const Partner = model('Partner', schema);
