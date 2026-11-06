import { Schema, model } from 'mongoose';

export const marketingProviders = ['facebook', 'gtm', 'tiktok', 'hotjar', 'custom'] as const;
export const marketingPlacements = ['beforeInteractive', 'afterInteractive'] as const;

const schema = new Schema({
  name: { type: String, required: true },
  provider: { type: String, enum: marketingProviders, required: true },
  scriptBody: { type: String, required: true },
  placement: { type: String, enum: marketingPlacements, required: true },
  enabled: { type: Boolean, default: false },
}, { timestamps: true });

export const MarketingSnippet = model('MarketingSnippet', schema);
