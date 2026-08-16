"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Mail,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function OAuthSuccess() {
  const router = useRouter();

  const [connected, setConnected] =
    useState(false);

  // Loading 2 second
  useEffect(() => {
    const loading =
      setTimeout(() => {
        setConnected(true);
      }, 1000);

    // Redirect after 7 seconds
    const redirect =
      setTimeout(() => {
        router.push(
          "/dashboard/email-ai"
        );
      }, 4000);

    return () => {
      clearTimeout(loading);
      clearTimeout(redirect);
    };
  }, [router]);

  return (
    <div
      className="
      min-h-screen
      bg-[#050816]
      flex
      items-center
      justify-center
      px-6
      overflow-hidden
      text-white
    "
    >
      {/* BACKGROUND */}

      <div
        className="
        absolute
        top-[-200px]
        left-[-200px]
        w-[500px]
        h-[500px]
        rounded-full
        bg-blue-600/20
        blur-[150px]
      "
      />

      <div
        className="
        absolute
        bottom-[-250px]
        right-[-200px]
        w-[500px]
        h-[500px]
        rounded-full
        bg-purple-600/20
        blur-[150px]
      "
      />

      {/* CARD */}

      <div
        className="
        relative
        w-full
        max-w-xl
        rounded-[40px]
        border
        border-white/10
        bg-white/[0.05]
        backdrop-blur-3xl
        p-10
        text-center
        shadow-[0_40px_120px_rgba(0,0,0,0.45)]
      "
      >
        {/* LOADING */}

        {!connected && (
          <>
            <div
              className="
              relative
              w-32
              h-32
              mx-auto
              "
            >
              <div
                className="
                absolute
                inset-0
                rounded-full
                border-[6px]
                border-white/10
              "
              />

              <div
                className="
                absolute
                inset-0
                rounded-full
                border-[6px]
                border-transparent
                border-t-blue-500
                border-r-purple-500
                animate-spin
              "
              />

              <div
                className="
                absolute
                inset-0
                flex
                items-center
                justify-center
                text-4xl
              "
              >
                <Mail size={44} />
              </div>
            </div>

            <h1
              className="
              text-4xl
              font-bold
              mt-10
            "
            >
              Connecting Gmail...
            </h1>

            <p
              className="
              text-gray-400
              mt-5
              text-lg
            "
            >
              Verifying account
              permissions and
              preparing Email AI.
            </p>
          </>
        )}

        {/* SUCCESS */}

        {connected && (
          <>
            <div
              className="
              relative
              w-32
              h-32
              mx-auto
              "
            >
              <div
                className="
                absolute
                inset-0
                rounded-full
                bg-green-500/20
                animate-pulse
              "
              />

              <div
                className="
                absolute
                inset-0
                flex
                items-center
                justify-center
              "
              >
                <CheckCircle2
                  size={90}
                  className="
                  text-green-400
                  "
                />
              </div>
            </div>

            <h1
              className="
              text-5xl
              font-black
              mt-10
              bg-gradient-to-r
              from-green-400
              via-emerald-400
              to-cyan-400
              bg-clip-text
              text-transparent
            "
            >
              Gmail Connected
            </h1>

            <p
              className="
              text-gray-400
              mt-6
              text-lg
              leading-8
            "
            >
              Your Gmail account has
              been connected
              successfully.

              <br />

              Email campaigns,
              automated replies and
              AI workflows are now
              enabled.
            </p>

            {/* PREMIUM BAR */}

            <div className="mt-10">
              <div
                className="
                h-3
                rounded-full
                overflow-hidden
                bg-white/10
              "
              >
                <div
                  className="
                  h-full
                  rounded-full
                  bg-gradient-to-r
                  from-blue-500
                  via-purple-500
                  to-green-500
                  animate-[loading_3s_linear]
                "
                  style={{
                    width: "100%",
                  }}
                />
              </div>

              <p
                className="
                mt-5
                text-gray-500
              "
              >
                Redirecting to Email
                AI Dashboard...
              </p>
            </div>
          </>
        )}

        {/* BUTTON */}

        <button
          onClick={() =>
            router.push(
              "/dashboard/email-ai"
            )
          }
          className="
          mt-10
          px-8
          py-4
          rounded-2xl
          bg-gradient-to-r
          from-blue-500
          via-purple-500
          to-purple-700
          font-bold
          shadow-[0_20px_60px_rgba(99,102,241,0.4)]
          hover:scale-105
          transition
        "
        >
          Continue →
        </button>
      </div>
    </div>
  );
}