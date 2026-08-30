"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LOGO_URL =
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png";

const SUPPORT_WHATSAPP = "https://wa.me/971544027954";

const AI_SUPPORT_URL =
  "https://solomon-n8n.duckdns.org/webhook/a7935547-15a5-4742-8ac0-b8fab937d44c/chat";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?q=80&w=1800&auto=format&fit=crop";

const WHATSAPP_IMAGE =
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1781713157/WhatsApp_Image_2026-06-17_at_8.18.20_PM_gyi4wt.jpg";

const SETUP_IMAGE =
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1781711765/WhatsApp_Image_2026-06-17_at_7.54.25_PM_luvnxg.jpg";

const LEAD_IMAGE =
  "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1800&auto=format&fit=crop";

const WHATSAPP_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg";

const INSTAGRAM_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg";

const FACEBOOK_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/c/c2/F_icon.svg";

const TIKTOK_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/a/a9/TikTok_logo.svg";

const SOCIALS = [
  {
    name: "WhatsApp",
    src: WHATSAPP_LOGO,
    href: SUPPORT_WHATSAPP,
  },
  {
    name: "Instagram",
    src: INSTAGRAM_LOGO,
    href: "#contact",
  },
  {
    name: "Facebook",
    src: FACEBOOK_LOGO,
    href: "#contact",
  },
  {
    name: "TikTok",
    src: TIKTOK_LOGO,
    href: "#contact",
  },
];

const CHANNELS = [
  {
    name: "WhatsApp",
    logo: WHATSAPP_LOGO,
    description: "Customer conversations",
    className:
      "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600",
  },
  {
    name: "Instagram",
    logo: INSTAGRAM_LOGO,
    description: "Social conversations",
    className:
      "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500",
  },
  {
    name: "Facebook",
    logo: FACEBOOK_LOGO,
    description: "Messenger conversations",
    className: "bg-gradient-to-r from-blue-500 to-blue-700",
  },
  {
    name: "TikTok",
    logo: TIKTOK_LOGO,
    description: "TikTok conversations",
    className:
      "bg-gradient-to-r from-[#071018] via-[#101820] to-[#17252b]",
  },
];

const CHANNEL_CONNECTION_STEPS = [
  { name: "WhatsApp", logo: WHATSAPP_LOGO, text: "Connect your existing WhatsApp, scan the QR code, and start AI-powered customer conversations." },
  { name: "Instagram", logo: INSTAGRAM_LOGO, text: "Connect your Instagram account through secure authorization and bring customer conversations into Sodah." },
  { name: "Facebook", logo: FACEBOOK_LOGO, text: "Connect Facebook Messenger and manage customer conversations from your Sodah workspace." },
  { name: "TikTok", logo: TIKTOK_LOGO, text: "Connect TikTok securely through TikTok authorization and keep your customer communication connected." },
];

const FEATURES = [
  {
    icon: "✦",
    title: "AI Customer Conversations",
    text: "Respond to common questions, guide customers and keep conversations moving without requiring your team to answer every message manually.",
    tone: "green",
  },
  {
    icon: "◎",
    title: "Lead Capture & Qualification",
    text: "Turn conversations into organized opportunities and give your team clearer visibility into customers who are ready to buy.",
    tone: "blue",
  },
  {
    icon: "◫",
    title: "Bookings & Appointments",
    text: "Keep booking requests, appointments and customer details connected to the conversation.",
    tone: "mint",
  },
  {
    icon: "↻",
    title: "Automated Follow-Up",
    text: "Stay consistent with reminders and follow-ups so interested customers do not get forgotten.",
    tone: "purple",
  },
  {
    icon: "◉",
    title: "WhatsApp Campaign Automation",
    text: "Create WhatsApp campaigns and customer outreach without manually rebuilding the same process every time.",
    tone: "green",
  },
  {
    icon: "文",
    title: "Multi-Language AI",
    text: "Give customers a smoother experience with AI-assisted conversations across different languages.",
    tone: "blue",
  },
  {
    icon: "▦",
    title: "Analytics Dashboard",
    text: "Monitor leads, bookings, follow-ups, conversations and important business activity from one workspace.",
    tone: "cyan",
  },
  {
    icon: "◇",
    title: "Business Visibility",
    text: "Keep customer activity, leads, bookings and campaigns organized in one professional workspace.",
    tone: "mint",
  },
  {
    icon: "⚙",
    title: "Update Your Business Yourself",
    text: "Update business information and automation settings yourself without depending on an agency for every change.",
    tone: "green",
  },
  {
    icon: "↗",
    title: "Easy Self Setup",
    text: "Connect your workflow and configure your business information with a simple guided setup process.",
    tone: "blue",
  },
  {
    icon: "⚡",
    title: "Faster Response",
    text: "Give customers quicker answers and reduce the amount of repetitive communication your team handles manually.",
    tone: "cyan",
  },
  {
    icon: "⌁",
    title: "Connected Channels",
    text: "Bring WhatsApp, Instagram, Facebook and TikTok customer communication into one connected workflow.",
    tone: "purple",
  },
];

const USE_CASES = [
  ["✚", "Clinics & Healthcare"],
  ["✦", "Salons & Spas"],
  ["◇", "Car Dealerships"],
  ["↗", "Car Rental"],
  ["⌂", "Real Estate"],
  ["◉", "Restaurants"],
  ["▣", "Retail"],
  ["✧", "Cleaning Services"],
  ["▰", "Hotels"],
  ["▤", "Education"],
  ["◌", "Fitness"],
  ["⇢", "Delivery Services"],
];

const PERFORMANCE_ITEMS = [
  {
    title: "Conversations",
    value: "24/7",
    text: "Never miss a customer",
    accent: "green",
  },
  {
    title: "Bookings",
    value: "+42%",
    text: "More appointment opportunities",
    accent: "blue",
  },
  {
    title: "Leads",
    value: "3X",
    text: "More qualified opportunities",
    accent: "cyan",
  },
  {
    title: "Follow-Ups",
    value: "AUTO",
    text: "Stay connected",
    accent: "purple",
  },
];

const TRUST_ITEMS = [
  [
    "🔒",
    "Secure workflow",
    "Customer conversations stay organized in one controlled workspace.",
  ],
  [
    "⚡",
    "Faster response",
    "Reduce repetitive manual replies and keep customers moving.",
  ],
  [
    "🎯",
    "Conversion focused",
    "Designed around leads, bookings, follow-up and revenue.",
  ],
  [
    "💰",
    "Built for growth",
    "Professional automation without unnecessary complexity.",
  ],
];

function scrollToSection(id) {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

export default function Home() {
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [activeChannel, setActiveChannel] = useState("WhatsApp");

  useEffect(() => {
    function handleAbout() {
      setShowAbout(true);
    }

    function handleContact() {
      setShowContact(true);
    }

    function handleInstall() {
      setShowInstall(true);
    }

    document.addEventListener("open-about-popup", handleAbout);
    document.addEventListener("open-contact-popup", handleContact);
    document.addEventListener("open-install-popup", handleInstall);

    return () => {
      document.removeEventListener("open-about-popup", handleAbout);
      document.removeEventListener("open-contact-popup", handleContact);
      document.removeEventListener("open-install-popup", handleInstall);
    };
  }, []);

  useEffect(() => {
    if (!showAbout && !showContact && !showInstall && !mobileMenu) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showAbout, showContact, showInstall, mobileMenu]);

  function closeEverything() {
    setShowAbout(false);
    setShowContact(false);
    setShowInstall(false);
    setMobileMenu(false);
  }

  function openAIChat() {
    window.open(AI_SUPPORT_URL, "_blank", "noopener,noreferrer");
  }

  function handleSection(id) {
    setMobileMenu(false);
    scrollToSection(id);
  }

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-[#f2fbf5] text-slate-900">

        {/* =====================================================
            GLOBAL ANIMATIONS + PREMIUM VISUAL SYSTEM
        ====================================================== */}

        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }

          body {
            margin: 0;
            background: #f2fbf5;
          }

          @keyframes sodahFloat {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes sodahFloatSlow {
            0%,
            100% {
              transform: translateY(0) scale(1);
            }

            50% {
              transform: translateY(-8px) scale(1.02);
            }
          }

          @keyframes sodahZoom {
            0%,
            100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.045);
            }
          }

          @keyframes sodahMessageIn {
            0% {
              opacity: 0;
              transform: translateY(18px) scale(0.94);
            }

            70% {
              opacity: 1;
              transform: translateY(-2px) scale(1.01);
            }

            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes sodahTyping {
            0%,
            100% {
              opacity: 0.3;
              transform: translateY(0);
            }

            50% {
              opacity: 1;
              transform: translateY(-2px);
            }
          }

          @keyframes sodahScan {
            0% {
              transform: translateY(-55%);
              opacity: 0;
            }

            15% {
              opacity: 1;
            }

            85% {
              opacity: 1;
            }

            100% {
              transform: translateY(55%);
              opacity: 0;
            }
          }

          @keyframes sodahRing {
            0% {
              transform: scale(0.7);
              opacity: 0.75;
            }

            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }

          @keyframes sodahChart {
            from {
              stroke-dashoffset: 283;
            }

            to {
              stroke-dashoffset: 75;
            }
          }

          @keyframes sodahGlow {
            0%,
            100% {
              box-shadow: 0 0 0 rgba(16, 185, 129, 0);
            }

            50% {
              box-shadow: 0 0 45px rgba(16, 185, 129, 0.2);
            }
          }

          .sodah-float {
            animation: sodahFloat 5s ease-in-out infinite;
          }

          .sodah-float-slow {
            animation: sodahFloatSlow 7s ease-in-out infinite;
          }

          .sodah-zoom {
            animation: sodahZoom 8s ease-in-out infinite;
          }

          .sodah-message {
            animation: sodahMessageIn 0.8s cubic-bezier(0.22, 1, 0.36, 1)
              both;
          }

          .sodah-typing {
            animation: sodahTyping 1.1s ease-in-out infinite;
          }

          .sodah-scan {
            animation: sodahScan 2.8s ease-in-out infinite;
          }

          .sodah-ring {
            animation: sodahRing 2.2s ease-out infinite;
          }

          .sodah-chart {
            animation: sodahChart 1.7s ease-out forwards;
          }

          .sodah-glow {
            animation: sodahGlow 4s ease-in-out infinite;
          }

          .sodah-grid {
            background-image:
              linear-gradient(rgba(16, 185, 129, 0.045) 1px, transparent 1px),
              linear-gradient(
                90deg,
                rgba(16, 185, 129, 0.045) 1px,
                transparent 1px
              );
            background-size: 28px 28px;
          }

          .sodah-chat-wallpaper {
            background-color: #e6f5eb;
            background-image:
              radial-gradient(
                circle at 15% 20%,
                rgba(16, 185, 129, 0.08) 0 2px,
                transparent 3px
              ),
              radial-gradient(
                circle at 80% 30%,
                rgba(15, 118, 110, 0.07) 0 2px,
                transparent 3px
              ),
              radial-gradient(
                circle at 35% 75%,
                rgba(34, 197, 94, 0.055) 0 2px,
                transparent 3px
              ),
              linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.45),
                rgba(209, 250, 229, 0.28)
              );
            background-size: 95px 95px, 125px 125px, 155px 155px, auto;
          }

          .sodah-chat-wallpaper::before {
            content: "";
            position: absolute;
            inset: 0;
            opacity: 0.18;
            background-image:
              repeating-linear-gradient(
                45deg,
                transparent 0,
                transparent 18px,
                rgba(6, 78, 59, 0.035) 19px,
                transparent 20px
              );
            pointer-events: none;
          }

          .sodah-shadow {
            box-shadow:
              0 25px 70px rgba(15, 23, 42, 0.12),
              0 8px 25px rgba(16, 185, 129, 0.08);
          }

          .sodah-deep-shadow {
            box-shadow:
              0 35px 100px rgba(2, 6, 23, 0.3),
              0 10px 30px rgba(16, 185, 129, 0.08);
          }

          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.001ms !important;
              animation-iteration-count: 1 !important;
              scroll-behavior: auto !important;
            }
          }
        `}</style>

        {/* =====================================================
            FIXED NAVIGATION — BLUE BLACK FIRST COLOR
        ====================================================== */}

        <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-700/40 bg-[#071421]/96 shadow-[0_10px_40px_rgba(2,6,23,.2)] backdrop-blur-2xl">
          <div className="mx-auto flex min-h-[74px] max-w-7xl items-center justify-between px-4 sm:px-6">

            <button
              type="button"
              onClick={() => handleSection("home")}
              className="flex items-center gap-3"
            >
              <img
                src={LOGO_URL}
                alt="Sodah.io"
                className="h-10 w-10 rounded-xl object-contain"
              />

              <div className="block">
                <div className="text-lg font-black tracking-tight text-white sm:text-xl">
                  Sodah<span className="text-emerald-400">.io</span>
                </div>

                <div className="text-[8px] font-bold uppercase tracking-[1.6px] text-slate-400 sm:text-[9px] sm:tracking-[2px]">
                  AI Automation Service
                </div>
              </div>
            </button>

            <nav className="hidden items-center gap-1 lg:flex">
              <button
                type="button"
                onClick={() => setShowAbout(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                About Us
              </button>

              <button
                type="button"
                onClick={() => handleSection("features")}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                Features
              </button>

              <button
                type="button"
                onClick={() => handleSection("how-it-works")}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                How It Works
              </button>

              <button
                type="button"
                onClick={() => handleSection("pricing")}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                Pricing
              </button>

              <button
                type="button"
                onClick={() => setShowContact(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                Contact
              </button>
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <a
                href={SUPPORT_WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/10"
              >
                <img
                  src={WHATSAPP_LOGO}
                  alt=""
                  className="h-5 w-5"
                />
                WhatsApp
              </a>

              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_0_30px_rgba(16,185,129,.2)] transition hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-white md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileMenu ? "×" : "☰"}
            </button>
          </div>

          {mobileMenu && (
            <div className="border-t border-white/10 bg-[#071421]/98 p-4 backdrop-blur-2xl md:hidden">
              <div className="mx-auto max-w-7xl space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenu(false);
                    setShowAbout(true);
                  }}
                  className="w-full rounded-xl bg-white/5 p-3 text-left font-bold text-white"
                >
                  About Us
                </button>

                <button
                  type="button"
                  onClick={() => handleSection("features")}
                  className="w-full rounded-xl bg-white/5 p-3 text-left font-bold text-white"
                >
                  Features
                </button>

                <button
                  type="button"
                  onClick={() => handleSection("how-it-works")}
                  className="w-full rounded-xl bg-white/5 p-3 text-left font-bold text-white"
                >
                  How It Works
                </button>

                <button
                  type="button"
                  onClick={() => handleSection("pricing")}
                  className="w-full rounded-xl bg-white/5 p-3 text-left font-bold text-white"
                >
                  Pricing
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenu(false);
                    setShowContact(true);
                  }}
                  className="w-full rounded-xl bg-white/5 p-3 text-left font-bold text-white"
                >
                  Contact
                </button>

                <Link
                  href="/login"
                  className="block rounded-xl border border-white/10 p-3 font-bold text-white"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  className="block rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 p-3 text-center font-black text-white"
                >
                  Start Free Trial
                </Link>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link href="/privacy" className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white">
                    Terms & Conditions
                  </Link>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* =====================================================
            FIRST / PRIMARY HERO LAYER
            AI POWERED MESSAGE FIRST
        ====================================================== */}

        <section
          id="home"
          className="relative overflow-hidden px-5 pb-12 pt-32 sm:px-6 lg:pt-36"
        >
          {/* LIGHT GREEN PRIMARY BACKGROUND */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#dff7e8] via-[#f5fff9] to-[#e8f5ff]" />

          {/* GREEN COLOR LAYERS */}
          <div className="absolute left-[-12%] top-[12%] h-[520px] w-[520px] rounded-full bg-emerald-300/20 blur-[130px]" />

          <div className="absolute right-[-12%] top-[18%] h-[560px] w-[560px] rounded-full bg-green-300/15 blur-[140px]" />

          <div className="absolute bottom-[-15%] left-[35%] h-[420px] w-[420px] rounded-full bg-teal-200/15 blur-[130px]" />

          <div className="relative mx-auto max-w-7xl">

            {/* =================================================
                FIRST CONTENT: AI POWERED CUSTOMER AUTOMATION
            ================================================= */}

            <div className="mx-auto max-w-5xl text-center">

              <div className="sodah-glow mb-7 inline-flex items-center gap-3 rounded-full border border-emerald-400/30 bg-white/75 px-5 py-2.5 text-xs font-black uppercase tracking-[2px] text-emerald-700 shadow-sm backdrop-blur-xl">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                  ✦
                </span>

                AI-powered customer automation
              </div>

              {/* MAIN BOLD HEADLINE */}
              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.055em] text-slate-950 sm:text-6xl md:text-7xl lg:text-[82px]">
                Turn Conversations
                <br />
                Into{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent">
                  Bookings, Leads
                </span>
                <br />
                & Revenue With AI.
              </h1>

              <p className="mx-auto mt-8 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Sodah.io brings WhatsApp, Instagram, Facebook and TikTok
                customer conversations into one intelligent workflow for
                lead capture, bookings, follow-up, campaigns and customer
                support.
              </p>

              {/* BENEFITS */}
              <div className="mx-auto mt-7 flex max-w-5xl flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-bold text-slate-600">
                <span className="rounded-full border border-emerald-200 bg-white/65 px-3 py-2">
                  ✓ No API Setup
                </span>

                <span className="rounded-full border border-emerald-200 bg-white/65 px-3 py-2">
                  ✓ No Facebook Business Account
                </span>

                <span className="rounded-full border border-emerald-200 bg-white/65 px-3 py-2">
                  ✓ Existing WhatsApp
                </span>

                <span className="rounded-full border border-emerald-200 bg-white/65 px-3 py-2">
                  ✓ AI Chats In Any Language
                </span>

                <span className="rounded-full border border-emerald-200 bg-white/65 px-3 py-2">
                  ✓ Update Business Details Yourself
                </span>

                <span className="rounded-full border border-emerald-200 bg-white/65 px-3 py-2">
                  ✓ 7-Day Free Trial
                </span>
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 px-8 py-4 font-black text-white shadow-[0_18px_45px_rgba(16,185,129,.28)] transition hover:-translate-y-1"
                >
                  Start Your 7-Day Free Trial →
                </Link>

                <Link
                  href="/demo"
                  className="rounded-2xl border border-slate-300 bg-white/80 px-8 py-4 font-black text-slate-800 shadow-sm transition hover:-translate-y-1 hover:bg-white"
                >
                  Watch Demo
                </Link>
              </div>
            </div>

            {/* =================================================
              CHANNEL CONNECTION LAYER
          ================================================= */}

          <section className="relative mt-14 overflow-hidden rounded-[34px] border border-emerald-200/80 bg-gradient-to-br from-[#e4f9ec] via-white to-[#e8f5ff] p-5 shadow-[0_25px_70px_rgba(16,185,129,.10)] sm:mt-16 sm:p-8">
            <div className="absolute left-[-8%] top-[-30%] h-72 w-72 rounded-full bg-emerald-300/20 blur-[90px]" />
            <div className="absolute right-[-8%] bottom-[-30%] h-72 w-72 rounded-full bg-cyan-300/15 blur-[90px]" />
            <div className="relative">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-emerald-700 sm:text-xs">One connected platform</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Connect your customer channels to Sodah.io.</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Connect WhatsApp, Instagram, Facebook and TikTok to one AI-powered business automation service.</p>
              </div>

              <div className="relative mx-auto mt-8 max-w-6xl sm:mt-10">
                <div className="relative z-10 mx-auto flex w-fit flex-col items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,.12)] sm:h-24 sm:w-24">
                    <img src={LOGO_URL} alt="Sodah.io" className="h-full w-full object-contain" />
                  </div>
                  <div className="mt-3 text-lg font-black text-slate-950">Sodah<span className="text-emerald-500">.io</span></div>
                  <div className="mt-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-[1.5px] text-emerald-700">AI Automation Service</div>
                </div>

                <div className="pointer-events-none absolute left-1/2 top-[96px] hidden h-12 w-[72%] -translate-x-1/2 sm:block">
                  <div className="absolute left-1/2 top-0 h-6 -translate-x-1/2 border-l-2 border-dashed border-emerald-300" />
                  <div className="absolute left-0 right-0 top-6 border-t-2 border-dashed border-emerald-300" />
                  <div className="absolute left-[12.5%] top-6 h-6 border-l-2 border-dashed border-emerald-300" />
                  <div className="absolute left-[37.5%] top-6 h-6 border-l-2 border-dashed border-emerald-300" />
                  <div className="absolute left-[62.5%] top-6 h-6 border-l-2 border-dashed border-emerald-300" />
                  <div className="absolute left-[87.5%] top-6 h-6 border-l-2 border-dashed border-emerald-300" />
                </div>

                <div className="pointer-events-none absolute left-1/2 top-[128px] h-[calc(100%-128px)] -translate-x-1/2 border-l-2 border-dashed border-emerald-200 sm:hidden" />

                <div className="relative mt-8 grid gap-4 pt-5 sm:mt-12 sm:grid-cols-4 sm:gap-4 sm:pt-8">
                  {CHANNEL_CONNECTION_STEPS.map((channel) => (
                    <div key={channel.name} className="relative z-10 rounded-[24px] border border-white/90 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                          <img src={channel.logo} alt={channel.name} className="h-7 w-7 object-contain" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-950">{channel.name}</h3>
                          <p className="text-[9px] font-bold uppercase tracking-[1px] text-emerald-600">Connected channel</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-slate-500">{channel.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              SECOND HERO LAYER — QR CODE + PHONE
          ================================================= */}

            <div className="relative mx-auto mt-16 max-w-6xl">

              {/* LIGHT GREEN FRAME */}
              <div className="absolute -inset-5 rounded-[42px] bg-gradient-to-r from-emerald-300/20 via-green-200/10 to-teal-300/20 blur-2xl" />

              <div className="relative rounded-[36px] border border-white/90 bg-gradient-to-br from-[#ecfff3] via-white to-[#e6f5ef] p-3 shadow-[0_35px_100px_rgba(15,23,42,.14)]">

                <div className="overflow-hidden rounded-[30px] border border-emerald-100/70 bg-gradient-to-br from-white via-[#f3fff7] to-[#eaf7f0]">

                  <div className="grid items-center gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_1.15fr] lg:p-12">

                    {/* QR EXPLANATION */}
                    <div className="text-center lg:text-left">

                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                        <img
                          src={WHATSAPP_LOGO}
                          alt="WhatsApp"
                          className="h-5 w-5"
                        />

                        CONNECT WHATSAPP
                      </div>

                      <h2 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                        Connect your existing WhatsApp.
                      </h2>

                      <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                        Scan the QR code and connect your WhatsApp to
                        Sodah.io. Your AI automation can then begin handling
                        customer conversations.
                      </p>

                      <div className="mt-6 space-y-3 text-left">
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 font-black text-emerald-600">
                            1
                          </span>

                          <span className="text-sm font-bold text-slate-700">
                            Open WhatsApp on your phone.
                          </span>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 font-black text-green-600">
                            2
                          </span>

                          <span className="text-sm font-bold text-slate-700">
                            Scan the QR code displayed by Sodah.io.
                          </span>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 font-black text-teal-600">
                            3
                          </span>

                          <span className="text-sm font-bold text-slate-700">
                            Start your AI customer automation.
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-700">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        No need to change your WhatsApp number.
                      </div>
                    </div>

                    {/* LAPTOP + QR */}
                    <div className="relative min-h-[430px]">

                      <div className="sodah-float-slow absolute inset-x-0 top-0 mx-auto max-w-[600px]">

                        <div className="relative rounded-[28px] border border-slate-300 bg-slate-950 p-3 shadow-[0_30px_80px_rgba(15,23,42,.28)]">

                          <div className="overflow-hidden rounded-[21px] bg-[#102032]">

                            <div className="flex h-9 items-center gap-2 border-b border-white/10 px-4">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />

                              <span className="ml-3 text-[9px] font-bold text-slate-400">
                                app.sodah.io / connect-whatsapp
                              </span>
                            </div>

                            <div className="relative flex min-h-[350px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#f5fff8] via-white to-[#e7f6ed] p-8">

                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(34,197,94,.1),transparent_35%)]" />

                              <div className="relative z-10 text-center">

                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_12px_30px_rgba(16,185,129,.3)]">
                                  <img
                                    src={WHATSAPP_LOGO}
                                    alt="WhatsApp"
                                    className="h-7 w-7 brightness-0 invert"
                                  />
                                </div>

                                <h3 className="mt-5 text-2xl font-black text-slate-900">
                                  Connect Your WhatsApp
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                  Scan QR Code to connect
                                </p>

                                <div className="relative mx-auto mt-5 flex h-48 w-48 items-center justify-center rounded-2xl border-8 border-white bg-white p-3 shadow-[0_15px_45px_rgba(15,23,42,.16)]">

                                  <div
                                    className="h-full w-full rounded-lg"
                                    style={{
                                      backgroundImage:
                                        "repeating-conic-gradient(#071421 0% 25%, white 0% 50%)",
                                      backgroundSize: "14px 14px",
                                    }}
                                  />

                                  <div className="sodah-scan absolute left-3 right-3 h-1 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,.8)]" />

                                  <div className="absolute left-0 top-0 h-7 w-7 border-l-4 border-t-4 border-emerald-500" />
                                  <div className="absolute right-0 top-0 h-7 w-7 border-r-4 border-t-4 border-emerald-500" />
                                  <div className="absolute bottom-0 left-0 h-7 w-7 border-b-4 border-l-4 border-emerald-500" />
                                  <div className="absolute bottom-0 right-0 h-7 w-7 border-b-4 border-r-4 border-emerald-500" />
                                </div>

                                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  WhatsApp ready to connect
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PHONE SCANNING */}
                        <div className="sodah-float absolute -bottom-12 -right-3 w-[145px] sm:-right-8 sm:w-[175px]">
                          <div className="rounded-[30px] border-[6px] border-slate-800 bg-slate-950 p-2 shadow-[0_30px_70px_rgba(2,6,23,.3)]">

                            <div className="relative overflow-hidden rounded-[22px] bg-[#dff3e6]">

                              <div className="flex items-center gap-2 bg-emerald-600 px-3 py-3 text-white">
                                <img
                                  src={WHATSAPP_LOGO}
                                  alt="WhatsApp"
                                  className="h-5 w-5 brightness-0 invert"
                                />

                                <span className="text-[10px] font-black">
                                  WhatsApp
                                </span>
                              </div>

                              <div className="relative flex h-[250px] items-center justify-center p-4">

                                <div className="sodah-ring absolute h-32 w-32 rounded-full border border-emerald-400/50" />

                                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-xl">
                                  <div
                                    className="h-16 w-16 rounded-md"
                                    style={{
                                      backgroundImage:
                                        "repeating-conic-gradient(#071421 0% 25%, white 0% 50%)",
                                      backgroundSize: "8px 8px",
                                    }}
                                  />
                                </div>

                                <div className="absolute bottom-5 rounded-full bg-emerald-600 px-3 py-1.5 text-[8px] font-black text-white shadow-lg">
                                  SCANNING...
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                THIRD HERO LAYER — GREEN IMAGE STRIP
            ================================================= */}

            <div className="mt-12">
              <div className="rounded-[34px] border border-emerald-200/80 bg-gradient-to-r from-emerald-100 via-white to-green-50 p-2 shadow-[0_25px_70px_rgba(16,185,129,.1)]">

                <div className="relative overflow-hidden rounded-[28px]">

                  <img
                    src={HERO_IMAGE}
                    alt="Sodah.io business automation"
                    className="sodah-zoom h-[260px] w-full object-cover sm:h-[340px]"
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/55 via-emerald-900/10 to-green-950/35" />

                  <div className="absolute bottom-5 left-5 right-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                    <div className="rounded-2xl border border-white/20 bg-slate-950/65 px-5 py-4 text-white backdrop-blur-xl">
                      <p className="text-xs font-black uppercase tracking-[2px] text-emerald-300">
                        One connected workspace
                      </p>

                      <p className="mt-1 text-lg font-black sm:text-xl">
                        Conversations → Leads → Bookings → Revenue
                      </p>
                    </div>

                    <div className="rounded-full border border-emerald-300/30 bg-emerald-500/85 px-4 py-2 text-xs font-black text-white shadow-lg backdrop-blur">
                      AI AUTOMATION ACTIVE
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =====================================================
            CHANNEL CONVERSATION LAYER
        ====================================================== */}

        <section className="relative overflow-hidden border-y border-emerald-200/70 bg-gradient-to-br from-[#d9f5e5] via-[#f7fffa] to-[#e0f1f8] px-5 py-12 sm:px-6">

          <div className="absolute right-[-10%] top-[-20%] h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">

            <div className="mb-7 text-center">
              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-700">
                Connected conversations
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                Every customer channel. One intelligent workflow.
              </h2>
            </div>

            <div className="sodah-shadow overflow-hidden rounded-[30px] border border-white/90 bg-white/80 backdrop-blur-xl">

              {/* CHANNEL BAR */}
              <div className="flex overflow-x-auto border-b border-slate-200/80 bg-white/90">

                {CHANNELS.map((channel) => {
                  const active = activeChannel === channel.name;

                  return (
                    <button
                      type="button"
                      key={channel.name}
                      onClick={() => setActiveChannel(channel.name)}
                      className={`flex min-w-[180px] flex-1 items-center justify-center gap-3 border-r border-white/30 px-5 py-4 transition last:border-r-0 ${
                        active
                          ? `${channel.className} text-white`
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <img
                        src={channel.logo}
                        alt=""
                        className={`h-7 w-7 object-contain ${
                          channel.name === "WhatsApp" && active
                            ? "brightness-0 invert"
                            : ""
                        }`}
                      />

                      <div className="text-left">
                        <div className="text-sm font-black">
                          {channel.name}
                        </div>

                        <div
                          className={`text-[9px] ${
                            active ? "text-white/75" : "text-slate-400"
                          }`}
                        >
                          {channel.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* CHAT */}
              <div className="sodah-chat-wallpaper relative overflow-hidden">

                <div className="relative mx-auto max-w-4xl p-4 sm:p-8">

                  <div className="overflow-hidden rounded-[26px] border border-white/90 bg-white/80 shadow-[0_25px_70px_rgba(15,23,42,.12)] backdrop-blur-xl">

                    <div className="flex items-center justify-between bg-gradient-to-r from-[#075e54] via-emerald-600 to-green-600 px-5 py-4 text-white">

                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                          <img
                            src={
                              activeChannel === "WhatsApp"
                                ? WHATSAPP_LOGO
                                : activeChannel === "Instagram"
                                ? INSTAGRAM_LOGO
                                : activeChannel === "Facebook"
                                ? FACEBOOK_LOGO
                                : TIKTOK_LOGO
                            }
                            alt=""
                            className={`h-6 w-6 object-contain ${
                              activeChannel === "WhatsApp"
                                ? "brightness-0 invert"
                                : ""
                            }`}
                          />
                        </div>

                        <div>
                          <p className="text-sm font-black">
                            {activeChannel} Business
                          </p>

                          <p className="text-[10px] text-emerald-100">
                            online • AI assistant active
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black">
                        LIVE
                      </span>
                    </div>

                    <div className="space-y-4 p-5 sm:p-8">

                      <div
                        className="sodah-message mr-auto max-w-[88%] sm:max-w-[64%]"
                        style={{ animationDelay: "0.15s" }}
                      >
                        <div className="rounded-2xl rounded-tl-md border border-white/80 bg-white px-4 py-3 shadow-sm">
                          <div className="mb-1 text-[9px] font-black text-emerald-700">
                            CUSTOMER
                          </div>

                          <p className="text-sm leading-6 text-slate-700">
                            Hi! I would like to book an appointment for
                            tomorrow.
                          </p>

                          <div className="mt-1 text-right text-[9px] text-slate-400">
                            2:41 PM
                          </div>
                        </div>
                      </div>

                      <div
                        className="sodah-message ml-auto max-w-[90%] sm:max-w-[68%]"
                        style={{ animationDelay: "0.45s" }}
                      >
                        <div className="rounded-2xl rounded-tr-md bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-4 py-3 text-white shadow-lg">
                          <div className="mb-1 flex items-center gap-2 text-[9px] font-black text-emerald-100">
                            AI ASSISTANT
                            <span className="rounded-full bg-white/15 px-1.5 py-0.5">
                              AI
                            </span>
                          </div>

                          <p className="text-sm leading-6">
                            Absolutely, Sarah. I can help you with that.
                            What time would work best for you?
                          </p>

                          <div className="mt-1 text-right text-[9px] text-emerald-100">
                            2:42 PM ✓✓
                          </div>
                        </div>
                      </div>

                      <div
                        className="sodah-message mr-auto max-w-[80%] sm:max-w-[55%]"
                        style={{ animationDelay: "0.75s" }}
                      >
                        <div className="rounded-2xl rounded-tl-md border border-white/80 bg-white px-4 py-3 shadow-sm">
                          <div className="mb-1 text-[9px] font-black text-slate-400">
                            SARAH
                          </div>

                          <p className="text-sm leading-6 text-slate-700">
                            Around 3:00 PM would be perfect.
                          </p>

                          <div className="mt-1 text-right text-[9px] text-slate-400">
                            2:43 PM
                          </div>
                        </div>
                      </div>

                      <div
                        className="sodah-message ml-auto max-w-[90%] sm:max-w-[68%]"
                        style={{ animationDelay: "1.05s" }}
                      >
                        <div className="rounded-2xl rounded-tr-md bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-3 text-white shadow-lg">
                          <div className="mb-1 text-[9px] font-black text-emerald-100">
                            AI ASSISTANT
                          </div>

                          <p className="text-sm leading-6">
                            3:00 PM is available. I can reserve that
                            appointment for you now.
                          </p>

                          <div className="mt-1 text-right text-[9px] text-emerald-100">
                            2:43 PM ✓✓
                          </div>
                        </div>
                      </div>

                      <div
                        className="sodah-message mx-auto max-w-sm"
                        style={{ animationDelay: "1.45s" }}
                      >
                        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-100 p-4 text-center shadow-[0_10px_30px_rgba(16,185,129,.12)]">

                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl text-white">
                            ✓
                          </div>

                          <p className="mt-2 text-sm font-black text-emerald-800">
                            Appointment Confirmed
                          </p>

                          <p className="mt-1 text-xs text-emerald-700">
                            Tomorrow • 3:00 PM
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="flex gap-1 rounded-full bg-white/90 px-3 py-2 shadow-sm">
                          <span className="sodah-typing h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span
                            className="sodah-typing h-1.5 w-1.5 rounded-full bg-emerald-500"
                            style={{ animationDelay: "0.15s" }}
                          />
                          <span
                            className="sodah-typing h-1.5 w-1.5 rounded-full bg-emerald-500"
                            style={{ animationDelay: "0.3s" }}
                          />
                        </span>

                        AI is ready for the next customer
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            PERFORMANCE LAYER
        ====================================================== */}

        <section className="relative overflow-hidden bg-gradient-to-r from-[#071421] via-[#0b2030] to-[#071421] px-5 py-10 text-white sm:px-6">

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(16,185,129,.13),transparent_30%),radial-gradient(circle_at_80%_50%,rgba(37,99,235,.12),transparent_30%)]" />

          <div className="relative mx-auto grid max-w-7xl gap-px overflow-hidden rounded-[28px] border border-white/10 bg-white/10 md:grid-cols-4">

            {PERFORMANCE_ITEMS.map((item) => (
              <PerformanceCard
                key={item.title}
                title={item.title}
                value={item.value}
                text={item.text}
                accent={item.accent}
              />
            ))}
          </div>
        </section>

        {/* =====================================================
            BUSINESS OVERVIEW
        ====================================================== */}

        <section className="relative overflow-hidden bg-gradient-to-br from-[#071421] via-[#0b2534] to-[#071421] px-5 py-24 text-white sm:px-6">

          <div className="sodah-grid absolute inset-0 opacity-50" />

          <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />

          <div className="absolute right-[-10%] bottom-[-10%] h-96 w-96 rounded-full bg-blue-500/10 blur-[110px]" />

          <div className="relative mx-auto max-w-7xl">

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

              <div>
                <p className="text-xs font-black uppercase tracking-[3px] text-emerald-400">
                  Business Overview
                </p>

                <h2 className="mt-2 text-4xl font-black sm:text-5xl">
                  All your important metrics in one place.
                </h2>

                <p className="mt-3 text-slate-400">
                  See what is happening across your customer workflow.
                </p>
              </div>

              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300">
                LIVE AUTOMATION
              </div>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_380px]">

              <div className="grid gap-4 sm:grid-cols-2">

                <DarkMetric
                  label="New Leads"
                  value="248"
                  change="+18.5%"
                  color="green"
                />

                <DarkMetric
                  label="Bookings"
                  value="162"
                  change="+12.7%"
                  color="blue"
                />

                <DarkMetric
                  label="Follow-Ups"
                  value="312"
                  change="+9.3%"
                  color="cyan"
                />

                <DarkMetric
                  label="Conversion Rate"
                  value="68.4%"
                  change="+15.2%"
                  color="purple"
                />

                <div className="sodah-deep-shadow rounded-[26px] border border-white/10 bg-white/[0.045] p-6 sm:col-span-2">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[2px] text-slate-500">
                        Customer activity
                      </p>

                      <h3 className="mt-1 text-xl font-black">
                        Weekly workflow
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-300">
                      +24.8%
                    </span>
                  </div>

                  <div className="mt-8 flex h-36 items-end gap-2">
                    {[35, 48, 42, 62, 55, 76, 68, 88, 72, 96, 82, 100].map(
                      (height, index) => (
                        <div
                          key={`${height}-${index}`}
                          className="group relative flex-1"
                        >
                          <div
                            className="rounded-t-lg bg-gradient-to-t from-emerald-600 via-green-400 to-cyan-300 transition duration-500 group-hover:from-emerald-400 group-hover:to-white"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="sodah-deep-shadow rounded-[28px] border border-white/10 bg-white/[0.045] p-7">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[2px] text-slate-500">
                      Analytics
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      Performance Overview
                    </h3>
                  </div>

                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,.8)]" />
                </div>

                <div className="relative mx-auto mt-8 h-56 w-56">

                  <svg
                    viewBox="0 0 120 120"
                    className="h-full w-full -rotate-90"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke="rgba(255,255,255,.06)"
                      strokeWidth="12"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeDasharray="283"
                      strokeDashoffset="75"
                      strokeLinecap="round"
                      className="sodah-chart"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="35"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray="220"
                      strokeDashoffset="75"
                      strokeLinecap="round"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="25"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="7"
                      strokeDasharray="157"
                      strokeDashoffset="62"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black">84%</span>

                    <span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500">
                      Performance
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <LegendItem color="bg-emerald-400" text="Conversations" />
                  <LegendItem color="bg-blue-400" text="Bookings" />
                  <LegendItem color="bg-cyan-400" text="Leads" />
                  <LegendItem color="bg-purple-400" text="Follow-Ups" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            LIGHT GREEN TRUST LAYER
        ====================================================== */}

        <section className="border-y border-emerald-100 bg-gradient-to-r from-[#dff8e8] via-white to-[#e9f6ff] px-5 py-8 sm:px-6">

          <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {TRUST_ITEMS.map(([icon, title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/90 bg-white/75 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex gap-3">

                  <span className="text-xl">
                    {icon}
                  </span>

                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            FEATURES
        ====================================================== */}

        <section
          id="features"
          className="relative overflow-hidden bg-gradient-to-br from-[#f4fff8] via-white to-[#edf7ff] px-5 py-24 sm:px-6"
        >

          <div className="absolute left-[-10%] top-[20%] h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl" />

          <div className="absolute right-[-10%] bottom-[10%] h-80 w-80 rounded-full bg-green-200/20 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">

            <div className="mx-auto max-w-3xl text-center">

              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Powerful Features
              </p>

              <h2 className="mt-3 text-4xl font-black text-slate-950 sm:text-6xl">
                Powerful Features for Your Business
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                From the first message to the next booking, Sodah.io gives
                your business a connected customer workflow.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {FEATURES.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  text={feature.text}
                  tone={feature.tone}
                />
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            HOW IT WORKS
        ====================================================== */}

        <section
          id="how-it-works"
          className="border-y border-emerald-100 bg-gradient-to-br from-[#dff7e8] via-[#f9fffb] to-[#e8f5ff] px-5 py-24 sm:px-6"
        >

          <div className="mx-auto max-w-7xl">

            <div className="mx-auto max-w-3xl text-center">

              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Simple setup
              </p>

              <h2 className="mt-3 text-4xl font-black text-slate-950 sm:text-6xl">
                Get Started in 4 Simple Steps
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                You can set up your business yourself without depending on an
                agency for every update.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-4">

              <StepCard
                number="01"
                icon="⌕"
                title="Search sodah.io"
                text="Open your browser and search for sodah.io."
              />

              <StepCard
                number="02"
                icon="✚"
                title="Sign Up"
                text="Create your account in seconds."
              />

              <StepCard
                number="03"
                icon="⚙"
                title="Fill Business Details"
                text="Add your business information and automation settings."
              />

              <StepCard
                number="04"
                icon="▦"
                title="Scan QR Code"
                text="Use your WhatsApp to scan the QR code."
              />
            </div>

            <div className="mx-auto mt-8 max-w-3xl rounded-[28px] bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 p-7 text-center text-white shadow-[0_20px_50px_rgba(16,185,129,.2)]">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                ✓
              </div>

              <h3 className="mt-4 text-2xl font-black">
                Automation Starts
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-50">
                Your AI is live and ready to chat with customers.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            WHATSAPP AUTOMATION
        ====================================================== */}

        <section
          id="campaigns"
          className="relative overflow-hidden bg-gradient-to-br from-[#e0fae9] via-white to-[#eaf6ff] px-5 py-24 sm:px-6"
        >

          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">

            <div>

              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                WhatsApp Automation
              </p>

              <h2 className="mt-3 text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
                Keep WhatsApp working for your business.
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Manage customer conversations, reminders, follow-ups,
                booking requests and planned outreach from one workflow.
              </p>

              <div className="mt-8 space-y-3">

                <Benefit text="Organize customer conversations." />
                <Benefit text="Capture leads from incoming messages." />
                <Benefit text="Automate follow-up and reminders." />
                <Benefit text="Support booking and appointment workflows." />
                <Benefit text="Create WhatsApp campaigns." />
                <Benefit text="Update business details yourself." />
              </div>

              <div className="mt-9 flex flex-wrap gap-3">

                <Link
                  href="/signup"
                  className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-7 py-4 font-black text-white shadow-lg transition hover:-translate-y-1"
                >
                  Start Automation
                </Link>

                <a
                  href={SUPPORT_WHATSAPP}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-7 py-4 font-bold text-slate-800 transition hover:bg-emerald-50"
                >
                  <img
                    src={WHATSAPP_LOGO}
                    alt=""
                    className="h-5 w-5"
                  />

                  Talk to Support
                </a>
              </div>
            </div>

            <div className="relative">

              <div className="absolute -inset-6 rounded-[40px] bg-emerald-400/15 blur-3xl" />

              <div className="relative overflow-hidden rounded-[32px] border border-white bg-white p-3 shadow-[0_25px_70px_rgba(16,185,129,.14)]">

                <div className="overflow-hidden rounded-[24px]">

                  <img
                    src={WHATSAPP_IMAGE}
                    alt="WhatsApp connection workflow"
                    className="sodah-zoom w-full rounded-[24px] object-cover"
                    loading="lazy"
                  />

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            BUSINESS SETUP
        ====================================================== */}

        <section className="border-y border-slate-200 bg-gradient-to-br from-[#071421] via-[#0d2533] to-[#071421] px-5 py-24 text-white sm:px-6">

          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">

            <div className="order-2 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-2 lg:order-1">

              <div className="overflow-hidden rounded-[26px]">

                <img
                  src={SETUP_IMAGE}
                  alt="Sodah business setup"
                  className="sodah-zoom h-full w-full object-cover"
                  loading="lazy"
                />

              </div>
            </div>

            <div className="order-1 lg:order-2">

              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-400">
                Flexible automation
              </p>

              <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                Build a workflow that fits your business.
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-400">
                Configure customer communication around the way your
                business actually works instead of forcing your team into
                a complicated process.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">

                <MiniFeature icon="💬" text="Customer conversations" />
                <MiniFeature icon="🎯" text="Lead management" />
                <MiniFeature icon="📅" text="Booking workflows" />
                <MiniFeature icon="🔔" text="Reminders" />
                <MiniFeature icon="📢" text="WhatsApp campaigns" />
                <MiniFeature icon="🤖" text="AI assistance" />

              </div>

              <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">

                <p className="font-black text-emerald-300">
                  No agency required for every update.
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Update your business information and workflow settings
                  yourself whenever your business changes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            LEAD CONVERSION
        ====================================================== */}

        <section className="bg-gradient-to-r from-[#e8faee] via-white to-[#edf7ff] px-5 py-24 sm:px-6">

          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">

            <div>

              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Lead conversion
              </p>

              <h2 className="mt-3 text-4xl font-black text-slate-950 sm:text-6xl">
                Make every conversation easier to act on.
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                A good customer conversation should not disappear into a
                busy inbox. Sodah.io helps move customer activity toward
                the next useful action.
              </p>

              <div className="mt-9 grid gap-4 sm:grid-cols-2">

                <ConversionCard
                  icon="⚡"
                  title="Instant Response"
                  text="Keep customers moving while interest is high."
                />

                <ConversionCard
                  icon="🎯"
                  title="Lead Focus"
                  text="Know which conversations deserve attention."
                />

                <ConversionCard
                  icon="📅"
                  title="Booking Flow"
                  text="Move appointment requests into an organized workflow."
                />

                <ConversionCard
                  icon="📈"
                  title="Growth"
                  text="Build repeatable customer processes that can scale."
                />
              </div>
            </div>

            <div className="sodah-shadow overflow-hidden rounded-[32px] border border-white bg-white p-2">

              <div className="overflow-hidden rounded-[26px]">

                <img
                  src={LEAD_IMAGE}
                  alt="Lead conversion and business workflow"
                  className="sodah-zoom min-h-[420px] w-full object-cover"
                  loading="lazy"
                />

              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            INDUSTRIES
        ====================================================== */}

        <section className="border-y border-emerald-100 bg-gradient-to-br from-[#dff7e8] via-white to-[#eaf5ff] px-5 py-24 sm:px-6">

          <div className="mx-auto max-w-7xl">

            <div className="mx-auto max-w-3xl text-center">

              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Built for Every Industry
              </p>

              <h2 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">
                One automation platform. Many business workflows.
              </h2>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

              {USE_CASES.map(([icon, name]) => (
                <div
                  key={name}
                  className="group rounded-2xl border border-white/90 bg-white/75 p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
                >
                  <span className="text-2xl text-emerald-600">
                    {icon}
                  </span>

                  <h3 className="mt-3 font-black text-slate-900">
                    {name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            PRICING
        ====================================================== */}

        <section
          id="pricing"
          className="border-y border-emerald-100 bg-gradient-to-br from-[#e1f8e9] via-white to-[#e9f5ff] px-5 py-24 sm:px-6"
        >

          <div className="mx-auto max-w-5xl text-center">

            <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
              Start without complexity
            </p>

            <h2 className="mt-3 text-4xl font-black text-slate-950 sm:text-6xl">
              Start your 7-day free trial.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Explore the customer automation workflow, connect your business
              and see how Sodah.io fits into your operation.
            </p>

            <div className="mx-auto mt-10 max-w-md rounded-[30px] border border-emerald-200 bg-white p-8 shadow-[0_25px_70px_rgba(16,185,129,.12)]">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600">
                <img
                  src={WHATSAPP_LOGO}
                  alt="WhatsApp"
                  className="h-8 w-8 brightness-0 invert"
                />
              </div>

              <h3 className="mt-5 text-2xl font-black text-slate-950">
                7-Day Free Trial
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start exploring the platform and build your customer workflow.
              </p>

              <div className="mt-6 space-y-3 text-left">

                <Benefit text="WhatsApp automation" />
                <Benefit text="AI customer conversations" />
                <Benefit text="Lead capture" />
                <Benefit text="Booking workflows" />
                <Benefit text="Campaign automation" />

              </div>

              <Link
                href="/signup"
                className="mt-7 block rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 font-black text-white shadow-lg transition hover:-translate-y-1"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ====================================================== */}

        <section
          id="contact"
          className="relative overflow-hidden px-5 py-28 sm:px-6"
        >

          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700" />

          <div className="absolute left-[-10%] top-[-30%] h-96 w-96 rounded-full bg-white/15 blur-[100px]" />

          <div className="absolute right-[-10%] bottom-[-30%] h-96 w-96 rounded-full bg-cyan-300/15 blur-[100px]" />

          <div className="relative mx-auto max-w-5xl text-center text-white">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">

              <img
                src={WHATSAPP_LOGO}
                alt="WhatsApp"
                className="h-10 w-10 brightness-0 invert"
              />

            </div>

            <p className="mt-8 text-xs font-black uppercase tracking-[4px] text-emerald-100">
              Ready when you are
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">
              Ready to Grow Your Business 24/7?
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-emerald-50">
              Search for sodah.io, sign up, and start automating today!
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

              <Link
                href="/signup"
                className="rounded-2xl bg-white px-8 py-4 font-black text-emerald-700 shadow-[0_20px_50px_rgba(2,6,23,.2)] transition hover:-translate-y-1"
              >
                Start Free Trial Now →
              </Link>

              <button
                type="button"
                onClick={openAIChat}
                className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 font-black text-white backdrop-blur-xl transition hover:bg-white/20"
              >
                Talk to AI Support
              </button>

            </div>

            <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">

              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-100">
                Human support
              </p>

              <p className="mt-3 text-sm leading-6 text-emerald-50">
                Need help getting started? Contact Sodah.io support directly
                through WhatsApp.
              </p>

              <a
                href={SUPPORT_WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-emerald-700 transition hover:-translate-y-1"
              >
                <img
                  src={WHATSAPP_LOGO}
                  alt=""
                  className="h-5 w-5"
                />

                WhatsApp Support
              </a>
            </div>
          </div>
        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <footer className="border-t border-white/10 bg-[#06121e] px-5 py-10 text-white sm:px-6">

          <div className="mx-auto max-w-7xl">

            <div className="grid gap-10 md:grid-cols-4">

              <div className="md:col-span-2">

                <div className="flex items-center gap-3">

                  <img
                    src={LOGO_URL}
                    alt="Sodah.io"
                    className="h-10 w-10 rounded-xl object-contain"
                  />

                  <div className="text-xl font-black">
                    Sodah<span className="text-emerald-400">.io</span>
                  </div>
                </div>

                <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                  AI-powered business automation for customer conversations,
                  WhatsApp, Instagram, Facebook, TikTok, leads, bookings,
                  follow-up and growth.
                </p>
              </div>

              <div>

                <h3 className="font-black text-white">
                  Navigation
                </h3>

                <div className="mt-4 space-y-3 text-sm text-slate-400">

                  <button
                    type="button"
                    onClick={() => setShowAbout(true)}
                    className="block transition hover:text-emerald-300"
                  >
                    About Us
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSection("features")}
                    className="block transition hover:text-emerald-300"
                  >
                    Features
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSection("how-it-works")}
                    className="block transition hover:text-emerald-300"
                  >
                    How It Works
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowContact(true)}
                    className="block transition hover:text-emerald-300"
                  >
                    Contact
                  </button>

                </div>
              </div>

              <div>

                <h3 className="font-black text-white">
                  Get Started
                </h3>

                <div className="mt-4 space-y-3 text-sm">

                  <Link
                    href="/login"
                    className="block text-slate-400 transition hover:text-emerald-300"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    className="block text-slate-400 transition hover:text-emerald-300"
                  >
                    Free Trial
                  </Link>

                  <a
                    href={SUPPORT_WHATSAPP}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-slate-400 transition hover:text-emerald-300"
                  >
                    <img
                      src={WHATSAPP_LOGO}
                      alt=""
                      className="h-4 w-4"
                    />

                    WhatsApp Support
                  </a>

                  <Link href="/privacy" className="block text-slate-400 transition hover:text-emerald-300">
                    Privacy Policy
                  </Link>

                  <Link href="/terms" className="block text-slate-400 transition hover:text-emerald-300">
                    Terms & Conditions
                  </Link>

                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} Sodah.io. All rights reserved.
              </p>

              <div className="flex items-center gap-3">

                {SOCIALS.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target={
                      social.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      social.href.startsWith("http")
                        ? "noreferrer"
                        : undefined
                    }
                    aria-label={social.name}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
                  >
                    <img
                      src={social.src}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  </a>
                ))}

              </div>
            </div>
          </div>
        </footer>

        {/* =====================================================
            FLOATING AI
        ====================================================== */}

        <button
          type="button"
          onClick={openAIChat}
          aria-label="Open AI support"
          className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-2xl text-white shadow-[0_0_45px_rgba(16,185,129,.3)] transition hover:scale-110 sm:bottom-7 sm:right-7"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
          <span className="relative">
            🤖
          </span>
        </button>

        {/* =====================================================
            ABOUT MODAL
        ====================================================== */}

        {showAbout && (
          <Modal onClose={closeEverything}>

            <ModalHeader
              eyebrow="ABOUT SODAH.IO"
              title="Technology that works for your business."
              onClose={closeEverything}
            />

            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">

              <p>
                <strong className="text-white">
                  Sodah.io
                </strong>{" "}
                is an AI-powered business automation platform designed around
                customer conversations, lead capture, bookings and follow-up.
              </p>

              <p>
                Instead of spreading customer activity across disconnected
                tools, Sodah.io brings important customer workflows into one
                professional workspace.
              </p>

              <p>
                The platform supports channels such as WhatsApp, Instagram,
                Facebook and TikTok together with AI assistance and business
                automation.
              </p>

              <p>
                Businesses can update their own business details and workflow
                settings without needing an agency for every small change.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-5">

              <p className="font-black text-emerald-300">
                Built around one idea
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Make customer automation powerful enough to help a business
                grow while keeping the experience simple enough to use every
                day.
              </p>
            </div>
          </Modal>
        )}

        {/* =====================================================
            CONTACT MODAL
        ====================================================== */}

        {showContact && (
          <Modal onClose={closeEverything}>

            <ModalHeader
              eyebrow="CONTACT & SUPPORT"
              title="We're here when you need us."
              onClose={closeEverything}
            />

            <div className="mt-7 grid gap-4 sm:grid-cols-2">

              <a
                href={SUPPORT_WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-6 transition hover:-translate-y-1 hover:bg-emerald-400/[0.09]"
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10">

                  <img
                    src={WHATSAPP_LOGO}
                    alt="WhatsApp"
                    className="h-7 w-7"
                  />

                </div>

                <h3 className="mt-5 font-black">
                  WhatsApp Support
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Chat directly with Sodah.io support.
                </p>

                <span className="mt-4 inline-block text-sm font-black text-emerald-600">
                  Open WhatsApp →
                </span>

              </a>

              <button
                type="button"
                onClick={() => {
                  closeEverything();
                  openAIChat();
                }}
                className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-6 text-left transition hover:-translate-y-1 hover:bg-cyan-400/[0.09]"
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl">
                  🤖
                </div>

                <h3 className="mt-5 font-black">
                  AI Support
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Open the Sodah AI support assistant.
                </p>

                <span className="mt-4 inline-block text-sm font-black text-cyan-600">
                  Start AI Chat →
                </span>

              </button>
            </div>
          </Modal>
        )}

        {/* =====================================================
            INSTALL MODAL
        ====================================================== */}

        {showInstall && (
          <Modal onClose={closeEverything}>

            <ModalHeader
              eyebrow="SODAH.IO"
              title="Get started with Sodah.io."
              onClose={closeEverything}
            />

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Start with the web application and connect your customer
              workflow from your Sodah.io workspace.
            </p>

            <div className="mt-7 grid gap-3">

              <Link
                href="/signup"
                onClick={closeEverything}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 to-green-600 px-6 py-4 text-center font-black text-white"
              >
                Create Your Account →
              </Link>

              <Link
                href="/login"
                onClick={closeEverything}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center font-bold text-white"
              >
                Login to Sodah.io
              </Link>

            </div>
          </Modal>
        )}
      </main>
    </>
  );
}

/* =========================================================
   PERFORMANCE CARD
========================================================= */

function PerformanceCard({ title, value, text, accent }) {
  const colors = {
    green: "text-emerald-300",
    blue: "text-blue-300",
    cyan: "text-cyan-300",
    purple: "text-purple-300",
  };

  return (
    <div className="bg-[#071421] p-6 transition hover:bg-white/[0.035]">

      <p className="text-xs font-black uppercase tracking-[2px] text-slate-500">
        {title}
      </p>

      <p className={`mt-2 text-3xl font-black ${colors[accent]}`}>
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   DARK METRIC
========================================================= */

function DarkMetric({ label, value, change, color }) {
  const colors = {
    green: "text-emerald-300 bg-emerald-400/10",
    blue: "text-blue-300 bg-blue-400/10",
    cyan: "text-cyan-300 bg-cyan-400/10",
    purple: "text-purple-300 bg-purple-400/10",
  };

  const bars = {
    green: "82%",
    blue: "68%",
    cyan: "76%",
    purple: "91%",
  };

  const barColors = {
    green: "bg-emerald-400",
    blue: "bg-blue-400",
    cyan: "bg-cyan-400",
    purple: "bg-purple-400",
  };

  return (
    <div className="sodah-deep-shadow rounded-[26px] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:bg-white/[0.065]">

      <div className="flex items-center justify-between">

        <p className="text-xs font-bold uppercase tracking-[2px] text-slate-500">
          {label}
        </p>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${colors[color]}`}
        >
          {change}
        </span>
      </div>

      <p className="mt-5 text-4xl font-black text-white">
        {value}
      </p>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">

        <div
          className={`h-full rounded-full ${barColors[color]}`}
          style={{
            width: bars[color],
          }}
        />

      </div>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function LegendItem({ color, text }) {
  return (
    <div className="flex items-center justify-between text-xs">

      <div className="flex items-center gap-2">

        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />

        <span className="text-slate-400">
          {text}
        </span>

      </div>

      <span className="font-black text-white">
        Active
      </span>
    </div>
  );
}

/* =========================================================
   BENEFIT
========================================================= */

function Benefit({ text }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/75 p-4 shadow-sm">

      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-600">
        ✓
      </span>

      <span className="text-sm font-semibold text-slate-700">
        {text}
      </span>
    </div>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({ icon, title, text, tone }) {
  const tones = {
    green:
      "from-emerald-50 to-green-50 text-emerald-600 border-emerald-100",
    blue:
      "from-blue-50 to-sky-50 text-blue-600 border-blue-100",
    mint:
      "from-green-50 to-teal-50 text-teal-600 border-teal-100",
    purple:
      "from-purple-50 to-indigo-50 text-purple-600 border-purple-100",
    cyan:
      "from-cyan-50 to-blue-50 text-cyan-600 border-cyan-100",
  };

  return (
    <div className="group rounded-[26px] border border-slate-200 bg-white/80 p-7 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">

      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl border bg-gradient-to-br text-2xl font-black ${tones[tone]}`}
      >
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-500">
        {text}
      </p>

      <div className="mt-6 text-xs font-black text-emerald-600 transition group-hover:translate-x-1">
        Explore capability →
      </div>
    </div>
  );
}

/* =========================================================
   STEP CARD
========================================================= */

function StepCard({ number, icon, title, text }) {
  return (
    <div className="relative rounded-[28px] border border-white bg-white/80 p-7 shadow-sm transition hover:-translate-y-2 hover:shadow-xl">

      <div className="flex items-center justify-between">

        <span className="text-4xl text-emerald-600">
          {icon}
        </span>

        <span className="text-sm font-black text-emerald-600">
          {number}
        </span>

      </div>

      <h3 className="mt-8 text-2xl font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-500">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   MINI FEATURE
========================================================= */

function MiniFeature({ icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">

      <span className="text-xl">
        {icon}
      </span>

      <span className="text-sm font-bold text-slate-300">
        {text}
      </span>

    </div>
  );
}

/* =========================================================
   CONVERSION CARD
========================================================= */

function ConversionCard({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      <div className="text-2xl">
        {icon}
      </div>

      <h3 className="mt-4 font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-emerald-400/15 bg-[#071421] p-7 text-white shadow-[0_30px_120px_rgba(0,0,0,.75)] sm:p-9"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   MODAL HEADER
========================================================= */

function ModalHeader({ eyebrow, title, onClose }) {
  return (
    <div className="flex items-start justify-between gap-5">

      <div>

        <p className="text-[10px] font-black uppercase tracking-[3px] text-emerald-400">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">
          {title}
        </h2>

      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
        aria-label="Close dialog"
      >
        ×
      </button>
    </div>
  );
}