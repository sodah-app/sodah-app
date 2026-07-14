"use client";

import "@n8n/chat/style.css";
import { createChat } from "@n8n/chat";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import "./chat-theme.css";

export default function BusinessAI() {
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId =
        session?.user?.id || "";

      const { data: business } =
        await supabase
          .from("businesses")
          .select("business_id")
          .eq("user_id", userId)
          .single();

      const businessId =
        business?.business_id || "";

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
      });

      setTimeout(() => {
        document
          .querySelector(
            ".n8n-chat-launcher"
          )
          ?.click();
      }, 300);
    };

    init();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] relative">
      <button
        onClick={() => {
          window.location.href =
            "/dashboard";
        }}
        className="
          fixed
          top-5
          left-5
          z-[9999]
          px-5
          py-3
          rounded-xl
          bg-blue-600
          text-white
          font-semibold
          shadow-xl
          hover:bg-blue-700
          transition-all
        "
      >
        ← Back to Dashboard
      </button>

      <div id="n8n-chat" />
    </div>
  );
}