import { Coupon } from '../models/Coupon';
import { Product } from '../models/Product';

export type CartLine = { lineId: string; productId: string; quantity: number };
export type CartState = { lines: CartLine[]; appliedCoupons: string[] };
type ProductLine = CartLine & { product: any };
type Rule = { op?: string; rules?: Rule[]; code?: string; productId?: string; productSlug?: string; category?: string; min?: number; group?: string };

export class CouponError extends Error {
  constructor(message: string) { super(message); }
}

const normalized = (code: string) => code.trim().toUpperCase();
async function findCoupon(code: string, local: Map<string, any>) {
  const key = normalized(code);
  if (!local.has(key)) local.set(key, await Coupon.findOne({ code: key }).lean());
  return local.get(key);
}

function active(coupon: any) {
  return coupon && new Date(coupon.expiresAt).getTime() > Date.now() && coupon.uses < coupon.maxUses;
}

function groups(rule: Rule, depth = 0): string[] {
  if (depth > 5) throw new CouponError('Quy tắc coupon vượt quá độ sâu 5');
  return rule.op === 'mutualExclusionGroup' && rule.group ? [rule.group] : (rule.rules || []).flatMap(child => groups(child, depth + 1));
}

async function evaluate(rule: Rule, lines: ProductLine[], applied: string[], local: Map<string, any>, depth: number, trail: string[]): Promise<boolean> {
  if (depth > 5) throw new CouponError('Quy tắc coupon vượt quá độ sâu 5');
  if (!rule || typeof rule !== 'object') throw new CouponError('Quy tắc coupon không hợp lệ');
  if (rule.op === 'and') {
    if (!Array.isArray(rule.rules)) throw new CouponError('Quy tắc coupon không hợp lệ');
    for (const child of rule.rules) if (!await evaluate(child, lines, applied, local, depth + 1, trail)) return false;
    return true;
  }
  if (rule.op === 'or') {
    if (!Array.isArray(rule.rules)) throw new CouponError('Quy tắc coupon không hợp lệ');
    for (const child of rule.rules) if (await evaluate(child, lines, applied, local, depth + 1, trail)) return true;
    return false;
  }
  if (rule.op === 'minQuantity') return lines.some(line =>
    (!rule.productId || line.productId === rule.productId) && (!rule.productSlug || line.product.slug === rule.productSlug) && line.quantity >= (rule.min || 1));
  if (rule.op === 'category') return lines.filter(line => line.product.category === rule.category).reduce((sum, line) => sum + line.quantity, 0) >= (rule.min || 1);
  if (rule.op === 'mutualExclusionGroup') return typeof rule.group === 'string' && rule.group.length > 0;
  if (rule.op === 'coupon' && rule.code) {
    const code = normalized(rule.code);
    if (!applied.includes(code) || trail.includes(code)) return false;
    const referenced = await findCoupon(code, local);
    return active(referenced) && await evaluate(referenced.rules, lines, applied, local, depth + 1, [...trail, code]);
  }
  throw new CouponError('Quy tắc coupon không hợp lệ');
}

function bogoSelectors(rule: Rule): { productSlugs: string[]; categories: string[] } {
  const productSlugs: string[] = [];
  const categories: string[] = [];
  const visit = (node: Rule) => {
    if (node.op === 'minQuantity' && node.productSlug) productSlugs.push(node.productSlug);
    if (node.op === 'category' && node.category) categories.push(node.category);
    for (const child of node.rules || []) visit(child);
  };
  visit(rule);
  return { productSlugs, categories };
}

export async function priceCart(state: CartState) {
  const ids = state.lines.map(line => line.productId);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map(product => [String(product._id), product]));
  const lines: ProductLine[] = state.lines.flatMap(line => {
    const product = byId.get(line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const applied = state.appliedCoupons.map(normalized);
  const local = new Map<string, any>();
  const coupons = [];
  for (const code of applied) {
    const coupon = await findCoupon(code, local);
    if (!active(coupon)) throw new CouponError(`Coupon ${code} không còn hiệu lực`);
    coupons.push(coupon);
  }
  if (new Set(applied).size !== applied.length) throw new CouponError('Coupon bị lặp');
  if (coupons.length > 1 && coupons.some(coupon => !coupon.stackable)) throw new CouponError('Coupon này không thể dùng cùng coupon khác');
  const seenGroups = new Set<string>();
  for (const coupon of coupons) {
    for (const group of groups(coupon.rules)) {
      if (seenGroups.has(group)) throw new CouponError('Các coupon cùng nhóm không thể dùng chung');
      seenGroups.add(group);
    }
    if (!await evaluate(coupon.rules, lines, applied, local, 0, [coupon.code])) throw new CouponError(`Giỏ hàng chưa đáp ứng điều kiện ${coupon.code}`);
  }
  const discounts: { code: string; amount: number }[] = [];
  let remaining = subtotal;
  for (const coupon of coupons) {
    let amount = 0;
    if (coupon.type === 'percent') amount = Math.floor(remaining * coupon.value / 100);
    if (coupon.type === 'fixed' || coupon.type === 'bundle') amount = coupon.value;
    if (coupon.type === 'bogo') {
      const selectors = bogoSelectors(coupon.rules);
      amount = lines.filter(line =>
        (!selectors.productSlugs.length && !selectors.categories.length) || selectors.productSlugs.includes(line.product.slug) || selectors.categories.includes(line.product.category))
        .reduce((sum, line) => sum + Math.floor(line.quantity / 2) * line.product.price * Math.min(1, coupon.value), 0);
    }
    amount = Math.min(remaining, Math.max(0, Math.floor(amount)));
    remaining -= amount;
    discounts.push({ code: coupon.code, amount });
  }
  return {
    lines: lines.map(line => ({ lineId: line.lineId, product: { id: line.productId, name: line.product.name, slug: line.product.slug, description: line.product.description, image: line.product.image, supplierImageUrl: line.product.supplierImageUrl || '', category: line.product.category || 'general', price: line.product.price, stock: line.product.stock }, quantity: line.quantity })),
    appliedCoupons: applied, subtotal, discounts, total: remaining,
  };
}
