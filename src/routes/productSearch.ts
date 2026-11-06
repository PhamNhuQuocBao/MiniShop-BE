import { Router } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product';

export const productSearchRouter = Router();
const filterNode = z.object({
  field: z.enum(['name', 'category', 'price']),
  operator: z.enum(['contains', 'eq', 'gte', 'lte']),
  value: z.union([z.string(), z.number()]),
});
const schema = z.object({ filters: z.array(filterNode).max(12) });
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

productSearchRouter.post('/', async (req, res, next) => {
  try {
    const { filters } = schema.parse(req.body);
    const query: Record<string, unknown>[] = [];
    for (const filter of filters) {
      if (filter.field === 'name' && filter.operator === 'contains' && typeof filter.value === 'string') query.push({ name: { $regex: escapeRegex(filter.value.trim().slice(0, 100)), $options: 'i' } });
      else if (filter.field === 'category' && filter.operator === 'eq' && typeof filter.value === 'string') query.push({ category: filter.value.trim().slice(0, 50) });
      else if (filter.field === 'price' && ['gte', 'lte', 'eq'].includes(filter.operator) && typeof filter.value === 'number' && Number.isFinite(filter.value) && filter.value >= 0) query.push({ price: { [`$${filter.operator}`]: filter.value } });
      else { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Bộ lọc không hợp lệ' } }); return; }
    }
    const products = await Product.find(query.length ? { $and: query } : {}).sort({ name: 1 }).lean();
    res.json({ products: products.map(product => ({ id: String(product._id), name: product.name, slug: product.slug, description: product.description, image: product.image, supplierImageUrl: product.supplierImageUrl || '', category: product.category || 'general', specifications: product.specifications || [], price: product.price, stock: product.stock })) });
  } catch (error) { next(error); }
});
