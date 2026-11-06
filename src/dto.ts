import { normalizeRole } from './auth';

export const addressDto = (a: any) => ({
  id: String(a._id), label: a.label, name: a.name, phone: a.phone, address: a.address,
});

export const userDto = (u: any) => ({
  id: String(u._id), name: u.name, email: u.email, phone: u.phone || '',
  role: normalizeRole(u.role),
});

export const orderDto = (o: any) => ({
  id: String(o._id), code: o.code, userId: o.userId ? String(o.userId) : null,
  shipping: o.shipping,
  items: o.items.map((i: any) => ({ productId: String(i.productId), name: i.name, unitPrice: i.unitPrice, quantity: i.quantity })),
  total: o.total, status: o.status, shippingStatus: o.shippingStatus || 'pending',
  trackingNumber: o.trackingNumber || '', createdAt: o.createdAt, updatedAt: o.updatedAt,
});
