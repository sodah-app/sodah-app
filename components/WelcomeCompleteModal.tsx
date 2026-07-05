"use client";

export default function WelcomeCompleteModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[92%] max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl border border-green-500/30 bg-[#111827] p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-300"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white text-3xl transition"
        >
          ×
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-green-500/40 bg-green-500/20 text-5xl">
            ✅
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-3xl md:text-4xl font-extrabold text-white">
          Congratulations!
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-center text-xl font-semibold text-green-400">
          WhatsApp Connected Successfully
        </p>

        {/* Description */}
        <p className="mt-6 text-center leading-7 text-gray-300">
          Your <span className="font-semibold text-white">WhatsApp</span> has
          been securely connected to{" "}
          <span className="font-semibold text-green-400">Sodah.io</span>.
        </p>

        <p className="mt-4 text-center leading-7 text-gray-300">
          Your{" "}
          <span className="font-semibold text-green-400">
            AI Auto Reply
          </span>{" "}
          is now active and ready to automatically respond to your incoming
          WhatsApp messages 24 hours a day, 7 days a week.
        </p>

        {/* Features */}
        <div className="mt-8 space-y-3">
          {[
            "AI Auto Reply Enabled",
            "Smart Conversations Activated",
            "Dashboard Connected",
            "Ready to Receive Messages",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center rounded-xl border border-green-500/20 bg-white/5 p-4"
            >
              <span className="mr-3 text-xl text-green-400">✅</span>
              <span className="text-white">{item}</span>
            </div>
          ))}
        </div>

        {/* Trial Card */}
        <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
          <h3 className="font-semibold text-white">
            🎉 Your Free Trial Has Started
          </h3>

          <p className="mt-1 text-sm text-gray-300">
            You have <span className="font-semibold text-green-400">7 days</span>{" "}
            of full access to all premium features.
          </p>
        </div>

        {/* Exit Button */}
        <button
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 py-4 text-lg font-bold text-black transition hover:scale-[1.02]"
        >
          Exit
        </button>
      </div>
    </div>
  );
}