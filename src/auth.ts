import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './models/User';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must have at least 32 characters');

type Role = 'customer' | 'admin';
export type Auth = { id: string; role: Role };

export function auth(req: Request): Auth | null {
  const value = req.header('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(value.slice(7), secret!) as jwt.JwtPayload;
    if (typeof payload.sub === 'string' && (payload.role === 'customer' || payload.role === 'admin')) {
      return { id: payload.sub, role: payload.role };
    }
  } catch {}
  return null;
}

export function signInToken(id: string, role: Role) {
  return jwt.sign({ role }, secret!, { subject: id, expiresIn: '7d' });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = auth(req);
    if (!session) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' } });
      return;
    }
    const user = await User.findById(session.id).lean();
    if (!user || user.role !== 'admin' || session.role !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không có quyền truy cập' } });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
