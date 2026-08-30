"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Inbox as InboxIcon,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

const CHANNELS = {
  whatsapp: {
    label: "WhatsApp",
    short: "WA",
    icon: "🟢",
  },
  instagram: {
    label: "Instagram",
    short: "IG",
    icon: "🟣",
  },
  facebook: {
    label: "Facebook",
    short: "FB",
    icon: "🔵",
  },
  tiktok: {
    label: "TikTok",
    short: "TT",
    icon: "⚫",
  },
} as const;

type ChannelKey = keyof typeof CHANNELS;

type Conversation = {
  id: string;
  business_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  channel?: string | null;
  updated_at?: string | null;
};

type ConnectedChannels = Record<ChannelKey, boolean>;

export default function MobileInbox() {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [activeChannel, setActiveChannel] =
    useState<"all" | ChannelKey>("all");

  const [connectedChannels, setConnectedChannels] =
    useState<ConnectedChannels>({
      whatsapp: false,
      instagram: false,
      facebook: false,
      tiktok: false,
    });
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");

  const businessIdFromCurrentUser = async () => {
    const auth = await getCurrentUser();

    if (!auth?.authenticated || !auth?.business?.business_id) {
      throw new Error("Unable to determine the active Sodah business.");
    }

    return String(auth.business.business_id).trim();
  };

  const loadChannelStatus = async () => {
    setStatusLoading(true);

    try {
      const businessId = await businessIdFromCurrentUser();

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (businessError) {
        throw new Error(businessError.message);
      }

      const readStatus = async (basePath: string): Promise<boolean | null> => {
        try {
          const response = await fetch(
            `${basePath}?businessId=${encodeURIComponent(businessId)}`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          );

          if (!response.ok) return null;

          const data = await response.json();
          const value =
            data?.connected ??
            data?.isConnected ??
            data?.alreadyConnected ??
            data?.instagramConnected ??
            data?.facebookConnected ??
            data?.tiktokConnected;

          return typeof value === "boolean" ? value : null;
        } catch (statusError) {
          console.warn("[Mobile Inbox] Channel status failed:", statusError);
          return null;
        }
      };

      const [instagram, facebook, tiktok] = await Promise.all([
        readStatus("/api/auth/instagram/status"),
        readStatus("/api/auth/facebook/status"),
        readStatus("/api/auth/tiktok/status"),
      ]);

      const businessFlag = (names: string[]): boolean =>
        names.some((name) => business?.[name] === true);

      setConnectedChannels({
        whatsapp:
          business?.whatsapp_connected === true ||
          business?.whatsappConnected === true,
        instagram:
          instagram ??
          businessFlag(["instagram_connected", "instagramConnected"]),
        facebook:
          facebook ??
          businessFlag(["facebook_connected", "facebookConnected"]),
        tiktok:
          tiktok ??
          businessFlag(["tiktok_connected", "tiktokConnected"]),
      });
    } catch (statusError) {
      console.error("[Mobile Inbox] Channel status error:", statusError);
      setConnectedChannels({
        whatsapp: false,
        instagram: false,
        facebook: false,
        tiktok: false,
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const loadInbox = async (searchValue = "") => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      const response = await fetch(
        `/api/inbox?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not load inbox.");
      }

      const incomingConversations: unknown =
        data?.conversations;

      setConversations(
        Array.isArray(incomingConversations)
          ? (incomingConversations as Conversation[])
          : []
      );
    } catch (loadError) {
      console.error("[Mobile Inbox] Loading error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load inbox."
      );
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannelStatus();
    loadInbox();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInbox(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const visibleChannels = useMemo<ChannelKey[]>(() => {
    return (Object.keys(CHANNELS) as ChannelKey[]).filter(
      (channel) => connectedChannels[channel]
    );
  }, [connectedChannels]);

  const filteredConversations = useMemo<Conversation[]>(() => {
    if (activeChannel === "all") {
      return conversations;
    }

    return conversations.filter(
      (conversation: Conversation) =>
        String(conversation.channel || "").toLowerCase() ===
        activeChannel
    );
  }, [conversations, activeChannel]);

  function formatTime(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function channelName(channel?: string | null) {
    return CHANNELS[String(channel || "").toLowerCase()]?.label || "Channel";
  }

  function channelIcon(channel?: string | null) {
    return CHANNELS[String(channel || "").toLowerCase()]?.icon || "💬";
  }

  return (
    <main className="min-h-screen bg-[#08090b] text-white md:hidden">
      {selectedConversation ? (
        <section className="flex min-h-screen flex-col bg-[#08090b]">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0c0d10]/95 px-4 py-3 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setSelectedConversation(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold">
                  {selectedConversation.customer_name ||
                    selectedConversation.customer_phone ||
                    "Customer"}
                </p>
              </div>

              <p className="mt-0.5 truncate text-[11px] text-white/40">
                {channelIcon(selectedConversation.channel)} {channelName(selectedConversation.channel)}
              </p>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                <MessageCircle size={25} className="text-white/30" />
              </div>

              <p className="mt-4 text-sm font-medium text-white/60">
                Messages for this conversation
              </p>

              <p className="mt-1 text-xs leading-5 text-white/30">
                Your existing message thread and sending logic can be connected here
                without changing the mobile conversation layout.
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-white/10 bg-[#0c0d10]/95 p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <input
                disabled
                placeholder="Type a message..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />

              <span className="text-xs text-white/30">➤</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="min-h-screen pb-5">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c0d10]/95 px-4 pb-3 pt-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[3px] text-cyan-400">
                  Omnichannel
                </p>
                <h1 className="mt-1 text-2xl font-black">Inbox</h1>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                <InboxIcon size={19} className="text-white/60" />
              </div>
            </div>

            <div className="relative mt-4">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
              />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <button
                type="button"
                onClick={() => setActiveChannel("all")}
                className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold ${
                  activeChannel === "all"
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                    : "border-white/10 bg-white/5 text-white/50"
                }`}
              >
                All
              </button>

              {visibleChannels.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setActiveChannel(channel)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold ${
                    activeChannel === channel
                      ? "border-green-400/30 bg-green-400/10 text-green-300"
                      : "border-white/10 bg-white/5 text-white/50"
                  }`}
                >
                  {CHANNELS[channel].icon} {CHANNELS[channel].short}
                </button>
              ))}
            </div>
          </header>

          {statusLoading && (
            <div className="border-b border-white/5 px-4 py-3 text-xs text-white/30">
              Checking connected channels...
            </div>
          )}

          {loading && (
            <div className="p-6 text-center text-sm text-white/40">
              Loading conversations...
            </div>
          )}

          {!loading && error && (
            <div className="m-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && filteredConversations.length === 0 && (
            <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                <MessageCircle size={24} className="text-white/25" />
              </div>

              <p className="mt-4 text-sm font-semibold text-white/60">
                No conversations yet
              </p>

              <p className="mt-1 max-w-xs text-xs leading-5 text-white/30">
                Conversations from your connected customer channels will appear here.
              </p>
            </div>
          )}

          {!loading && !error && filteredConversations.length > 0 && (
            <div>
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversation(conversation)}
                  className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-4 text-left active:bg-white/10"
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">
                    {channelIcon(conversation.channel)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {conversation.customer_name ||
                          conversation.customer_phone ||
                          "Customer"}
                      </p>

                      <span className="shrink-0 text-[10px] text-white/30">
                        {formatTime(
                          conversation.last_message_at ||
                            conversation.updated_at
                        )}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] text-white/35">
                          {channelName(conversation.channel)}
                        </p>
                        <p className="truncate text-xs text-white/45">
                          {conversation.last_message || "No messages yet"}
                        </p>
                      </div>

                      {!!conversation.unread_count && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-black">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
