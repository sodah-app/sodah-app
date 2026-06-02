"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Settings() {
  const router = useRouter();

  // 🌗 DARK MODE STATE
  const [dark, setDark] = useState(false);

  // ============================================
  // LOAD SAVED THEME GLOBALLY
  // ============================================
  useEffect(() => {
    const savedTheme =
      localStorage.getItem("theme");

    if (savedTheme === "dark") {
      setDark(true);

      document.documentElement.classList.add(
        "dark"
      );

      document.body.style.background =
        "#020617";

      document.body.style.color =
        "white";
    } else {
      setDark(false);

      document.documentElement.classList.remove(
        "dark"
      );

      document.body.style.background =
        "#ffffff";

      document.body.style.color =
        "black";
    }
  }, []);

  // ============================================
  // GLOBAL DARK MODE TOGGLE
  // ============================================
  const toggleDark = () => {
    const newMode = !dark;

    setDark(newMode);

    if (newMode) {
      // ENABLE DARK
      document.documentElement.classList.add(
        "dark"
      );

      localStorage.setItem(
        "theme",
        "dark"
      );

      // APPLY TO WHOLE SYSTEM
      document.body.style.background =
        "#020617";

      document.body.style.color =
        "white";
    } else {
      // DISABLE DARK
      document.documentElement.classList.remove(
        "dark"
      );

      localStorage.setItem(
        "theme",
        "light"
      );

      // APPLY TO WHOLE SYSTEM
      document.body.style.background =
        "#ffffff";

      document.body.style.color =
        "black";
    }

    // FORCE REFRESH DASHBOARD COLORS
    window.dispatchEvent(
      new Event("storage")
    );
  };

  return (
    <div
      className={`
        min-h-screen
        transition-all
        duration-300
        px-4
        py-6
        ${
          dark
            ? "bg-[#020617] text-white"
            : "bg-gray-100 text-black"
        }
      `}
    >
      <div className="w-full max-w-xl mx-auto space-y-4">
        {/* HEADER */}
        <div>
          <h1
            className={`
              text-3xl
              font-bold
              ${
                dark
                  ? "text-white"
                  : "text-black"
              }
            `}
          >
            ⚙️ Settings
          </h1>

          <p
            className={`
              text-sm
              ${
                dark
                  ? "text-gray-400"
                  : "text-gray-500"
              }
            `}
          >
            Manage your account and preferences
          </p>
        </div>

        {/* PROFILE */}
        <Card
          dark={dark}
          onClick={() =>
            router.push("/profile")
          }
        >
          <Title
            dark={dark}
            title="Profile"
            desc="Manage your business details"
          />
        </Card>

        {/* DARK MODE */}
        <Card dark={dark}>
          <div className="flex justify-between items-center">
            <Title
              dark={dark}
              title="Dark Mode"
              desc="Switch dashboard appearance"
            />

            <div
              onClick={toggleDark}
              className={`
                w-14
                h-7
                flex
                items-center
                rounded-full
                p-1
                cursor-pointer
                transition-all
                duration-300
                ${
                  dark
                    ? "bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/30"
                    : "bg-gray-300"
                }
              `}
            >
              <div
                className={`
                  bg-white
                  w-5
                  h-5
                  rounded-full
                  shadow-md
                  transform
                  transition
                  duration-300
                  ${
                    dark
                      ? "translate-x-7"
                      : "translate-x-0"
                  }
                `}
              />
            </div>
          </div>
        </Card>

        {/* WHATSAPP SUPPORT */}
        <Card
          dark={dark}
          onClick={() =>
            window.open(
              "https://wa.me/971544027954",
              "_blank"
            )
          }
        >
          <Title
            dark={dark}
            title="System Support"
            desc="Chat with us on WhatsApp"
          />
        </Card>

        {/* AI ASSISTANT */}
        <Card
          dark={dark}
          onClick={() =>
            window.open(
              "https://solomon-n8n.duckdns.org/webhook/a7935547-15a5-4742-8ac0-b8fab937d44c/chat",
              "_blank"
            )
          }
        >
          <Title
            dark={dark}
            title="AI Assistant"
            desc="Ask anything about the system"
          />
        </Card>

        {/* RESET */}
        <div
          className={`
            p-5
            rounded-2xl
            cursor-pointer
            transition-all
            duration-300
            border
            ${
              dark
                ? "bg-red-500/10 border-red-500/30"
                : "bg-red-50 border-red-300"
            }
          `}
        >
          <h3 className="text-red-500 font-semibold">
            Reset Account
          </h3>

          <p
            className={`
              text-sm
              ${
                dark
                  ? "text-gray-400"
                  : "text-gray-500"
              }
            `}
          >
            Clear all data and restart
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   CARD
============================================ */

function Card({
  children,
  onClick,
  dark,
}) {
  return (
    <div
      onClick={onClick}
      className={`
        p-5
        rounded-2xl
        transition-all
        duration-300
        cursor-pointer
        hover:scale-[1.01]
        hover:shadow-xl
        ${
          dark
            ? "bg-white/5 border border-white/10 backdrop-blur-xl hover:border-green-400/30"
            : "bg-white border border-gray-200 hover:border-green-400/40"
        }
      `}
    >
      {children}
    </div>
  );
}

/* ============================================
   TITLE
============================================ */

function Title({
  title,
  desc,
  dark,
}) {
  return (
    <div>
      <h3
        className={`
          font-semibold
          ${
            dark
              ? "text-white"
              : "text-black"
          }
        `}
      >
        {title}
      </h3>

      <p
        className={`
          text-sm
          ${
            dark
              ? "text-gray-400"
              : "text-gray-500"
          }
        `}
      >
        {desc}
      </p>
    </div>
  );
}