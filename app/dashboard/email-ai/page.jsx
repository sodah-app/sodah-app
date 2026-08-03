"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";

export default function EmailAIPage() {
  const router = useRouter();

  const [gmails, setGmails] =
    useState([]);

  const [campaigns, setCampaigns] =
    useState(0);

  const [emailsSent, setEmailsSent] =
    useState(0);

  const [replies, setReplies] =
    useState(0);

useEffect(() => {
  supabase.auth.getUser().then(
    ({ data }) => {
      console.log(
        "CURRENT USER:",
        data.user
      );
    }
  );
}, []);


useEffect(() => {
  console.log(
    "Replies State:",
    replies
  );
}, [replies]);

useEffect(() => {
  console.log(
    "Emails State:",
    emailsSent
  );
}, [emailsSent]);


const loadDashboard =
  useCallback(async () => {
    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      /*
      Gmail
      */

      const {
        data: gmailData,
      } = await supabase
        .from(
          "gmail_accounts"
        )
        .select("*")
        .eq(
          "user_id",
          user.id
        );

      setGmails(
        gmailData || []
      );

      /*
      Campaigns
      */

      const {
        data:
          campaignData,
      } = await supabase
        .from(
          "email_campaigns"
        )
        .select("*");

      console.log(
        "CAMPAIGNS:",
        campaignData
      );

      setCampaigns(
        campaignData
          ?.length || 0
      );

      const totalSent =
        (
          campaignData ||
          []
        ).reduce(
          (
            total,
            row
          ) =>
            total +
            Number(
              row.sent_count ||
                0
            ),
          0
        );

      console.log(
        "TOTAL SENT:",
        totalSent
      );

      setEmailsSent(
        totalSent
      );

      /*
      Replies
      */

      const {
        data:
          replyData,
      } = await supabase
        .from(
          "email_replies"
        )
        .select("*");

      console.log(
        "REPLIES:",
        replyData
      );

      setReplies(
        replyData
          ?.length || 0
      );
    } catch (
      err
    ) {
      console.log(
        err
      );
    }
  }, []);


  useEffect(() => {
    loadDashboard();

    const channel =
      supabase
        .channel(
          "email-dashboard"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "email_campaigns",
          },
          () =>
            loadDashboard()
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "email_replies",
          },
          () =>
            loadDashboard()
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "gmail_accounts",
          },
          () =>
            loadDashboard()
        )

        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [loadDashboard]);

  const connectGmail =
    async () => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      window.location.href =
        `https://solomon-n8n.duckdns.org/webhook/gmail/connect?user_id=${user.id}`;
    };

  const disconnectGmail =
    async (id) => {
      await supabase
        .from(
          "gmail_accounts"
        )
        .delete()
        .eq("id", id);

      loadDashboard();
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#08111f] via-[#0d1528] to-[#111a31] text-white">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <button
          onClick={() =>
            router.back()
          }
          className="text-gray-400 hover:text-white mb-5"
        >
          ← Back
        </button>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-5xl font-bold">
              Email AI ✨
            </h1>

            <p className="text-gray-400 mt-3 text-lg">
              AI Powered Email
              Campaigns that
              convert.
            </p>
          </div>

          <div className="hidden lg:flex w-32 h-32 rounded-[35px] bg-white/5 border border-white/10 items-center justify-center">
            <div className="text-6xl">
              📩
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <Card
            title="Connected Gmail"
            value={
              gmails.length
            }
            subtitle={
              gmails[0]
                ?.gmail_email ||
              "No Gmail"
            }
            color="from-blue-500/20 to-cyan-500/20"
          />

          <Card
            title="Campaigns"
            value={
              campaigns
            }
            subtitle={`${campaigns} campaigns`}
            color="from-purple-500/20 to-indigo-500/20"
          />

          <Card
            title="Replies"
            value={
              replies
            }
            subtitle={`${replies} replies`}
            color="from-green-500/20 to-emerald-500/20"
          />

          <Card
            title="Emails Sent"
            value={
              emailsSent
            }
            subtitle={`${emailsSent} emails`}
            color="from-orange-500/20 to-red-500/20"
          />
        </div>

        <div className="mt-5 grid lg:grid-cols-2 gap-5">
          <div className="rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-5 h-[290px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <img
                  src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico"
                  className="w-12 h-12"
                />

                <h2 className="text-3xl font-bold">
                  Gmail Accounts
                </h2>
              </div>

              <div className="space-y-3">
                {gmails.map(
                  (
                    gmail
                  ) => (
                    <div
                      key={
                        gmail.id
                      }
                      className="bg-white/5 rounded-2xl border border-white/10 h-14 px-4 flex items-center justify-between"
                    >
                      <span className="text-green-400 truncate">
                        ✅{" "}
                        {
                          gmail.gmail_email
                        }
                      </span>

                      <button
                        onClick={() =>
                          disconnectGmail(
                            gmail.id
                          )
                        }
                        className="text-red-300"
                      >
                        Logout
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <button
              onClick={
                connectGmail
              }
              className="h-12 rounded-2xl bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 font-medium"
            >
              📧 Connect
              Another Gmail
            </button>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-5 h-[290px] flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-2xl mb-5">
                ✨
              </div>

              <h2 className="text-3xl font-bold">
                AI Campaigns
              </h2>

              <p className="text-gray-400 mt-3">
                Launch AI
                powered
                campaigns.
              </p>
            </div>

            <button
              disabled={
                gmails.length ===
                0
              }
              onClick={() =>
                router.push(
                  "/dashboard/email-ai/new-campaign"
                )
              }
              className={
                gmails.length
                  ? `
                    h-12
                    rounded-2xl
                    bg-gradient-to-r
                    from-cyan-400
                    via-purple-500
                    to-pink-500
                  `
                  : `
                    h-12
                    rounded-2xl
                    bg-gray-700
                    opacity-50
                  `
              }
            >
              ✨ New Campaign →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  subtitle,
  color,
}) {
  return (
    <div
      className={`
        rounded-[28px]
        h-[150px]
        p-5
        bg-gradient-to-br
        ${color}
        border
        border-white/10
        backdrop-blur-xl
      `}
    >
      <p className="text-gray-300">
        {title}
      </p>

      <h2 className="text-5xl font-bold mt-4">
        {value}
      </h2>

      <p className="text-gray-400 mt-3">
        {subtitle}
      </p>
    </div>
  );
}