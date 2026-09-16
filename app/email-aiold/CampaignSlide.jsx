"use client";

import { useState } from "react";

export default function CampaignSlide({
  onClose,
  connectedGmail,
  campaigns,
  replies,
  emailsSent,
}) {
  const [subject, setSubject] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [logs] = useState([
    "Waiting for campaign..."
  ]);

  return (
    <div
      className="
      fixed
      inset-0
      z-50
      bg-black/30
      backdrop-blur-sm
      p-6
      animate-fadeIn
      "
    >

      <div
        className="
        bg-white
        rounded-[40px]
        shadow-2xl
        w-full
        h-full
        overflow-hidden
        grid
        lg:grid-cols-[2fr_380px]
        "
      >

        {/* LEFT */}

        <div className="
        p-10
        overflow-auto
        ">

          <div className="
          flex
          justify-between
          mb-10
          ">

            <h1 className="
            text-4xl
            font-bold
            ">
              AI Campaign
            </h1>

            <button
              onClick={onClose}
              className="
              px-6
              py-3
              rounded-xl
              bg-gray-100
              "
            >
              Done
            </button>

          </div>

          {!connectedGmail && (

            <div className="
            mb-8
            p-5
            rounded-2xl
            bg-yellow-50
            border
            ">
              Gmail is not connected.

              <button
                className="
                mt-4
                block
                px-5
                py-3
                rounded-xl
                bg-blue-600
                text-white
                "
              >
                Connect Gmail
              </button>
            </div>

          )}

          <input
            value={subject}
            onChange={(e)=>
              setSubject(
                e.target.value
              )
            }
            placeholder="Email Subject"
            className="
            w-full
            p-5
            border
            rounded-2xl
            mb-5
            "
          />

          <textarea
            rows={12}
            value={message}
            onChange={(e)=>
              setMessage(
                e.target.value
              )
            }
            placeholder="Write your email..."
            className="
            w-full
            p-5
            border
            rounded-2xl
            mb-5
            "
          />

          <input
            type="file"
            accept=".csv"
            className="
            w-full
            p-5
            border
            rounded-2xl
            mb-6
            "
          />

          <div className="
          flex
          gap-4
          ">

            <button
              className="
              flex-1
              p-5
              rounded-2xl
              text-white
              bg-gradient-to-r
              from-purple-600
              to-blue-600
              "
            >
              ✨ Improve Email
            </button>

            <button
              className="
              flex-1
              p-5
              rounded-2xl
              text-white
              bg-gradient-to-r
              from-green-500
              to-emerald-500
              "
            >
              📤 Send Campaign
            </button>

          </div>

        </div>

        {/* RIGHT */}

        <div className="
        bg-slate-50
        border-l
        p-8
        overflow-auto
        ">

          <h2 className="
          text-2xl
          font-bold
          mb-8
          ">
            Live Dashboard
          </h2>

          <div className="
          space-y-5
          ">

            <SmallCard
              title="Connected Gmail"
              value={connectedGmail}
            />

            <SmallCard
              title="Campaigns"
              value={campaigns}
            />

            <SmallCard
              title="Replies"
              value={replies}
            />

            <SmallCard
              title="Emails Sent"
              value={emailsSent}
            />

          </div>

          <div className="mt-10">

            <p className="
            font-semibold
            mb-3
            ">
              Campaign Progress
            </p>

            <div className="
            h-4
            bg-gray-200
            rounded-full
            ">

              <div
                className="
                h-4
                rounded-full
                bg-green-500
                "
                style={{
                  width:"0%"
                }}
              />

            </div>

          </div>

          <div className="mt-10">

            <h3 className="
            font-bold
            mb-4
            ">
              Activity
            </h3>

            <div className="
            bg-white
            rounded-2xl
            p-5
            h-72
            overflow-auto
            border
            ">

              {logs.map(
                (log,index)=>(
                  <div
                    key={index}
                    className="
                    py-3
                    border-b
                    "
                  >
                    {log}
                  </div>
                )
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

function SmallCard({
  title,
  value,
}) {
  return (
    <div className="
    bg-white
    rounded-2xl
    p-5
    shadow
    ">
      <p className="
      text-gray-500
      ">
        {title}
      </p>

      <h1 className="
      text-3xl
      font-bold
      mt-2
      ">
        {value}
      </h1>
    </div>
  );
}