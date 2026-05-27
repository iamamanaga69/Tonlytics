import { NextResponse } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

/**
 * Validates the admin Bearer token from request headers.
 * Returns null if valid, or a NextResponse 401 error if invalid.
 */
export function validateAdminRequest(request: Request): NextResponse | null {
  if (!ADMIN_SECRET) {
    // No secret configured — block all admin access in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Admin access is not configured. Set ADMIN_SECRET environment variable.' },
        { status: 503 }
      );
    }
    // In development, allow access without secret for local testing
    return null;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or malformed Authorization header. Expected: Bearer <token>' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== ADMIN_SECRET) {
    return NextResponse.json(
      { error: 'Invalid admin credentials' },
      { status: 401 }
    );
  }

  return null; // Auth passed
}
