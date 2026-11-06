import { Router } from 'express';
import mongoose from 'mongoose';
import { Partner } from '../models/Partner';

export const partnersRouter = Router();

partnersRouter.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID đối tác không hợp lệ' } });
      return;
    }
    const partner = await Partner.findById(req.params.id).lean();
    if (!partner || !partner.enabled) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy đối tác' } });
      return;
    }
    res.json({ partner: { id: String(partner._id), name: partner.name, trackingUrl: partner.trackingUrl, enabled: partner.enabled } });
  } catch (error) { next(error); }
});
