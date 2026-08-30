import type { ChannelAdapter } from "./types";
import { createWhatsAppAdapter } from "./whatsapp";
import { createInstagramAdapter } from "./instagram";
import { createFacebookAdapter } from "./facebook";
import { createTikTokAdapter } from "./tiktok";

type AdapterConfig = {
  send: ChannelAdapter["sendMessage"] extends (
    input: infer I
  ) => Promise<infer O>
    ? (input: I) => Promise<O>
    : never;
};

export function createChannelRouter(
  config: AdapterConfig
): Record<ChannelAdapter["channel"], ChannelAdapter> {
  return {
    whatsapp: createWhatsAppAdapter({ send: config.send }),
    instagram: createInstagramAdapter({ send: config.send }),
    facebook: createFacebookAdapter({ send: config.send }),
    tiktok: createTikTokAdapter({ send: config.send }),
  };
}

export function getChannelAdapter(
  router: Record<ChannelAdapter["channel"], ChannelAdapter>,
  channel: ChannelAdapter["channel"]
): ChannelAdapter {
  const adapter = router[channel];

  if (!adapter) {
    throw new Error(`Unsupported channel: ${channel}`);
  }

  return adapter;
}
