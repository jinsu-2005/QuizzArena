import { auth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const authHandler = auth.handler();

function resolvePath(req: NextRequest, paramsPath?: string[]): string[] {
  if (paramsPath && Array.isArray(paramsPath) && paramsPath.length > 0) {
    return paramsPath;
  }
  const url = new URL(req.url);
  const match = url.pathname.match(/\/api\/auth\/(.+)/);
  if (match && match[1]) {
    return match[1].split('/').filter(Boolean);
  }
  return [];
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = ctx?.params ? await ctx.params : undefined;
    const path = resolvePath(req, resolvedParams?.path);
    return await authHandler.GET(req, { params: Promise.resolve({ path }) } as any);
  } catch (error: any) {
    console.error('[Neon Auth GET Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Auth Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = ctx?.params ? await ctx.params : undefined;
    const path = resolvePath(req, resolvedParams?.path);
    return await authHandler.POST(req, { params: Promise.resolve({ path }) } as any);
  } catch (error: any) {
    console.error('[Neon Auth POST Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Auth Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = ctx?.params ? await ctx.params : undefined;
    const path = resolvePath(req, resolvedParams?.path);
    return await authHandler.PUT(req, { params: Promise.resolve({ path }) } as any);
  } catch (error: any) {
    console.error('[Neon Auth PUT Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Auth Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = ctx?.params ? await ctx.params : undefined;
    const path = resolvePath(req, resolvedParams?.path);
    return await authHandler.DELETE(req, { params: Promise.resolve({ path }) } as any);
  } catch (error: any) {
    console.error('[Neon Auth DELETE Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Auth Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = ctx?.params ? await ctx.params : undefined;
    const path = resolvePath(req, resolvedParams?.path);
    return await authHandler.PATCH(req, { params: Promise.resolve({ path }) } as any);
  } catch (error: any) {
    console.error('[Neon Auth PATCH Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Auth Error' },
      { status: 500 }
    );
  }
}
