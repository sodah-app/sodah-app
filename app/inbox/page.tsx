"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Inbox as InboxIcon,
  MessageCircle,
} from "lucide-react";

type Conversation = {
  id: string;
  business_id?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  channel?: string | null;
  updated_at?: string | null;
};

export default function InboxPage() {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  async function loadInbox(searchValue = "") {
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
        throw new Error(
          data?.error ||
            "Could not load inbox."
        );
      }

      setConversations(
        Array.isArray(data.conversations)
          ? data.conversations
          : []
      );
    } catch (err) {
      console.error("Inbox loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load inbox."
      );

      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInbox();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInbox(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  function formatTime(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <div className="flex min-h-screen">

        {/* -------------------------------------------------- */}
        {/* CONVERSATION SIDEBAR */}
        {/* -------------------------------------------------- */}

        <aside className="w-[380px] border-r border-white/10 bg-[#0c0d10]">

          <div className="p-6">

            <div className="flex items-center justify-between">

              <div>
                <h1 className="text-2xl font-semibold">
                  Inbox
                </h1>

                <p className="mt-1 text-sm text-white/50">
                  Customer conversations
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                <InboxIcon
                  size={20}
                  className="text-white/70"
                />
              </div>

            </div>

            {/* SEARCH */}

            <div className="relative mt-6">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
              />

            </div>

          </div>

          {/* ------------------------------------------------ */}
          {/* CONVERSATION LIST */}
          {/* ------------------------------------------------ */}

          <div className="border-t border-white/10">

            {loading && (
              <div className="p-6 text-sm text-white/40">
                Loading conversations...
              </div>
            )}

            {!loading && error && (
              <div className="p-6">
                <p className="text-sm text-red-400">
                  {error}
                </p>
              </div>
            )}

            {!loading &&
              !error &&
              conversations.length === 0 && (
                <div className="flex flex-col items-center px-6 py-16 text-center">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                    <MessageCircle
                      size={24}
                      className="text-white/30"
                    />
                  </div>

                  <p className="mt-4 text-sm font-medium text-white/60">
                    No conversations yet
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Customer messages will appear here.
                  </p>

                </div>
              )}

            {!loading &&
              !error &&
              conversations.map(
                (conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() =>
                      setSelectedConversation(
                        conversation
                      )
                    }
                    className={`flex w-full items-center gap-4 border-b border-white/5 px-5 py-4 text-left transition ${
                      selectedConversation?.id ===
                      conversation.id
                        ? "bg-white/10"
                        : "hover:bg-white/5"
                    }`}
                  >

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <MessageCircle
                        size={18}
                        className="text-white/60"
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center justify-between gap-2">

                        <p className="truncate text-sm font-medium">
                          {conversation.customer_name ||
                            conversation.customer_phone ||
                            "Customer"}
                        </p>

                        <span className="shrink-0 text-[11px] text-white/30">
                          {formatTime(
                            conversation.last_message_at ||
                              conversation.updated_at
                          )}
                        </span>

                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">

                        <p className="truncate text-xs text-white/40">
                          {conversation.last_message ||
                            "No messages yet"}
                        </p>

                        {!!conversation.unread_count && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-black">
                            {conversation.unread_count}
                          </span>
                        )}

                      </div>

                    </div>

                  </button>
                )
              )}

          </div>

        </aside>

        {/* -------------------------------------------------- */}
        {/* MESSAGE PANEL */}
        {/* -------------------------------------------------- */}

        <section className="flex flex-1">

          {!selectedConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                <MessageCircle
                  size={28}
                  className="text-white/30"
                />
              </div>

              <h2 className="mt-5 text-lg font-medium">
                Your Inbox
              </h2>

              <p className="mt-2 text-sm text-white/35">
                Select a conversation to view messages.
              </p>

            </div>
          ) : (
            <div className="flex flex-1 flex-col">

              <header className="border-b border-white/10 p-5">

                <h2 className="font-medium">
                  {selectedConversation.customer_name ||
                    selectedConversation.customer_phone ||
                    "Customer"}
                </h2>

                {selectedConversation.customer_phone && (
                  <p className="mt-1 text-xs text-white/40">
                    {selectedConversation.customer_phone}
                  </p>
                )}

              </header>

              <div className="flex flex-1 items-center justify-center">

                <p className="text-sm text-white/30">
                  Messages for this conversation
                  will appear here.
                </p>

              </div>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}