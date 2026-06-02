"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function WelcomePage() {
  const router = useRouter();
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  setIsMobile(window.innerWidth < 768);
}, []);

  const [user, setUser] = useState({
    fullName: "",
  });

  const [bgIndex, setBgIndex] = useState(0);

  const [idleMode, setIdleMode] = useState(false);

  const [currentTime, setCurrentTime] = useState("");

  const idleTimer = useRef(null);

  /* =========================
     PREMIUM AI BACKGROUNDS
  ========================== */

  const backgrounds = [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=100",
  ];

  /* =========================
     BACKGROUND AUTO SWITCH
  ========================== */

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  /* =========================
     CLOCK
  ========================== */

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      const time = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const date = now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      setCurrentTime(`${time} • ${date}`);
    };

    updateClock();

    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  /* =========================
     IDLE / SCREENSAVER MODE
  ========================== */

  useEffect(() => {
    const resetIdleTimer = () => {
      setIdleMode(false);

      clearTimeout(idleTimer.current);

      idleTimer.current = setTimeout(() => {
        setIdleMode(true);
      }, 1 * 60 * 1000); // 1 MINUTES
    };

    window.addEventListener("mousemove", resetIdleTimer);

    window.addEventListener("keydown", resetIdleTimer);

    window.addEventListener("click", resetIdleTimer);

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer.current);

      window.removeEventListener(
        "mousemove",
        resetIdleTimer
      );

      window.removeEventListener(
        "keydown",
        resetIdleTimer
      );

      window.removeEventListener(
        "click",
        resetIdleTimer
      );
    };
  }, []);

  /* =========================
     SUBSCRIPTION VALIDATION
  ========================== */

  useEffect(() => {
    const storedUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    const expiry = storedUser.planExpiry;

    if (
      !expiry ||
      storedUser.subscription !== "active"
    ) {
      router.push("/subscription");

      return;
    }

    const now = new Date();

    const expiryDate = new Date(expiry);

    if (now > expiryDate) {
      alert(
        "Your subscription has expired. Please upgrade to continue."
      );

      router.push("/subscription");

      return;
    }

    setUser({
      fullName:
        storedUser.fullName || "",
    });
  }, [router]);

  /* =========================
     ACTIONS
  ========================== */

  const startAutomationSetup = () => {
    router.push("/automation");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");

    router.push("/");
  };

  /* =========================
     SCREENSAVER MODE
  ========================== */

  if (idleMode) {
    return (
      <div className="relative w-full h-screen overflow-hidden text-white bg-black">
        {/* BACKGROUNDS */}

        {backgrounds.map((bg, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[4000ms] ${
              index === bgIndex
                ? "opacity-100 scale-110"
                : "opacity-0 scale-100"
            }`}
            style={{
              backgroundImage: `url(${bg})`,
              animation:
                "zoomAnimation 18s linear infinite",
            }}
          />
        ))}

        {/* DARK OVERLAY */}

        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* CENTER */}

        <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6">
          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
            alt="Sodah.io"
            className="w-36 mb-6 drop-shadow-2xl"
          />

          <h1 className="text-6xl md:text-8xl font-black tracking-tight bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Sodah.io
          </h1>

          <p className="mt-5 text-xl text-gray-300 tracking-wide">
            AI WhatsApp Automation Platform
          </p>
        </div>

        {/* CLOCK */}

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-black/40 border border-white/10 backdrop-blur-xl px-8 py-4 rounded-full text-center">
            <p className="text-lg font-semibold text-white">
              {currentTime}
            </p>
          </div>
        </div>

        {/* ANIMATION */}

        <style jsx>{`
          @keyframes zoomAnimation {
            0% {
              transform: scale(1);
            }

            100% {
              transform: scale(1.12);
            }
          }
        `}</style>
      </div>
    );
  }

  /* =========================
     MAIN PAGE
  ========================== */

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* BACKGROUNDS */}

      {backgrounds.map((bg, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2500ms] ${
            index === bgIndex
              ? "opacity-100"
              : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${bg})`,
          }}
        />
      ))}

      {/* OVERLAY */}

      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-slate-950/75 to-black/85 backdrop-blur-[2px]" />

      {/* MAIN */}

      <div className="relative z-20 h-screen flex flex-col px-6 py-5">
        {/* TOP BAR */}

        <div className="flex items-center justify-between mb-5">
          {/* LEFT */}

          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
              alt="Sodah.io Logo"
              className="w-10 h-10 object-contain"
            />

            <div>
              <h1 className="text-3xl font-black tracking-tight">
                Sodah.io
              </h1>
            </div>
          </div>

          {/* USER */}

          <div
            onClick={() =>
              router.push("/profile")
            }
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full cursor-pointer"
          >
            <span className="text-sm text-white/90">
              {user.fullName ||
                "Welcome back"}
            </span>

            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-green-400 to-lime-500 flex items-center justify-center font-bold shadow-xl">
              {user.fullName
                ? user.fullName
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>
          </div>
        </div>

        {/* HERO */}

        <div className="mb-5">
          <h2 className="text-5xl md:text-6xl font-black leading-tight max-w-5xl drop-shadow-2xl">
            Welcome to Sodah Automation 🚀
          </h2>

          <p className="text-gray-200 text-lg mt-3 max-w-3xl leading-relaxed">
            Manage your business,
            automate conversations,
            and scale faster with
            powerful AI-driven
            WhatsApp automation.
          </p>
        </div>

        {/* GRID */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

  {/* MOBILE VERSION */}

  {isMobile ? (
    <>
      <Card
        title="💬 Connect WhatsApp"
        desc="Fill business details and connect your number"
        onClick={() => router.push("/mobile/automation")}
        highlight
      />

      <Card
        title="💻 Desktop Features"
        desc="Dashboard, Analytics, Settings and advanced tools are available on Laptop or Desktop computers."
        onClick={() => {}}
      />

      <Card
        title="💰 Subscription"
        desc="Manage your plan"
        onClick={() => router.push("/subscription")}
      />

      <Card
        title="🚪 Logout"
        desc="Securely sign out"
        onClick={handleLogout}
        danger
      />
    </>
  ) : (
    <>
      <Card
        title="📊 Dashboard"
        desc="View chats, bookings & performance"
        onClick={() => router.push("/dashboard")}
      />

      <Card
        title="💬 Connect WhatsApp"
        desc="Fill business details and connect your number"
        onClick={startAutomationSetup}
      />

      <Card
        title="🚪 Logout"
        desc="Securely sign out of your account"
        onClick={handleLogout}
        danger
      />

      <Card
        title="📈 Analytics"
        desc="Track performance & growth"
        onClick={() => router.push("/analytics")}
      />

      <Card
        title="⚙️ Settings"
        desc="Manage your account & preferences"
        onClick={() => router.push("/settings")}
      />

      <Card
        title="💰 Subscription"
        desc="Upgrade your plan & unlock features"
        onClick={() => router.push("/subscription")}
        highlight
      />
    </>
  )}

</div>

        {/* INDICATORS */}

        <div className="flex justify-center gap-2 mt-5">
          {backgrounds.map(
            (_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === bgIndex
                    ? "w-8 bg-green-400"
                    : "w-2 bg-white/40"
                }`}
              />
            )
          )}
        </div>

        {/* SUPPORT BOT */}

        <div className="fixed bottom-5 right-5 z-50">
          <button
            onClick={() =>
              window.open(
                "https://solomon-n8n.duckdns.org/webhook/a7935547-15a5-4742-8ac0-b8fab937d44c/chat",
                "_blank"
              )
            }
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-600 shadow-2xl hover:scale-110 transition duration-300"
          >
            <span className="text-2xl">
              🤖
            </span>

            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PREMIUM CARD
========================= */

function Card({
  title,
  desc,
  onClick,
  highlight = false,
  danger = false,
}) {
  let classes =
    "bg-white/10 hover:bg-white/15 border border-white/15";

  if (highlight) {
    classes =
      "bg-green-500/20 hover:bg-green-500/30 border border-green-400/30";
  }

  if (danger) {
    classes =
      "bg-red-500/20 hover:bg-red-500/30 border border-red-400/30";
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${classes}
        backdrop-blur-2xl
        rounded-3xl
        p-6
        min-h-[145px]
        cursor-pointer
        transition-all
        duration-300
        hover:scale-[1.02]
        hover:shadow-2xl
        flex
        flex-col
        justify-center
      `}
    >
      <h3 className="text-2xl font-bold mb-2">
        {title}
      </h3>

      <p className="text-sm text-gray-200 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}