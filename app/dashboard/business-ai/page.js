"use client";

import "@n8n/chat/style.css";
import { createChat } from "@n8n/chat";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import "./chat-theme.css";

export default function BusinessAI() {
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        const userId = session?.user?.id || "";

        let businessId = "";

        if (userId) {
          const { data: business } =
            await supabase
              .from("businesses")
              .select("business_id")
              .eq("user_id", userId)
              .maybeSingle();

          businessId =
            business?.business_id || "";
        }

        if (!mounted) return;

        createChat({
          webhookUrl:
            "https://solomon-n8n.duckdns.org/webhook/636a969b-6e73-4954-b2cf-1586d5492cfa/chat",

          target: "#n8n-chat",

          mode: "fullscreen",

          metadata: {
            business_id: businessId,
            user_id: userId,
          },

          initialMessages: [
            "👋 Welcome to Sodah AI.",
            "I can help update your business profile.",
            "What would you like to change today?",
          ],

          i18n: {
            en: {
              title: "Sodah AI",
              subtitle:
                "Your AI business assistant",
              inputPlaceholder:
                "Tell Sodah what you'd like to update...",
              getStarted:
                "Start a new conversation",
            },
          },
        });
      } catch (error) {
        console.error(
          "Business AI initialization error:",
          error
        );
      }
    };

    init();

    return () => {
      mounted = false;

      const chat =
        document.querySelector("#n8n-chat");

      if (chat) {
        chat.innerHTML = "";
      }
    };
  }, []);

  return (
    <main className="business-ai-page">
      <button
        type="button"
        onClick={() => {
          window.location.href =
            "/channels";
        }}
        className="business-ai-back"
      >
        ← Back to home
      </button>

      <div
        id="n8n-chat"
        className="business-ai-chat"
      />
    </main>
  );
}