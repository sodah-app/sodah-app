"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function WelcomePage() {
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);

  const [user, setUser] = useState({
    fullName: "",
  });

  const [bgIndex, setBgIndex] = useState(0);

  const [idleMode, setIdleMode] = useState(false);

  const [currentTime, setCurrentTime] = useState("");

  const idleTimer = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    window.addEventListener(
      "resize",
      checkMobile
    );

    return () =>
      window.removeEventListener(
        "resize",
        checkMobile
      );
  }, []);

  /* =========================
     PREMIUM BACKGROUNDS
  ========================== */

  const backgrounds = [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920&q=100",

    "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?auto=format&fit=crop&w=1920&q=100",
  ];

  /* =========================
     BACKGROUND ROTATION
  ========================== */

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(
        (prev) =>
          (prev + 1) %
          backgrounds.length
      );
    }, 7000);

    return () =>
      clearInterval(interval);
  }, []);

  /* =========================
     CLOCK
  ========================== */

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      const time =
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

      const date =
        now.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

      setCurrentTime(
        `${time} • ${date}`
      );
    };

    updateClock();

    const interval = setInterval(
      updateClock,
      1000
    );

    return () =>
      clearInterval(interval);
  }, []);

  /* =========================
     IDLE MODE
  ========================== */

  useEffect(() => {
    const resetIdleTimer = () => {
      setIdleMode(false);

      clearTimeout(
        idleTimer.current
      );

      idleTimer.current =
        setTimeout(() => {
          setIdleMode(true);
        }, 60000);
    };

    window.addEventListener(
      "mousemove",
      resetIdleTimer
    );

    window.addEventListener(
      "keydown",
      resetIdleTimer
    );

    window.addEventListener(
      "click",
      resetIdleTimer
    );

    resetIdleTimer();

    return () => {
      clearTimeout(
        idleTimer.current
      );

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
     USER + SUBSCRIPTION
  ========================== */

  useEffect(() => {
    const storedUser = JSON.parse(
      localStorage.getItem(
        "user"
      ) || "{}"
    );

    const expiry =
      storedUser.planExpiry;

    if (
      !expiry ||
      storedUser.subscription !==
        "active"
    ) {
      router.push(
        "/subscription"
      );
      return;
    }

    const now = new Date();

    const expiryDate =
      new Date(expiry);

    if (now > expiryDate) {
      alert(
        "Your subscription has expired."
      );

      router.push(
        "/subscription"
      );

      return;
    }

    setUser({
      fullName:
        storedUser.fullName ||
        "",
    });
  }, [router]);

  /* =========================
     ACTIONS
  ========================== */

 const startAutomationSetup = () => {
  if (isMobile) {
    router.push("/mobile/automation");
  } else {
    router.push("/automation");
  }
};

  const showDesktopOnly =
    (pageName) => {
      alert(
        `${pageName} is only available on Desktop or Laptop.`
      );
    };

  const handleLogout = () => {
    localStorage.removeItem(
      "user"
    );

    router.push("/");
  };

  /* =========================
     SCREENSAVER MODE
  ========================== */

  if (idleMode) {
    return (
      <div className="relative w-full h-screen overflow-hidden text-white bg-black">

        {backgrounds.map(
          (bg, index) => (
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
          )
        )}

        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6">

          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
            alt="Sodah.io"
            className="w-36 mb-6"
          />

          <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Sodah.io
          </h1>

          <p className="mt-5 text-xl text-gray-300">
            AI WhatsApp Automation Platform
          </p>

        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">

          <div className="bg-black/40 border border-white/10 backdrop-blur-xl px-8 py-4 rounded-full">

            <p className="text-lg font-semibold">
              {currentTime}
            </p>

          </div>

        </div>

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

      {backgrounds.map(
        (bg, index) => (
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
        )
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-slate-950/80 to-black/90 backdrop-blur-sm" />

     <div className="relative z-20 h-screen overflow-hidden flex flex-col px-4 py-3 pb-20">
        {/* TOP BAR */}

      <div className="flex items-center justify-between mb-4">

          <div className="flex items-center gap-3">

            <button
              className="w-12 h-12 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center text-xl"
            >
              ☰
            </button>

            <img
              src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
              alt="Sodah.io"
              className="w-12 h-12"
            />

            <h1 className="text-3xl font-black">
              Sodah.io
            </h1>

          </div>

          <div
            onClick={() =>
              router.push("/profile")
            }
            className="flex items-center gap-3 bg-white/10 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full cursor-pointer"
          >

            <div>
              <p className="text-xs text-gray-300">
                Welcome back,
              </p>

              <p className="font-semibold">
                {user.fullName ||
                  "User"}
              </p>
            </div>

            <div className="w-11 h-11 rounded-full bg-gradient-to-r from-green-400 to-lime-500 flex items-center justify-center text-black font-bold">
              {user.fullName
                ? user.fullName
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

          </div>

        </div>

       {/* HERO */}

<div className="mb-3">

  <div className="flex justify-between items-start gap-3">

    <div className="flex-1">

      <h2 className="text-[34px] leading-[38px] font-black">

        Welcome to

        <br />

        <span className="text-green-400">
          Sodah
        </span>

        <br />

        Automation🚀

      </h2>

      <p className="text-gray-300 text-[15px] leading-7 mt-3 max-w-[180px]">

        Manage your business, automate conversations and scale faster with AI.

      </p>

      <div className="flex gap-3 mt-5">

        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[100px]">

          <p className="text-green-400 text-xl font-bold">
            10K+
          </p>

          <p className="text-gray-400 text-sm">
            Businesses
          </p>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[100px]">

          <p className="text-yellow-400 text-xl font-bold">
            99.9%
          </p>

          <p className="text-gray-400 text-sm">
            Uptime
          </p>

        </div>

      </div>

    </div>

    <div className="flex-shrink-0">

     <img
  src="https://res.cloudinary.com/djnjhphf5/image/upload/v1781861552/ChatGPT_Image_Jun_19_2026_01_31_18_PM_yuzjrt.png"
  alt="WhatsApp Automation"
  className="w-[210x] mt-2 object-contain"
/>

    </div>

  </div>

</div>

        {/* MOBILE DESIGN */}

       {isMobile ? (

  <div className="flex-1 flex flex-col justify-between">
    <div className="space-y-3">

            {/* CONNECT WHATSAPP */}

            <div
              onClick={startAutomationSetup}
              className="
                relative
                overflow-hidden
                rounded-[20px]
                px-4 py-3
                bg-gradient-to-br
                from-green-500/20
                via-green-400/10
                to-transparent
                border
                border-green-400/30
                backdrop-blur-2xl
                cursor-pointer
                transition-all
                duration-300
                hover:scale-[1.02]
              "
            >

              <div className="flex items-center justify-between">

                <div>

                  <div className="flex items-center gap-3 mb-3">

                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                      alt="WhatsApp"
                      className="w-7 h-7"
                    />

                    <h3 className="text-lg font-bold">
                      Connect WhatsApp
                    </h3>

                  </div>

                  <p className="text-gray-300 leading-relaxed-6">

                    Connect your business number
                    and activate AI automation.

                  </p>

                </div>

                <div className="
                  w-10
                  h-10
                  rounded-full
                  bg-green-500
                  flex
                  items-center
                  justify-center
                  text-black
                  font-black
                  text-xl
                ">
                  →
                </div>

              </div>

            </div>

            {/* DESKTOP */}

            <div
              onClick={() =>
                showDesktopOnly(
                  "Dashboard & Analytics"
                )
              }
              className="
                rounded-[20px]
                px-4 py-3
                bg-white/10
                border
                border-white/10
                backdrop-blur-2xl
                cursor-pointer
              "
            >

              <div className="flex items-center gap-3 mb-3">

                <span className="text-2xl">
                  💻
                </span>

                <h3 className="text-lg font-bold">
                  Explore on Desktop
                </h3>

              </div>

              <p className="text-gray-300 leading-relaxed-6">

                Access Dashboard and Analytics
                on Desktop or Laptop for the
                complete experience.

              </p>

            </div>

            {/* UPGRADE PLAN */}

            <div
              onClick={() =>
                router.push(
                  "/subscription"
                )
              }
              className="
                rounded-[24px]
                p-4
                bg-gradient-to-r
                from-purple-600/30
                via-pink-500/20
                to-purple-600/30
                border
                border-purple-400/30
                backdrop-blur-2xl
                cursor-pointer
              "
            >

              <div className="flex items-center justify-between">

                <div>

                  <h3 className="text-xl font-bold mb-2">

                    Upgrade your plan

                  </h3>

                  <p className="text-gray-300">

                    Unlock premium features,
                    advanced analytics,
                    and priority support.

                  </p>

                </div>

                <div className="
                  px-3
                  py-2
                  rounded-full
                  bg-purple-500
                  font-semibold
                ">
                  View Plans
                </div>

              </div>

            </div>
           
          </div>

          </div>

        ) : (

          <div className="grid grid-cols-3 gap-5">

            <Card
              title="📊 Dashboard"
              desc="View chats, leads and bookings"
              onClick={() =>
                router.push("/dashboard")
              }
            />

            <Card
              title="💬 Connect WhatsApp"
              desc="Connect your number and automate conversations"
              onClick={
                startAutomationSetup
              }
            />

            <Card
              title="💰 Subscription"
              desc="Upgrade your plan and unlock features"
              onClick={() =>
                router.push(
                  "/subscription"
                )
              }
              highlight
            />

            <Card
              title="📈 Analytics"
              desc="Track business growth"
              onClick={() =>
                router.push("/analytics")
              }
            />

            <Card
              title="⚙️ Settings"
              desc="Manage account settings"
              onClick={() =>
                router.push("/settings")
              }
            />

            <Card
              title="🚪 Logout"
              desc="Securely sign out"
              onClick={
                handleLogout
              }
              danger
            />

          </div>

        )}

        {/* INDICATORS */}

        <div className="flex justify-center gap-2 mt-4">
          {backgrounds.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-500 ${
                index === bgIndex
                  ? "w-8 bg-green-400"
                  : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* SUPPORT BOT */}

        <div className="fixed bottom-24 right-5 z-50">
          <button
            onClick={() =>
              window.open(
                "https://solomon-n8n.duckdns.org/webhook/a7935547-15a5-4742-8ac0-b8fab937d44c/chat",
                "_blank"
              )
            }
            className="
              relative
              flex
              items-center
              justify-center
              w-14
              h-14
              rounded-full
              bg-gradient-to-r
              from-blue-500
              via-cyan-500
              to-purple-600
              shadow-2xl
              hover:scale-110
              transition
              duration-300
            "
          >
            <span className="text-2xl">
              🤖
            </span>

            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
          </button>
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}

        {isMobile && (
          <div
            className="
              fixed
              bottom-0
              left-0
              right-0
              h-16
              bg-black/85
              backdrop-blur-2xl
              border-t
              border-white/10
              flex
              items-center
              justify-around
              z-50
            "
          >

            {/* HOME */}

            <button
              onClick={() =>
                router.push("/welcome")
              }
              className="
                flex
                flex-col
                items-center
                text-white
              "
            >
              <span className="text-2xl">
                🏠
              </span>

              <span className="text-[11px] mt-1">
                Home
              </span>
            </button>

            {/* DASHBOARD */}

            <button
              onClick={() =>
                showDesktopOnly(
                  "Dashboard"
                )
              }
              className="
                flex
                flex-col
                items-center
                text-white
              "
            >
              <span className="text-2xl">
                📊
              </span>

              <span className="text-[11px] mt-1">
                Dashboard
              </span>
            </button>

            {/* ANALYTICS */}

            <button
              onClick={() =>
                showDesktopOnly(
                  "Analytics"
                )
              }
              className="
                flex
                flex-col
                items-center
                text-white
              "
            >
              <span className="text-2xl">
                📈
              </span>

              <span className="text-[11px] mt-1">
                Analytics
              </span>
            </button>

            {/* LOGOUT */}

            <button
              onClick={handleLogout}
              className="
                flex
                flex-col
                items-center
                text-red-400
              "
            >
              <span className="text-2xl">
                🚪
              </span>

              <span className="text-[11px] mt-1">
                Logout
              </span>
            </button>

            {/* SETTINGS */}

            <button
              onClick={() =>
                router.push("/settings")
              }
              className="
                flex
                flex-col
                items-center
                text-white
              "
            >
              <span className="text-2xl">
                ⚙️
              </span>

              <span className="text-[11px] mt-1">
                Settings
              </span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

/* =========================
   PREMIUM CARD COMPONENT
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
        min-h-[150px]
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