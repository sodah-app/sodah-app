import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID ? 'set' : 'undefined',
    INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET ? 'set' : 'undefined',
    REDIRECT_URI_PROD: process.env.INSTAGRAM_REDIRECT_URI_PROD ? 'set' : 'undefined',
    REDIRECT_URI_LOCAL: process.env.INSTAGRAM_REDIRECT_URI_LOCAL ? 'set' : 'undefined',
  });
}