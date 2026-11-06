import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAdmin } from '../auth';
import { MarketingSnippet, marketingPlacements, marketingProviders } from '../models/MarketingSnippet';

export const marketingRouter = Router();
const route = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
const error = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });
const dto = (snippet: any) => ({
  id: String(snippet._id), name: snippet.name, provider: snippet.provider,
  scriptBody: snippet.scriptBody, placement: snippet.placement,
  enabled: snippet.enabled, createdAt: snippet.createdAt, updatedAt: snippet.updatedAt,
});

const fields = {
  name: z.string().trim().min(1).max(120),
  provider: z.enum(marketingProviders),
  scriptBody: z.string().trim().min(1).max(30000).refine(value => !/<\/?script\b/i.test(value), 'Chỉ nhập JavaScript bên trong thẻ script'),
  placement: z.enum(marketingPlacements),
  enabled: z.boolean(),
};
const createSchema = z.object(fields).strict();
const updateSchema = createSchema.partial().refine(value => Object.keys(value).length > 0, 'Cần ít nhất một trường');

marketingRouter.get('/enabled', route(async (_req, res) => {
  const snippets = await MarketingSnippet.find({ enabled: true }).sort({ createdAt: 1 }).lean();
  res.json({ snippets: snippets.map(dto) });
}));

marketingRouter.use(requireAdmin);

marketingRouter.get('/', route(async (_req, res) => {
  const snippets = await MarketingSnippet.find().sort({ createdAt: -1 }).lean();
  res.json({ snippets: snippets.map(dto) });
}));

marketingRouter.get('/:id', route(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 400, 'INVALID_ID', 'ID snippet không hợp lệ'); return; }
  const snippet = await MarketingSnippet.findById(req.params.id).lean();
  if (!snippet) { error(res, 404, 'NOT_FOUND', 'Không tìm thấy snippet'); return; }
  res.json({ snippet: dto(snippet) });
}));

marketingRouter.post('/', route(async (req, res) => {
  const input = createSchema.parse(req.body);
  const snippet = await MarketingSnippet.create(input);
  res.status(201).json({ snippet: dto(snippet) });
}));

marketingRouter.patch('/:id', route(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 400, 'INVALID_ID', 'ID snippet không hợp lệ'); return; }
  const input = updateSchema.parse(req.body);
  const snippet = await MarketingSnippet.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true }).lean();
  if (!snippet) { error(res, 404, 'NOT_FOUND', 'Không tìm thấy snippet'); return; }
  res.json({ snippet: dto(snippet) });
}));

marketingRouter.delete('/:id', route(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 400, 'INVALID_ID', 'ID snippet không hợp lệ'); return; }
  const snippet = await MarketingSnippet.findByIdAndDelete(req.params.id).lean();
  if (!snippet) { error(res, 404, 'NOT_FOUND', 'Không tìm thấy snippet'); return; }
  res.json({ success: true });
}));
