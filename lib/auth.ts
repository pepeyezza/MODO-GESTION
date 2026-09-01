import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import type { Role } from './types';

export const SESSION_COOKIE = 'gestiona_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 3600; // 7 días

export interface SessionClaims {
  userId: string;
  role: Role;
  companyId: string | null;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET no está configurado (o es demasiado corto).');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== 'string' || typeof payload.role !== 'string') return null;
    return {
      userId: payload.userId,
      role: payload.role as Role,
      companyId: (payload.companyId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

// Lee y valida la cookie de sesión de un Request de un Route Handler.
export async function getSessionFromRequest(req: NextRequest): Promise<SessionClaims | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Genera un id opaco al estilo de la app (uid(prefix) del lado del cliente):
// "<prefijo>_<timestamp base36><contador aleatorio base36>".
let counter = 0;
export function newId(prefix: string): string {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
