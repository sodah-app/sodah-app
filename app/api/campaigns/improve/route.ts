import { NextResponse } from 'next/server';

import { improveCampaign } from '@/lib/ai/campaign-ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const originalMessage =
      typeof body?.originalMessage === 'string'
        ? body.originalMessage.trim()
        : '';

    const improvementInstruction =
      typeof body?.improvementInstruction === 'string'
        ? body.improvementInstruction.trim()
        : '';

    if (!originalMessage) {
      return NextResponse.json(
        {
          error: 'Original campaign message is required.',
        },
        {
          status: 400,
        },
      );
    }

    const improvedMessage = await improveCampaign(
      originalMessage,
      improvementInstruction,
      body?.context,
    );

    return NextResponse.json({
      success: true,
      message: improvedMessage,
    });
  } catch (error) {
    console.error('CAMPAIGN_IMPROVEMENT_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Campaign improvement failed.';

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