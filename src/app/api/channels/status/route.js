import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CHANNEL_STATUS = {
  whatsapp: false,
  instagram: false,
  facebook: false,
  tiktok: false,
};

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return [
      "true",
      "1",
      "yes",
      "connected",
      "active",
      "enabled",
    ].includes(normalized);
  }

  return false;
}

function normalizeChannel(channelData) {
  if (typeof channelData === "boolean") {
    return channelData;
  }

  if (typeof channelData === "number") {
    return channelData === 1;
  }

  if (typeof channelData === "string") {
    return normalizeBoolean(channelData);
  }

  if (channelData && typeof channelData === "object") {
    return normalizeBoolean(
      channelData.connected ??
        channelData.isConnected ??
        channelData.active ??
        channelData.enabled ??
        channelData.status
    );
  }

  return false;
}

function normalizeChannelStatus(payload) {
  if (!payload || typeof payload !== "object") {
    return DEFAULT_CHANNEL_STATUS;
  }

  const source =
    payload.channels ??
    payload.data?.channels ??
    payload.data ??
    payload;

  return {
    whatsapp: normalizeChannel(source.whatsapp),
    instagram: normalizeChannel(source.instagram),
    facebook: normalizeChannel(source.facebook),
    tiktok: normalizeChannel(source.tiktok),
  };
}

export async function GET() {
  try {
    /*
     * IMPORTANT:
     * This route must exist and return JSON.
     *
     * The frontend calls:
     *     GET /api/channels/status
     *
     * Replace the temporary status source below with the same
     * database/session lookup that your OAuth connection code uses.
     */

    const channelStatus = {
      ...DEFAULT_CHANNEL_STATUS,
    };

    return NextResponse.json(
      {
        success: true,
        channels: channelStatus,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/channels/status failed:", error);

    return NextResponse.json(
      {
        success: false,
        channels: DEFAULT_CHANNEL_STATUS,
        error: "Unable to load channel status",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}