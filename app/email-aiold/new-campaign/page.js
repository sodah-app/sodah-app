"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";

export default function NewCampaignPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);

  const [user, setUser] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Welcome to Sodah.\n\nI'm your AI Growth Assistant.\n\nTell me about your business and I'll build your lead generation campaign.",
    },
  ]);

  const [input, setInput] = useState("");

  const [recentCampaigns, setRecentCampaigns] = useState([]);

  const [campaignReady, setCampaignReady] = useState(false);
  const [campaignData, setCampaignData] = useState(null);

  useEffect(() => {
    initialise();
  }, []);

  async function initialise() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUser(user);
    loadCampaigns(user.id);
  }

  async function loadCampaigns(userId) {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setRecentCampaigns(data || []);
  }

  function openCampaign(campaign) {
    router.push(`/dashboard/email-ai/${campaign.id}`);
  }

  async function sendMessage() {
    if (!input.trim()) return;

    if (!user) {
      alert("Please login first.");
      return;
    }

    const text = input;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
      },
    ]);

    setInput("");
    setThinking(true);

    try {
      const res = await fetch(
        "https://solomon-n8n.duckdns.org/webhook/sodah-email-ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            message: text,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Email AI failed.");
      }

      const data = await res.json();

      console.log("Email AI:", data);

      if (data.ready) {
        setCampaignReady(true);
        setCampaignData(data.campaign);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ??
            data.message ??
            JSON.stringify(data, null, 2),
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't process your request. Please try again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function launchCampaign() {
    if (!campaignData) return;

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found.");

      // Create ONE campaign row
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          business_name: campaignData.business_name,
          business_description: campaignData.business_description,
          products_services: campaignData.products_services,
          ideal_customer: campaignData.ideal_customer,
          campaign_goal: campaignData.campaign_goal,
          target_countries: campaignData.target_countries,
          brand_tone: campaignData.brand_tone,
          status: "running",
        })
        .select()
        .single();

      if (error) throw error;

      console.log("Campaign Created:", campaign.id);

      // Start Lead Engine
      const response = await fetch(
        "https://solomon-n8n.duckdns.org/webhook/lead_engine",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            user_id: user.id,

            business_name: campaign.business_name,
            business_description: campaign.business_description,
            products_services: campaign.products_services,
            ideal_customer: campaign.ideal_customer,
            campaign_goal: campaign.campaign_goal,
            target_countries: campaign.target_countries,
            brand_tone: campaign.brand_tone,
            status: campaign.status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start Lead Engine.");
      }

      const result = await response.json();

      console.log("Lead Engine:", result);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🚀 Campaign launched successfully!

Campaign ID:
${campaign.id}

Lead Engine has started.

Sodah is now:

• Generating intelligent search queries
• Searching Google
• Discovering company websites
• Extracting verified emails
• Qualifying businesses
• Building your outreach list

You can safely leave this page while Sodah continues processing.`,
        },
      ]);

      await loadCampaigns(user.id);

      setCampaignReady(false);
      setCampaignData(null);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to launch campaign.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050816] text-white">
      <Sidebar
        recentCampaigns={recentCampaigns}
        openCampaign={openCampaign}
      />

      <ChatPanel
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        thinking={thinking}
        campaignReady={campaignReady}
        campaignData={campaignData}
        launchCampaign={launchCampaign}
        loading={loading}
      />
    </div>
  );
}