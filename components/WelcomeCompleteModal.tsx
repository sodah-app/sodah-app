"use client";

export default function WelcomeCompleteModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md px-6">
      <div className="w-full max-w-md rounded-3xl border border-green-500/40 bg-[#111827] p-8 shadow-2xl animate-in fade-in zoom-in duration-300">

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-5xl">
            🎉
          </div>
        </div>

        {/* Title */}
        <h2 className="text-4xl font-extrabold text-white text-center">
          Congratulations!
        </h2>

        {/* Subtitle */}
        <p className="text-center text-green-400 text-xl font-semibold mt-2">
          WhatsApp Connected Successfully
        </p>

        {/* Description */}
        <p className="text-gray-300 text-center mt-6 leading-7">
          Your <span className="font-semibold text-white">WhatsApp</span> has
          been securely connected to{" "}
          <span className="font-semibold text-green-400">
            Sodah.io
          </span>.
        </p>

        <p className="text-gray-300 text-center mt-4 leading-7">
          Your{" "}
          <span className="font-semibold text-green-400">
            AI Auto Reply
          </span>{" "}
          is now active and ready to automatically respond to your incoming
          WhatsApp messages 24 hours a day, 7 days a week.
        </p>

        <p className="text-gray-400 text-center mt-4 leading-7">
          Thank you for choosing{" "}
          <span className="text-green-400 font-semibold">
            Sodah.io
          </span>.
          <br />
          Your automation is now ready to save time, engage customers, and
          never miss another message.
        </p>

        {/* Status Cards */}
        <div className="mt-8 space-y-3">

          <div className="rounded-xl border border-green-500/20 bg-white/5 p-4 flex items-center">
            <span className="text-green-400 text-xl mr-3">✅</span>
            <span className="text-white">
              AI Auto Reply Enabled
            </span>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-white/5 p-4 flex items-center">
            <span className="text-green-400 text-xl mr-3">✅</span>
            <span className="text-white">
              Smart Conversations Activated
            </span>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-white/5 p-4 flex items-center">
            <span className="text-green-400 text-xl mr-3">✅</span>
            <span className="text-white">
              Dashboard Connected
            </span>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-white/5 p-4 flex items-center">
            <span className="text-green-400 text-xl mr-3">✅</span>
            <span className="text-white">
              Ready to Receive Messages
            </span>
          </div>

        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 py-4 text-lg font-bold text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
        >
          Close
        </button>

      </div>
    </div>
  );
}