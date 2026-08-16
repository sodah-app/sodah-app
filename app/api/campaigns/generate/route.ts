import { NextResponse } from 'next/server';

import { generateCampaign } from '@/lib/ai/campaign-ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          error: 'Invalid request body.',
        },
        {
          status: 400,
        },
      );
    }

    const context = body.context;

    if (!context || typeof context !== 'object') {
      return NextResponse.json(
        {
          error: 'Campaign context is required.',
        },
        {
          status: 400,
        },
      );
    }

    const result = await generateCampaign(context);

    return NextResponse.json({
      success: true,
      campaign: result,
    });
  } catch (error) {
    console.error('CAMPAIGN_GENERATION_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Campaign generation failed.';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}