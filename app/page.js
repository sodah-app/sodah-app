"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LOGO_URL =
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png";

const SUPPORT_WHATSAPP = "https://wa.me/971544027954";

const AI_SUPPORT_URL =
  "https://solomon-n8n.duckdns.org/webhook/a7935547-15a5-4742-8ac0-b8fab937d44c/chat";

const WHATSAPP_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg";

const SOCIALS = [
  {
    name: "WhatsApp",
    src: WHATSAPP_LOGO,
    href: SUPPORT_WHATSAPP,
  },
];

const CHANNEL_CONNECTION_STEPS = [
  {
    name: "WhatsApp",
    logo: WHATSAPP_LOGO,
    text: "Connect your existing WhatsApp, scan the QR code, and start AI-powered customer conversations.",
  },
];

const PRIMARY_FEATURES = [
  {
    icon: "文",
    title: "Multi-Language Support",
    text: "Communicate naturally with customers in different languages and give every conversation a smoother experience.",
  },
  {
    icon: "✦",
    title: "Professional Chatting",
    text: "Handle customer conversations professionally with fast, clear and AI-powered responses.",
  },
  {
    icon: "◫",
    title: "Appointment Booking",
    text: "Let customers request and confirm appointments directly through WhatsApp conversations.",
  },
  {
    icon: "↻",
    title: "Fast Follow-Up",
    text: "Automatically follow up with interested customers so important conversations never go cold.",
  },
  {
    icon: "⏰",
    title: "Reminders",
    text: "Send timely reminders for appointments and customer follow-ups without manual effort.",
  },
  {
    icon: "⚡",
    title: "WhatsApp Messaging",
    text: "Send messages to your customers or team directly from your Sodah workspace.",
  },
  {
    icon: "◷",
    title: "Daily, Weekly & Monthly Scheduling",
    text: "Schedule recurring WhatsApp messages for your customers or team.",
  },
  {
    icon: "∞",
    title: "Flexible Messaging",
    text: "Run or schedule WhatsApp messages for customer and team communication.",
  },
  {
    icon: "⚙",
    title: "Update Your Business Anytime",
    text: "Change your business information, services, promotions, packages and customer-facing details yourself.",
  },
  {
    icon: "✚",
    title: "New Promotions & Packages",
    text: "Add new promotions, services or packages anytime without depending on an agent.",
  },
];

const FEATURES = [
  {
    icon: "⌁",
    title: "Advanced AI Customer Conversations",
    text: "Handle customer conversations naturally, answer questions and keep conversations moving toward the next useful action.",
    arabic: "إدارة محادثات العملاء بذكاء والرد بشكل طبيعي وسريع.",
    german: "Kundengespräche intelligent und natürlich bearbeiten.",
    tone: "green",
  },
  {
    icon: "◫",
    title: "Appointment Booking",
    text: "Turn conversations into organized appointment requests, availability checks and confirmations.",
    arabic: "تحويل المحادثات إلى طلبات وحجوزات مواعيد منظمة.",
    german: "Gespräche in strukturierte Terminbuchungen verwandeln.",
    tone: "blue",
  },
  {
    icon: "◎",
    title: "Lead Capture & Management",
    text: "Keep important customer opportunities organized so leads can move from conversation to action.",
    arabic: "تنظيم العملاء المحتملين وتحويل المحادثات إلى فرص.",
    german: "Leads aus Gesprächen erfassen und organisiert weiterführen.",
    tone: "cyan",
  },
  {
    icon: "文",
    title: "Multi-Language AI",
    text: "Communicate naturally with customers in their language for a smoother international customer experience.",
    arabic: "تواصل مع العملاء بلغتهم بشكل طبيعي.",
    german: "Natürlich mit Kunden in ihrer Sprache kommunizieren.",
    tone: "blue",
  },
  {
    logo: WHATSAPP_LOGO,
    icon: "◉",
    title: "WhatsApp Campaigns",
    text: "Create, schedule and manage WhatsApp messages from the same business workspace, with powerful campaign tools for reaching customer lists efficiently.",
    arabic: "إنشاء وجدولة وإدارة حملات واتساب من مكان واحد.",
    german: "WhatsApp-Kampagnen zentral erstellen, planen und verwalten.",
    tone: "green",
  },
  {
    icon: "↻",
    title: "WhatsApp History",
    text: "Keep campaign activity and messaging history organized so you can review what has been sent and what happened.",
    arabic: "مراجعة سجل الحملات والرسائل والأنشطة.",
    german: "Kampagnen- und Nachrichtenverläufe übersichtlich prüfen.",
    tone: "mint",
  },
  {
    icon: "◷",
    title: "Timesheet",
    text: "Keep employee data and work activity organized in the same workspace as your customer operations.",
    arabic: "تنظيم ساعات العمل وبيانات الفريق.",
    german: "Arbeitszeiten und Teamaktivitäten zentral organisieren.",
    tone: "blue",
  },
  {
    icon: "₿",
    title: "Cash Flow",
    text: "Track important cash-flow information alongside the rest of your business workspace.",
    arabic: "متابعة معلومات التدفق النقدي ضمن مساحة العمل.",
    german: "Cashflow-Informationen im Business-Workspace verfolgen.",
    tone: "purple",
  },
  {
    icon: "⌁",
    title: "Analytics",
    text: "See business activity and important performance signals in one place so you can understand what is happening.",
    arabic: "رؤية مؤشرات الأداء ونشاط العمل في مكان واحد.",
    german: "Wichtige Leistungs- und Aktivitätsdaten zentral sehen.",
    tone: "cyan",
  },
  {
    icon: "⚙",
    title: "Business Update AI",
    text: "Update business information, services, promotions and packages yourself as your business changes.",
    arabic: "تحديث معلومات وخدمات وعروض النشاط التجاري بنفسك.",
    german: "Geschäftsinformationen, Leistungen und Angebote selbst aktualisieren.",
    tone: "mint",
  },
  {
    icon: "∞",
    title: "Follow-Ups & Reminders",
    text: "Keep customers moving with timely follow-ups and reminders without relying on repetitive manual work.",
    arabic: "متابعة العملاء وإرسال التذكيرات في الوقت المناسب.",
    german: "Automatische Nachfassaktionen und Erinnerungen unterstützen.",
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
    value: "AUTO",
    text: "Turn conversations into appointments",
    accent: "blue",
  },
  {
    title: "Leads",
    value: "LIVE",
    text: "Capture opportunities as they happen",
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
    window.open(
      AI_SUPPORT_URL,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleSection(id) {
    setMobileMenu(false);
    scrollToSection(id);
  }

  return (
    <>
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
            linear-gradient(
              rgba(16, 185, 129, 0.045) 1px,
              transparent 1px
            ),
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
          background-size:
            95px 95px,
            125px 125px,
            155px 155px,
            auto;
        }

        .sodah-chat-wallpaper::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.18;
          background-image: repeating-linear-gradient(
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

      <main className="min-h-screen overflow-hidden bg-[#f2fbf5] text-slate-950">

        {/* =====================================================
            NAVIGATION
        ====================================================== */}

        <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050b12]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <img
                src={LOGO_URL}
                alt="Sodah.io"
                className="h-9 w-auto object-contain"
              />

              <span className="hidden text-sm font-black tracking-tight text-white sm:block">
                SODAH.IO
              </span>
            </Link>

            <div className="hidden items-center gap-7 lg:flex">
              <button
                onClick={() => setShowAbout(true)}
                className="text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                About Us
              </button>

              <button
                onClick={() => handleSection("features")}
                className="text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                Features
              </button>

              <button
                onClick={() => handleSection("how-it-works")}
                className="text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                How It Works
              </button>

              <button
                onClick={() => handleSection("platform")}
                className="text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                Platform
              </button>

              <button
                onClick={() => handleSection("pricing")}
                className="text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                Pricing
              </button>

              <button
                onClick={() => setShowContact(true)}
                className="text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                Contact
              </button>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <a
                href={SUPPORT_WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-emerald-400/10"
              >
                WhatsApp
              </a>

              <Link
                href="/login"
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/5"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden"
              aria-label="Open menu"
            >
              {mobileMenu ? "×" : "☰"}
            </button>
          </div>

          {mobileMenu && (
            <div className="border-t border-white/10 bg-[#050b12] px-5 py-5 lg:hidden">
              <div className="grid gap-2">
                <button
                  onClick={() => {
                    setShowAbout(true);
                    setMobileMenu(false);
                  }}
                  className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  About Us
                </button>

                <button
                  onClick={() => handleSection("features")}
                  className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  Features
                </button>

                <button
                  onClick={() => handleSection("how-it-works")}
                  className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  How It Works
                </button>

                <button
                  onClick={() => handleSection("platform")}
                  className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  Platform
                </button>

                <button
                  onClick={() => handleSection("pricing")}
                  className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  Pricing
                </button>

                <button
                  onClick={() => {
                    setShowContact(true);
                    setMobileMenu(false);
                  }}
                  className="rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  Contact
                </button>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-black text-white"
                  >
                    Start Free
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* =====================================================
            PREMIUM TEXT-ONLY HERO
        ====================================================== */}

        <section className="relative flex min-h-[850px] items-center overflow-hidden bg-[#050b12] pt-28">
          <div className="absolute inset-0 sodah-grid opacity-60" />

          <div className="absolute left-[-10%] top-[5%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />

          <div className="absolute right-[-10%] bottom-[-5%] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[140px]" />

          <div className="relative mx-auto w-full max-w-6xl px-6 py-24 text-center lg:px-8 lg:py-32">

            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[3px] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,.8)]" />
              Sodah Smart Advanced AI Automation
            </div>

            <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl lg:text-[88px]">
              Turn Conversations
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-green-400 to-sky-400 bg-clip-text text-transparent">
                Into More Bookings.
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              Your business deserves an AI assistant that works 24/7.
              Sodah understands your business, speaks with your customers,
              captures leads, books appointments, sends follow-ups and
              reminders, and helps turn everyday conversations into growth.
            </p>

            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3">
              {[
                "24/7 AI Customer Assistant",
                "Multi-Language Conversations",
                "Appointment Booking",
                "Automatic Follow-Ups",
                "Business Updates",
                "WhatsApp Campaigns",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">

              <Link
                href="/signup"
                className="group rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-sky-500 px-8 py-4 text-sm font-black text-white shadow-[0_18px_55px_rgba(16,185,129,.22)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(16,185,129,.3)]"
              >
                Start Your 7-Day Free Trial
                <span className="ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <button
                type="button"
                onClick={() => handleSection("features")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/[0.08]"
              >
                Explore Sodah AI
              </button>

            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold text-slate-500">
              <span>7 Days Completely Free</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
              <span>No Complicated API Setup</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
              <span>Connect WhatsApp With QR</span>
            </div>

            <div className="mx-auto mt-20 max-w-4xl border-t border-white/10 pt-8">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-600">
                Built for modern customer operations
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["01", "Understand"],
                  ["02", "Engage"],
                  ["03", "Convert"],
                  ["04", "Grow"],
                ].map(([number, title]) => (
                  <div
                    key={number}
                    className="rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-5"
                  >
                    <p className="text-xs font-black text-emerald-400">
                      {number}
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FEATURES
        ====================================================== */}

        <section
          id="features"
          className="bg-[#f4fbf7] px-6 py-24 lg:px-8 lg:py-32"
        >
          <div className="mx-auto max-w-7xl">

            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Intelligent Business Automation
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Everything your WhatsApp operation needs.
                <span className="block text-emerald-600">
                  One intelligent workspace.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-500">
                Sodah brings customer conversations, leads, appointments,
                campaigns, follow-ups, business updates and analytics into
                one powerful operating system.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  {...feature}
                />
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            VALUE PROPOSITION
        ====================================================== */}

        <section className="bg-white px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">

            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">

              <div>
                <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                  Built Around Your Business
                </p>

                <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Your AI should know your business.
                </h2>

                <p className="mt-6 text-base leading-8 text-slate-500">
                  Update your services, prices, packages, promotions,
                  products and business information whenever you want.
                  Sodah uses that information to help your AI assistant
                  communicate more accurately with customers.
                </p>

                <Link
                  href="/signup"
                  className="mt-8 inline-flex rounded-2xl bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-slate-800"
                >
                  Build Your AI Workspace →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {PRIMARY_FEATURES.map((feature) => (
                  <Benefit
                    key={feature.title}
                    text={feature.title}
                  />
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            PERFORMANCE
        ====================================================== */}

        <section className="bg-[#050b12] px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">

            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-400">
                Always Working
              </p>

              <h2 className="mt-4 text-4xl font-black text-white sm:text-5xl">
                Your customer operation never has to sleep.
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
                Let Sodah handle repetitive conversations while your team
                focuses on customers, service and growth.
              </p>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {PERFORMANCE_ITEMS.map((item) => (
                <PerformanceCard
                  key={item.title}
                  {...item}
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
          className="bg-[#f4fbf7] px-6 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">

            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Simple Setup
              </p>

              <h2 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
                From WhatsApp to AI automation.
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500">
                Connect your existing WhatsApp account with a QR code and
                start building smarter customer conversations.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <StepCard
                number="01"
                icon="◉"
                title="Connect"
                text="Connect your existing WhatsApp account by scanning a simple QR code."
              />

              <StepCard
                number="02"
                icon="⚙"
                title="Configure"
                text="Add your business information, services, products, promotions and customer-facing details."
              />

              <StepCard
                number="03"
                icon="✦"
                title="Automate"
                text="Let Sodah AI communicate with customers, capture leads, book appointments and follow up automatically."
              />
            </div>

          </div>
        </section>

        {/* =====================================================
            PLATFORM
        ====================================================== */}

        <section
          id="platform"
          className="bg-[#071421] px-6 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">

            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              <div>
                <p className="text-xs font-black uppercase tracking-[3px] text-emerald-400">
                  Sodah Platform
                </p>

                <h2 className="mt-4 text-4xl font-black text-white sm:text-5xl">
                  One workspace.
                  <span className="block text-emerald-300">
                    Complete visibility.
                  </span>
                </h2>

                <p className="mt-6 text-base leading-8 text-slate-400">
                  See your conversations, appointments, leads, campaigns,
                  business activity and customer operations from one
                  centralized workspace.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <MiniFeature
                    icon="💬"
                    text="AI conversations"
                  />

                  <MiniFeature
                    icon="📅"
                    text="Appointments"
                  />

                  <MiniFeature
                    icon="👥"
                    text="Lead management"
                  />

                  <MiniFeature
                    icon="📊"
                    text="Analytics"
                  />

                  <MiniFeature
                    icon="📣"
                    text="WhatsApp campaigns"
                  />

                  <MiniFeature
                    icon="🔄"
                    text="Follow-ups"
                  />
                </div>
              </div>

              <div className="sodah-deep-shadow rounded-[32px] border border-white/10 bg-white/[0.045] p-5">

                <div className="rounded-[25px] border border-white/10 bg-[#050b12] p-5">

                  <div className="flex items-center justify-between border-b border-white/10 pb-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[2px] text-slate-500">
                        Sodah Workspace
                      </p>

                      <p className="mt-1 text-lg font-black text-white">
                        Business Overview
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-300">
                      LIVE
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <DarkMetric
                      label="Conversations"
                      value="24/7"
                      change="+18%"
                      color="green"
                    />

                    <DarkMetric
                      label="Appointments"
                      value="128"
                      change="+24%"
                      color="blue"
                    />

                    <DarkMetric
                      label="Leads"
                      value="342"
                      change="+31%"
                      color="cyan"
                    />

                    <DarkMetric
                      label="Follow-Ups"
                      value="91%"
                      change="AUTO"
                      color="purple"
                    />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[2px] text-slate-500">
                        Automation Status
                      </p>

                      <p className="text-xs font-black text-emerald-300">
                        Active
                      </p>
                    </div>

                    <div className="mt-5 space-y-3">
                      <LegendItem
                        color="bg-emerald-400"
                        text="AI Customer Assistant"
                      />

                      <LegendItem
                        color="bg-sky-400"
                        text="Appointment Automation"
                      />

                      <LegendItem
                        color="bg-cyan-400"
                        text="Lead Follow-Up"
                      />

                      <LegendItem
                        color="bg-purple-400"
                        text="Campaign Automation"
                      />
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            TRUST
        ====================================================== */}

        <section className="bg-white px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">

            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Why Sodah
              </p>

              <h2 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
                Automation designed around growth.
              </h2>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {TRUST_ITEMS.map(([icon, title, text]) => (
                <ConversionCard
                  key={title}
                  icon={icon}
                  title={title}
                  text={text}
                />
              ))}
            </div>

          </div>
        </section>

        {/* =====================================================
            WHATSAPP CAMPAIGNS
        ====================================================== */}

        <section
          id="campaigns"
          className="bg-[#f4fbf7] px-6 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">

            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              <div>
                <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                  WhatsApp Campaigns
                </p>

                <h2 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
                  Reach more customers.
                  <span className="block text-emerald-600">
                    Without doing everything manually.
                  </span>
                </h2>

                <p className="mt-6 text-base leading-8 text-slate-500">
                  Create campaigns, schedule messages, manage your customer
                  lists and keep your messaging history organized from the
                  same Sodah workspace.
                </p>

                <div className="mt-8 grid gap-3">
                  <Benefit text="Send campaigns to large customer lists from one workflow." />
                  <Benefit text="Schedule daily, weekly or monthly messages." />
                  <Benefit text="Follow up with customers using the same connected WhatsApp number." />
                  <Benefit text="Review campaign history and messaging activity." />
                </div>
              </div>

              <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-[0_30px_90px_rgba(16,185,129,.1)]">

                <div className="rounded-[26px] bg-[#071421] p-7 text-white">

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-500">
                        Campaign
                      </p>

                      <h3 className="mt-2 text-2xl font-black">
                        Summer Promotion
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-300">
                      READY
                    </span>
                  </div>

                  <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <p className="text-sm leading-7 text-slate-300">
                      Hi! We have a new promotion available for you.
                      Would you like to learn more?
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white/[0.04] p-4">
                      <p className="text-[9px] uppercase tracking-[1.5px] text-slate-500">
                        Audience
                      </p>
                      <p className="mt-2 text-xl font-black">
                        200+
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.04] p-4">
                      <p className="text-[9px] uppercase tracking-[1.5px] text-slate-500">
                        Status
                      </p>
                      <p className="mt-2 text-xl font-black text-emerald-300">
                        Live
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.04] p-4">
                      <p className="text-[9px] uppercase tracking-[1.5px] text-slate-500">
                        Follow-Up
                      </p>
                      <p className="mt-2 text-xl font-black text-sky-300">
                        Auto
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            BUSINESS UPDATES
        ====================================================== */}

        <section className="bg-[#050b12] px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">

            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              <div className="order-2 lg:order-1">
                <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">

                  <div className="rounded-[25px] border border-white/10 bg-[#071421] p-6">

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-xl">
                        ⚙
                      </div>

                      <div>
                        <p className="text-xs font-black text-white">
                          Business Knowledge
                        </p>

                        <p className="text-[10px] text-slate-500">
                          Updated by you
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <MiniFeature
                        icon="✓"
                        text="New service added"
                      />

                      <MiniFeature
                        icon="✓"
                        text="Promotion updated"
                      />

                      <MiniFeature
                        icon="✓"
                        text="Product image added"
                      />

                      <MiniFeature
                        icon="✓"
                        text="Business hours updated"
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4">
                      <p className="text-xs leading-6 text-emerald-200">
                        Sodah AI can use your updated business information
                        when communicating with customers.
                      </p>
                    </div>

                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <p className="text-xs font-black uppercase tracking-[3px] text-emerald-400">
                  Business Control
                </p>

                <h2 className="mt-4 text-4xl font-black text-white sm:text-5xl">
                  Your business changes.
                  <span className="block text-emerald-300">
                    Your AI changes with it.
                  </span>
                </h2>

                <p className="mt-6 text-base leading-8 text-slate-400">
                  Add products, promotional images, new services, packages,
                  offers and other business information yourself. Keep your
                  AI assistant aligned with what your business is offering
                  today.
                </p>

                <div className="mt-8 grid gap-3">
                  <MiniFeature
                    icon="🖼️"
                    text="Add promotional and product images"
                  />

                  <MiniFeature
                    icon="✦"
                    text="Let AI introduce offers professionally"
                  />

                  <MiniFeature
                    icon="⚡"
                    text="Update your business information anytime"
                  />

                  <MiniFeature
                    icon="🌍"
                    text="Communicate naturally across languages"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            INDUSTRIES
        ====================================================== */}

        <section className="bg-white px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">

            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Built For Business
              </p>

              <h2 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
                One AI platform.
                <span className="block text-emerald-600">
                  Many industries.
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500">
                Sodah adapts to the way your business communicates,
                schedules, sells and follows up.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {USE_CASES.map(([icon, title]) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className="text-2xl">{icon}</span>

                  <p className="mt-4 text-sm font-black text-slate-900">
                    {title}
                  </p>
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
          className="bg-[#f4fbf7] px-6 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">

            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[3px] text-emerald-600">
                Simple Pricing
              </p>

              <h2 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
                Start free.
                <span className="text-emerald-600">
                  {" "}
                  Scale when ready.
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500">
                Try Sodah completely free for 7 days, then choose the plan
                that fits your business.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">

              {/* STARTER */}
              <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[2px] text-slate-500">
                  Starter
                </p>

                <h3 className="mt-4 text-3xl font-black text-slate-950">
                  Free
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Try Sodah for 7 days.
                </p>

                <div className="mt-7 space-y-3">
                  <Benefit text="7-day free trial" />
                  <Benefit text="AI customer conversations" />
                  <Benefit text="Business setup" />
                  <Benefit text="WhatsApp connection" />
                </div>

                <Link
                  href="/signup"
                  className="mt-7 block rounded-2xl bg-slate-950 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Start Free
                </Link>
              </div>

              {/* PRO */}
              <div className="relative rounded-[30px] border-2 border-emerald-400 bg-[#071421] p-7 text-white shadow-[0_30px_90px_rgba(16,185,129,.15)]">

                <div className="absolute right-6 top-6 rounded-full bg-emerald-400 px-3 py-1 text-[9px] font-black uppercase tracking-[1px] text-slate-950">
                  Most Popular
                </div>

                <p className="text-xs font-black uppercase tracking-[2px] text-emerald-300">
                  Pro
                </p>

                <div className="mt-4 flex items-end gap-2">
                  <h3 className="text-5xl font-black">
                    $29
                  </h3>

                  <span className="pb-2 text-sm text-slate-400">
                    / month
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  About AED 100/month.
                </p>

                <div className="mt-7 space-y-3">
                  <Benefit text="Advanced AI automation" />
                  <Benefit text="Appointments & follow-ups" />
                  <Benefit text="WhatsApp campaigns" />
                  <Benefit text="Analytics & history" />
                  <Benefit text="Business updates" />
                </div>

                <Link
                  href="/signup"
                  className="mt-7 block rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 px-6 py-4 text-center text-sm font-black text-white"
                >
                  Start Pro →
                </Link>
              </div>

              {/* PREMIUM */}
              <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">

                <p className="text-xs font-black uppercase tracking-[2px] text-slate-500">
                  Premium
                </p>

                <div className="mt-4 flex items-end gap-2">
                  <h3 className="text-5xl font-black text-slate-950">
                    $79
                  </h3>

                  <span className="pb-2 text-sm text-slate-500">
                    / month
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Advanced business automation.
                </p>

                <div className="mt-7 space-y-3">
                  <Benefit text="Everything in Pro" />
                  <Benefit text="Advanced automation" />
                  <Benefit text="Expanded business workflows" />
                  <Benefit text="More powerful campaign tools" />
                  <Benefit text="Premium capabilities" />
                </div>

                <Link
                  href="/signup"
                  className="mt-7 block rounded-2xl bg-slate-950 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Choose Premium →
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ====================================================== */}

        <section
          id="contact"
          className="relative overflow-hidden bg-[#050b12] px-6 py-28 lg:px-8"
        >
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[130px]" />

          <div className="relative mx-auto max-w-4xl text-center">

            <p className="text-xs font-black uppercase tracking-[3px] text-emerald-400">
              Ready to automate?
            </p>

            <h2 className="mt-5 text-5xl font-black tracking-tight text-white sm:text-6xl">
              Stop chasing conversations.
              <span className="block bg-gradient-to-r from-emerald-300 to-sky-400 bg-clip-text text-transparent">
                Start converting them.
              </span>
            </h2>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-400">
              Give your business an AI assistant that can communicate,
              book, follow up and help you grow — 24/7.
            </p>

            <Link
              href="/signup"
              className="mt-10 inline-flex rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-sky-500 px-9 py-5 text-sm font-black text-white shadow-[0_20px_70px_rgba(16,185,129,.22)] transition hover:-translate-y-1"
            >
              Start Your 7-Day Free Trial →
            </Link>

            <p className="mt-5 text-xs font-bold text-slate-600">
              7 days completely free · No complicated API setup
            </p>

          </div>
        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <footer className="border-t border-white/10 bg-[#050b12] px-6 py-12 text-white lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">

            <div>
              <Link href="/" className="flex items-center gap-3">
                <img
                  src={LOGO_URL}
                  alt="Sodah.io"
                  className="h-8 w-auto"
                />

                <span className="font-black">
                  SODAH.IO
                </span>
              </Link>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                Smart AI automation for modern customer conversations.
              </p>
            </div>

            <div className="flex flex-wrap gap-5 text-sm font-bold text-slate-400">
              <button
                onClick={() => setShowAbout(true)}
                className="transition hover:text-white"
              >
                About
              </button>

              <button
                onClick={() => handleSection("features")}
                className="transition hover:text-white"
              >
                Features
              </button>

              <button
                onClick={() => handleSection("pricing")}
                className="transition hover:text-white"
              >
                Pricing
              </button>

              <button
                onClick={() => setShowContact(true)}
                className="transition hover:text-white"
              >
                Contact
              </button>

              <Link
                href="/privacy"
                className="transition hover:text-white"
              >
                Privacy
              </Link>

              <Link
                href="/terms"
                className="transition hover:text-white"
              >
                Terms
              </Link>
            </div>

          </div>

          <div className="mx-auto mt-10 max-w-7xl border-t border-white/5 pt-6">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} Sodah.io. All rights reserved.
            </p>
          </div>
        </footer>

        {/* =====================================================
            FLOATING AI
        ====================================================== */}

        <button
          type="button"
          onClick={openAIChat}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-2xl text-white shadow-[0_15px_50px_rgba(16,185,129,.3)] transition hover:-translate-y-1"
          aria-label="Open AI support"
        >
          🤖
        </button>

        {/* =====================================================
            ABOUT MODAL
        ====================================================== */}

        {showAbout && (
          <Modal onClose={closeEverything}>
            <ModalHeader
              eyebrow="SODAH.IO"
              title="AI automation built for real businesses."
              onClose={closeEverything}
            />

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Sodah.io helps businesses automate customer conversations,
              capture leads, book appointments, send follow-ups, manage
              campaigns and keep business information up to date.
            </p>

            <div className="mt-7 grid gap-3">
              <MiniFeature
                icon="✦"
                text="AI-powered customer conversations"
              />

              <MiniFeature
                icon="◫"
                text="Appointment booking"
              />

              <MiniFeature
                icon="↻"
                text="Follow-ups and reminders"
              />

              <MiniFeature
                icon="🌍"
                text="Multi-language communication"
              />

              <MiniFeature
                icon="📣"
                text="WhatsApp campaign automation"
              />
            </div>

            <Link
              href="/signup"
              onClick={closeEverything}
              className="mt-7 block rounded-2xl bg-gradient-to-r from-emerald-400 to-green-600 px-6 py-4 text-center text-sm font-black text-white"
            >
              Start Your Free Trial →
            </Link>
          </Modal>
        )}

        {/* =====================================================
            CONTACT MODAL
        ====================================================== */}

        {showContact && (
          <Modal onClose={closeEverything}>
            <ModalHeader
              eyebrow="CONTACT SODAH.IO"
              title="We're here to help."
              onClose={closeEverything}
            />

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Need help getting started or have a question about Sodah.io?
              Contact our support team or chat with the AI assistant.
            </p>

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

                <h3 className="mt-5 font-black text-white">
                  WhatsApp Support
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Chat directly with Sodah.io support.
                </p>

                <span className="mt-4 inline-block text-sm font-black text-emerald-400">
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

                <h3 className="mt-5 font-black text-white">
                  AI Support
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Open the Sodah AI support assistant.
                </p>

                <span className="mt-4 inline-block text-sm font-black text-cyan-400">
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

function PerformanceCard({
  title,
  value,
  text,
  accent,
}) {
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

      <p
        className={`mt-2 text-3xl font-black ${
          colors[accent] || colors.green
        }`}
      >
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

function DarkMetric({
  label,
  value,
  change,
  color,
}) {
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
          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
            colors[color] || colors.green
          }`}
        >
          {change}
        </span>

      </div>

      <p className="mt-5 text-4xl font-black text-white">
        {value}
      </p>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${
            barColors[color] || barColors.green
          }`}
          style={{
            width: bars[color] || bars.green,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function LegendItem({
  color,
  text,
}) {
  return (
    <div className="flex items-center justify-between text-xs">

      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${color}`}
        />

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

function FeatureCard({
  logo,
  icon,
  title,
  text,
  arabic,
  german,
  tone,
}) {
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
    <div className="group rounded-[28px] border border-white/50 bg-slate-950/90 p-6 text-white shadow-[0_20px_55px_rgba(2,6,23,.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:bg-slate-950">

      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl border bg-gradient-to-br text-2xl font-black ${
          tones[tone] || tones.green
        }`}
      >
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-8 w-8 object-contain"
          />
        ) : (
          icon
        )}
      </div>

      <h3 className="mt-6 text-xl font-black text-white">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-300">
        {text}
      </p>

      <div className="mt-5 border-t border-white/10 pt-4">

        <p className="text-[9px] font-black uppercase tracking-[1.8px] text-emerald-300">
          English · العربية · Deutsch
        </p>

        {arabic && (
          <p
            dir="rtl"
            lang="ar"
            className="mt-3 text-xs leading-6 text-slate-400"
          >
            {arabic}
          </p>
        )}

        {german && (
          <p
            lang="de"
            className="mt-2 text-xs leading-6 text-slate-400"
          >
            {german}
          </p>
        )}

      </div>
    </div>
  );
}

/* =========================================================
   STEP CARD
========================================================= */

function StepCard({
  number,
  icon,
  title,
  text,
}) {
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

function MiniFeature({
  icon,
  text,
}) {
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

function ConversionCard({
  icon,
  title,
  text,
}) {
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

function Modal({
  children,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-emerald-400/15 bg-[#071421] p-7 text-white shadow-[0_30px_120px_rgba(0,0,0,.75)] sm:p-9"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   MODAL HEADER
========================================================= */

function ModalHeader({
  eyebrow,
  title,
  onClose,
}) {
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