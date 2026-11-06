import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './models/User';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must have at least 32 characters');

export type Role = 'CUSTOMER' | 'ADMIN';
export type Auth = { id: string; role: Role };
export const normalizeRole = (role: unknown): Role | null =>
  role === 'ADMIN' || role === 'admin' ? 'ADMIN' : role === 'CUSTOMER' || role === 'customer' ? 'CUSTOMER' : null;

export function auth(req: Request): Auth | null {
  const value = req.header('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(value.slice(7), secret!) as jwt.JwtPayload;
    const role = normalizeRole(payload.role);
    if (typeof payload.sub === 'string' && role) {
      return { id: payload.sub, role };
    }
  } catch {}
  return null;
}

export function signInToken(id: string, storedRole: unknown) {
  const role = normalizeRole(storedRole);
  if (!role) throw new Error('User role is invalid');
  return jwt.sign({ role }, secret!, { subject: id, expiresIn: '7d' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = auth(req);
    if (!session) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } });
      return;
    }
    const user = await User.findById(session.id).lean();
    if (!user || normalizeRole(user.role) !== session.role) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Phiên không hợp lệ' } });
      return;
    }
    res.locals.auth = session;
    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((res.locals.auth as Auth | undefined)?.role !== role) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' } });
      return;
    }
    next();
  };
}

export const requireAdmin = [requireAuth, requireRole('ADMIN')];
