"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
/* =========================================
   IMAGE ASSETS
========================================= */

const SLIDES = [
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1776475843/0f298db5-675f-4c66-8896-f951967a3807_8fcee9.png",
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1775232452/cld-sample-2.jpg",
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1780574352/WhatsApp_Image_2026-06-04_at_3.56.47_PM_cl8jtq.jpg",
  "https://res.cloudinary.com/djnjhphf5/image/upload/v1779811920/WhatsApp_Image_2026-05-26_at_7.58.55_PM_sw7wpc.jpg",
];

const EXTRA_IMAGES = [
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?q=80&w=1600&auto=format&fit=crop",

  "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=1600&auto=format&fit=crop",

  "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1600&auto=format&fit=crop",
];

const TRUSTED_LOGOS = [
  {
    name: "WhatsApp",
    src: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
  },

  {
    name: "Meta",
    src: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Meta-Logo.png",
  },

  {
    name: "OpenAI",
    src: "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
    invert: true,
  },

  {
    name: "Google",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  },

  {
    name: "Stripe",
    src: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Stripe_Logo%2C_revised_2016.svg",
    invert: true,
  },

  {
    name: "PayPal",
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
  },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Replies",
    desc: "Respond instantly to customers on WhatsApp 24/7.",
  },

  {
    icon: "📅",
    title: "Smart Booking",
    desc: "Automatically schedule appointments and reservations.",
  },

  {
    icon: "🌍",
    title: "Multi-language",
    desc: "Talk to customers in multiple languages easily.",
  },

  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "Track leads, chats, bookings and performance.",
  },

  {
    icon: "🔁",
    title: "Follow-up Reminders",
    desc: "Automatically follow up with customers and leads.",
  },

  {
    icon: "🤖",
    title: "AI Human Responses",
    desc: "Natural AI conversations that feel human.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Johnson",
    role: "Beauty Salon",
    text: "Sodah.io completely transformed how we manage our customers.",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
  },

  {
    name: "Ahmed Musa",
    role: "Car Rental Service",
    text: "We now respond instantly to every customer inquiry.",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
  },

  {
    name: "Jessica Lee",
    role: "Medical Clinic",
    text: "Bookings increased massively after using Sodah.io AI.",
    img: "https://randomuser.me/api/portraits/women/68.jpg",
  },

  {
    name: "Daniel Brooks",
    role: "Restaurant",
    text: "The automation works perfectly and saves us time daily.",
    img: "https://randomuser.me/api/portraits/men/41.jpg",
  },

  {
    name: "Mariam Ali",
    role: "Cleaning Service",
    text: "Our customer support now feels premium and professional.",
    img: "https://randomuser.me/api/portraits/women/65.jpg",
  },

  {
    name: "David Martins",
    role: "Real Estate",
    text: "The AI follow-up system helped us close more deals.",
    img: "https://randomuser.me/api/portraits/men/55.jpg",
  },
];

const USE_CASES = [
  "🏥 Clinics & Hospitals",
  "💇 Salons & Spas",
  "🚗 Car Dealerships",
  "🚘 Car Rental Services",
  "🏠 Real Estate",
  "🍽 Restaurants",
  "🛍 Retail Stores",
  "🧼 Cleaning Services",
  "🏨 Hotels",
  "🎓 Schools",
  "🏋️ Fitness Centers",
  "📦 Delivery Services",
];

export default function Home() {
  const router = useRouter();

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSignup = () => {
    router.push("/signup");
  };

  const openAIChat = () => {
    window.open(
      "https://solomon-n8n.duckdns.org/webhook/a7935547-15a5-4742-8ac0-b8fab937d44c/chat",
      "_blank"
    );
  };

  return (
    <main className="bg-[#03130f] text-white overflow-x-hidden">

      {/* ================================= HEADER ================================= */}

   <header
  className="
  fixed
  top-0
  left-0
  w-full
  z-50
  bg-[#03130f]/80
  backdrop-blur-xl
  border-b
  border-white/10
"
>
  <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

    <div className="flex items-center gap-4">

      <img
        src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
        className="w-14 h-14"
      />

      <div>

        <h1 className="text-2xl font-black">
          Sodah.io
        </h1>

        <p className="text-xs text-gray-400">
          AI WhatsApp Automation
        </p>

      </div>

    </div>

    <nav className="hidden lg:flex gap-8 text-gray-300">

      <a href="#features">
        Features
      </a>

      <a href="#demo">
        Demo
      </a>

      <a href="#reviews">
        Reviews
      </a>

      <a href="#contact">
        Contact
      </a>

    </nav>

    <div className="hidden xl:flex items-center gap-5">

      <img
        src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
        className="w-7"
      />

      <img
        src="https://upload.wikimedia.org/wikipedia/commons/8/87/Google_Chrome_icon_%282011%29.png"
        className="w-7"
      />

      <img
        src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
        className="h-6"
      />

      <button
       onClick={() =>
  document.dispatchEvent(
    new Event(
      "open-install-popup"
    )
  )
}
        className="
          px-5
          py-3
          rounded-xl
          bg-green-500
          text-black
          font-bold
        "
      >
        📲 Download App
      </button>

    </div>

  </div>
</header>
      {/* ================================= FLOATING FREE TRIAL ================================= */}

      <div className="fixed bottom-9 left-1/2 -translate-x-1/2 z-30">

        <button
          onClick={goToSignup}
          className="px-6 py-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 text-black font-black text-lg shadow-[0_0_40px_rgba(34,197,94,0.6)] hover:scale-110 transition animate-pulse"
        >
          🚀 Start Free Trial
        </button>

      </div>



<div className="flex flex-wrap gap-4 mt-8">
  <Link
    href="/signup"
    className="rounded-xl bg-[#0B1F1A] px-8 py-4 text-white font-semibold hover:opacity-90 transition"
  >
    Start Free Trial
  </Link>
</div>

      {/* ================================= HERO ================================= */}
<section className="relative min-h-screen pt-32 overflow-hidden">

  {/* BACKGROUND */}

  <div className="absolute inset-0">

    {SLIDES.map((src, index) => (
      <img
        key={index}
        src={src}
        className={`
          absolute inset-0
          w-full h-full
          object-cover
          duration-[2000ms]
          transition-all
          ${
            currentSlide === index
              ? "opacity-100 scale-105"
              : "opacity-0 scale-100"
          }
        `}
      />
    ))}

    <div className="absolute inset-0 bg-[#03130f]/85 backdrop-blur-sm" />

  </div>

  <div className="relative z-10 max-w-7xl mx-auto px-6">

    <div className="grid lg:grid-cols-2 gap-20 items-center min-h-[85vh]">

      {/* LEFT */}

      <div>

        <div
          className="
          inline-flex
          items-center
          gap-2
          px-5
          py-3
          rounded-full
          bg-green-500/10
          border
          border-green-500/30
          text-green-300
          mb-8
        "
        >
          🚀 Trusted AI Automation Platform
        </div>

        <h1
          className="
          text-5xl
          md:text-7xl
          font-black
          leading-[1.05]
        "
        >
          Automate Your

          <span className="block text-green-400">
            WhatsApp Business
          </span>

          With AI.
        </h1>

        <p
          className="
          mt-8
          text-xl
          text-gray-300
          leading-relaxed
          max-w-2xl
        "
        >
          AI-powered customer support,
          instant replies,
          bookings,
          reminders and lead conversion
          directly on WhatsApp.
        </p>

        {/* BUTTONS */}

        <div className="flex flex-wrap gap-5 mt-10">

          <button
            onClick={goToSignup}
            className="
              px-8 py-4
              rounded-2xl
              bg-green-500
              text-black
              font-black
              text-lg
              hover:scale-105
              transition
              shadow-[0_0_40px_rgba(34,197,94,.4)]
            "
          >
            🚀 Start Free Trial
          </button>

          <button
           onClick={() =>
  document.dispatchEvent(
    new Event(
      "open-install-popup"
    )
  )
}
            className="
              px-8 py-4
              rounded-2xl
              border
              border-white/20
              bg-white/5
              font-bold
              hover:bg-white/10
            "
          >
            📲 Download App
          </button>

        </div>

        {/* TRUSTED */}

        <div className="mt-12">

          <p className="text-gray-400 mb-5">
            Trusted Technologies
          </p>

          <div className="flex flex-wrap gap-6 items-center">

            {TRUSTED_LOGOS.map((logo) => (
              <img
                key={logo.name}
                src={logo.src}
                alt={logo.name}
                className={`
                  h-8
                  opacity-80
                  ${
                    logo.invert
                      ? "invert"
                      : ""
                  }
                `}
              />
            ))}

          </div>

        </div>

      </div>

      {/* RIGHT */}

      <div className="relative">

        <div
          className="
          rounded-[35px]
          overflow-hidden
          border
          border-white/10
          shadow-[0_0_100px_rgba(34,197,94,.2)]
        "
        >
          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779811920/WhatsApp_Image_2026-05-26_at_7.58.55_PM_sw7wpc.jpg"
            className="
              w-full
              rounded-[35px]
              hover:scale-105
              duration-700
            "
          />
        </div>

        {/* CARD */}

        <div
          className="
          absolute
          -left-8
          bottom-10
          bg-green-500
          text-black
          rounded-2xl
          px-6
          py-4
          font-black
          shadow-2xl
        "
        >
          📈 +40% More Bookings
        </div>

        <div
          className="
          absolute
          top-10
          -right-10
          bg-[#071d17]
          border
          border-green-500/30
          rounded-2xl
          px-6
          py-4
          backdrop-blur-xl
        "
        >
          🤖 24/7 AI Assistant
        </div>

        <div
          className="
          absolute
          top-1/2
          -left-10
          bg-[#071d17]
          border
          border-white/10
          rounded-2xl
          px-6
          py-4
          backdrop-blur-xl
        "
        >
          ⚡ +60% Lead Conversion
        </div>

      </div>

    </div>

  </div>

</section>

      {/* ================================= METRICS ================================= */}

      <section className="py-14 bg-[#071d17] border-y border-white/5">

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">

          <Metric title="152K+" subtitle="Messages Automated" />
          <Metric title="3.8K+" subtitle="Bookings Made" />
          <Metric title="10K+" subtitle="Active Users" />
          <Metric title="98%" subtitle="Client Satisfaction" />

        </div>

      </section>

      {/* ================================= SECTION 1 ================================= */}

      <section className="min-h-screen flex items-center px-6 md:px-12 py-20">

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">

          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1781641952/manualreplirstil_prjkoe.jpg"
            alt="Business Team"
            className="rounded-3xl shadow-2xl border border-white/10 transition duration-700 hover:scale-105"
          />

          <div>

            <h2 className="text-3xl md:text-5xl font-black leading-tight">

              Still Replying To Messages Manually?

            </h2>

            <p className="mt-6 text-gray-300 text-lg leading-relaxed">

              Let Sodah.io AI handle your chats, leads, bookings and customer support automatically.

            </p>

            <ul className="mt-8 space-y-4 text-gray-200">

              <li>✔ Instant replies in seconds</li>

              <li>✔ Smart follow-ups that convert</li>

              <li>✔ Automatic appointment booking</li>

              <li>✔ 24/7 AI customer support</li>

            </ul>

          </div>

        </div>

      </section>

      {/* ================================= EXTRA LAYER 1 ================================= */}

      <section className="py-24 bg-[#071d17]">

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-14 items-center">

          <div>

            <h2 className="text-4xl font-black mb-6">
              Connect Your Existing WhatsApp Easily On Computer
            </h2>

            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              No need to disconnect your current WhatsApp account.
              Simply scan the QR code and connect instantly.
            </p>

            <div className="space-y-4">

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:scale-105 transition">
                ✅ fill automation details, Business or Personal use
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:scale-105 transition">
                ✅ Scan 	QR code with your existing whatsApp
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:scale-105 transition">
                ✅ Ai auto_reply, follow_up, reminder and appointment bookings start instantly
              </div>

            </div>

          </div>

          <div className="relative">

           <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1781713157/WhatsApp_Image_2026-06-17_at_8.18.20_PM_gyi4wt.jpg"
            alt="QR Connect"
            className="rounded-3xl border border-white/10 shadow-2xl hover:scale-105 transition duration-700"
          />
            

          </div>

        </div>

      </section>
{/* ================================= EXTRA LAYER 2 ================================= */}

      <section className="py-24">

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">

          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1781711765/WhatsApp_Image_2026-06-17_at_7.54.25_PM_luvnxg.jpg"
            alt="Fast Setup"
            className="rounded-3xl border border-white/10 shadow-2xl hover:scale-105 transition duration-700"
          />

          <div>

            <h2 className="text-4xl font-black mb-6">
              Business & Personal Setup
            </h2>

            <p className="text-gray-300 text-lg leading-relaxed">
              Setup your business AI assistant and personal assistant AI.
              the AI is well train to handle your Business and Personal chat profesionally.
            </p>

          </div>

        </div>

      </section>


  {/* ================================= EXTRA LAYER 1 ================================= */}

      <section className="py-24 bg-[#071d17]">

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">

          <div>

            <h2 className="text-4xl font-black mb-6">
              Connect Your Existing WhatsApp Using Phone
            </h2>

            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              No need to disconnect your current WhatsApp account.
              Simply scan the QR code and connect instantly.
            </p>

            <div className="space-y-4">

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:scale-105 transition">
                ✅ fill automation details, Business or Personal use
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:scale-105 transition">
                ✅ Scan 	QR code with the phone which have your existing whatsApp 
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:scale-105 transition">
                ✅ Ai auto_reply, follow_up, reminder and appointment bookings start instantly
              </div>

            </div>

          </div>
          <div className="relative">

            <img
             src="https://res.cloudinary.com/djnjhphf5/image/upload/v1781712052/WhatsApp_Image_2026-06-17_at_7.59.59_PM_mouj83.jpg"
            alt="QR Connect"
            className="rounded-3xl border border-white/10 shadow-2xl hover:scale-105 transition duration-700"
          />
    

          </div>

        </div>

      </section>


      {/* ================================= EXTRA LAYER 2 ================================= */}

      <section className="py-24">

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">

          <img
            src={EXTRA_IMAGES[1]}
            alt="Fast Setup"
            className="rounded-3xl border border-white/10 shadow-2xl hover:scale-105 transition duration-700"
          />

          <div>

            <h2 className="text-4xl font-black mb-6">
              Fast Setup & Easy Accessibility
            </h2>

            <p className="text-gray-300 text-lg leading-relaxed">
              Setup your business AI assistant within minutes.
              Easy dashboard, fast performance and smooth automation tools.
            </p>

          </div>

        </div>

      </section>

      {/* ================================= EXTRA LAYER 3 ================================= */}

      <section className="py-24 bg-[#071d17]">

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">

          <div>

            <h2 className="text-4xl font-black mb-6">
              AI Powered Lead Conversion
            </h2>

            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Automatically qualify leads, assign conversations to team members,
              and increase customer conversion rates.
            </p>

            <div className="grid grid-cols-2 gap-4">

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:scale-105 transition">
                ⚡ Instant Response
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:scale-105 transition">
                📈 More Conversions
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:scale-105 transition">
                🤖 AI Automation
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:scale-105 transition">
                📊 Analytics
              </div>

            </div>

          </div>

          <img
            src={EXTRA_IMAGES[2]}
            alt="Lead Conversion"
            className="rounded-3xl border border-white/10 shadow-2xl hover:scale-105 transition duration-700"
          />

        </div>

      </section>

      {/* ================================= FEATURES ================================= */}

      <section
        id="features"
        className="py-24 px-6 md:px-12"
      >

        <div className="max-w-7xl mx-auto">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-14">
            Everything You Need To Scale
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}

          </div>

        </div>

      </section>

      {/* ================================= USE CASES ================================= */}

      <section className="py-24 bg-[#071d17]">

        <div className="max-w-7xl mx-auto px-6 md:px-12">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-14">
            Perfect For Every Business
          </h2>

          <div className="grid md:grid-cols-4 gap-6">

            {USE_CASES.map((item) => (
              <div
                key={item}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-base font-semibold hover:border-green-400/30 hover:bg-white/10 hover:scale-105 transition"
              >
                {item}
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* ================================= TESTIMONIALS ================================= */}

      <section
        id="testimonials"
        className="py-24 px-6 md:px-12"
      >

        <div className="max-w-7xl mx-auto">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-14">
            Loved By Businesses
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            {TESTIMONIALS.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}

          </div>

        </div>

      </section>

      {/* ================================= FINAL CTA ================================= */}

      <section
        id="contact"
        className="min-h-screen flex items-center justify-center px-6 md:px-12 py-20 bg-gradient-to-br from-[#0b2a21] via-[#062218] to-[#03130f]"
      >

        <div className="max-w-4xl text-center">

          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
            alt="Sodah Logo"
            className="w-24 h-24 mx-auto mb-8 object-contain"
          />

          <h2 className="text-4xl md:text-6xl font-black leading-tight">
            Ready To Automate Your Business?
          </h2>

          <p className="mt-6 text-lg text-gray-300 leading-relaxed">
            Start converting every WhatsApp conversation into real revenue.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-6">

            {TRUSTED_LOGOS.map((logo) => (
              <img
                key={logo.name}
                src={logo.src}
                alt={logo.name}
                className={`h-8 opacity-80 ${logo.invert ? "invert" : ""}`}
              />
            ))}

          </div>

        </div>

      </section>

      {/* ================================= FLOATING AI BUTTON ================================= */}

      <div className="fixed bottom-6 right-6 z-50">

        <button
          onClick={openAIChat}
          className="relative w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 text-black text-2xl font-bold shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:scale-110 transition"
        >

          🤖

          <span className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping" />

        </button>

      </div>

    </main>
  );
}

/* =========================================
   COMPONENTS
========================================= */

function Metric({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-3xl md:text-4xl font-black text-green-400">
        {title}
      </h3>

      <p className="text-gray-400 mt-2 text-sm md:text-base">
        {subtitle}
      </p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-green-400/20 hover:scale-105 transition duration-300">

      <div className="text-4xl mb-4">
        {icon}
      </div>

      <h3 className="text-xl font-bold mb-3">
        {title}
      </h3>

      <p className="text-gray-400 leading-relaxed">
        {desc}
      </p>

    </div>
  );
}

function TestimonialCard({ name, role, text, img }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-green-400/20 hover:bg-white/10 transition">

      <div className="flex items-center gap-4 mb-5">

        <img
          src={img}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />

        <div>

          <h4 className="font-bold">
            {name}
          </h4>

          <p className="text-sm text-gray-400">
            {role}
          </p>

        </div>

      </div>

      <p className="text-gray-300 leading-relaxed">
        “{text}”
      </p>

    </div>
  );
}