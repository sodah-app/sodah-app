"use client";

import { useRef, useEffect } from "react";

export default function ChatPanel({
  messages,
  input,
  setInput,
  sendMessage,
  thinking,
  campaignReady,
  campaignData,
  launchCampaign,
  loading,
}) {
  const bottomRef = useRef(null);
  const hasUserMessages = messages.some(
  (message) => message.role === "user"
);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, thinking, campaignReady]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050816]">

      {/* Header */}

{!hasUserMessages && (

<div className="flex-shrink-0 border-b border-white/10 px-8 py-8 transition-all duration-500">

  <h1 className="text-5xl font-bold text-white">
    👋 Welcome to Sodah
  </h1>

  <p className="mt-4 max-w-4xl text-lg leading-8 text-gray-400">
    Tell me about your business naturally.

    I'll understand your company, prepare your outreach strategy,
    identify your ideal customers, build your campaign and get
    everything ready for lead generation.
  </p>

</div>

)}

      {/* Conversation */}

      <div className="flex-1 overflow-y-auto">

        <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">

          {messages.map((message, index) => (

            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div
                className={`max-w-3xl rounded-3xl px-6 py-5 whitespace-pre-wrap leading-7 shadow-xl ${
                  message.role === "assistant"
                    ? "bg-white/5 border border-white/10"
                    : "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600"
                }`}
              >
                {message.content}
              </div>

            </div>

          ))}

          {thinking && (

            <div className="flex">

              <div className="rounded-3xl bg-white/5 border border-white/10 px-6 py-5">
                🤖 Sodah is analysing your business...
              </div>

            </div>

          )}

          {/* Campaign Card */}

          {campaignReady && campaignData && (

            <div className="rounded-[34px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/10 backdrop-blur-xl p-10">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-emerald-400 font-semibold">
                    Campaign Ready
                  </p>

                  <h2 className="text-4xl font-bold mt-2">
                    {campaignData.business_name || "Business"}
                  </h2>

                  <p className="text-gray-400 mt-3">
                    Everything is ready to begin lead generation.
                  </p>

                </div>

                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-4xl">
                  🚀
                </div>

              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-10">

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Business Description
                  </p>

                  <p className="mt-3">
                    {campaignData.business_description || "-"}
                  </p>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Products / Services
                  </p>

                  <p className="mt-3">
                    {campaignData.products_services || "-"}
                  </p>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Ideal Customer
                  </p>

                  <p className="mt-3">
                    {campaignData.ideal_customer || "-"}
                  </p>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Campaign Goal
                  </p>

                  <p className="mt-3">
                    {campaignData.campaign_goal || "-"}
                  </p>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Target Countries
                  </p>

                  <p className="mt-3">
                    {Array.isArray(campaignData.target_countries)
                      ? campaignData.target_countries.join(", ")
                      : campaignData.target_countries || "-"}
                  </p>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Brand Tone
                  </p>

                  <p className="mt-3">
                    {campaignData.brand_tone || "-"}
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Estimated Leads
                  </p>

                  <h3 className="text-3xl font-bold mt-3">
                    12,000+
                  </h3>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Company Websites
                  </p>

                  <h3 className="text-3xl font-bold mt-3">
                    9,500+
                  </h3>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Decision Makers
                  </p>

                  <h3 className="text-3xl font-bold mt-3">
                    7,200+
                  </h3>

                </div>

                <div className="rounded-3xl bg-white/5 p-6">

                  <p className="text-gray-400 text-sm">
                    Status
                  </p>

                  <h3 className="text-2xl font-bold mt-3 text-emerald-400">
                    Ready
                  </h3>

                </div>

              </div>

              <button
                onClick={launchCampaign}
                disabled={loading}
                className="
                  mt-10
                  w-full
                  h-16
                  rounded-3xl
                  bg-gradient-to-r
                  from-cyan-500
                  via-blue-500
                  to-purple-600
                  text-lg
                  font-bold
                  transition-all
                  hover:scale-[1.02]
                  disabled:opacity-50
                "
              >
                {loading
                  ? "Launching..."
                  : "🚀 Launch Campaign"}
              </button>

            </div>

          )}

          <div ref={bottomRef} />

        </div>

      </div>

      {/* Composer */}

      <div className="flex-shrink-0 border-t border-white/10 bg-[#07101d]">

        <div className="max-w-5xl mx-auto p-6">

          <div className="flex items-end gap-4 rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-3">

            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Describe your business..."
              className="
                flex-1
                resize-none
                bg-transparent
                px-4
                py-3
                outline-none
                text-white
                placeholder:text-gray-500
              "
            />

            <button
              onClick={sendMessage}
              disabled={thinking}
              className="
                h-14
                px-8
                rounded-2xl
                bg-gradient-to-r
                from-cyan-500
                via-blue-500
                to-purple-600
                font-semibold
                transition
                hover:scale-105
                disabled:opacity-50
              "
            >
              {thinking ? "Thinking..." : "Send"}
            </button>

          </div>

          <div className="flex justify-between text-sm text-gray-500 mt-5">

            <span>Powered by Sodah AI</span>

            <span>Press Enter to send</span>

          </div>

        </div>

      </div>

    </div>
  );
}