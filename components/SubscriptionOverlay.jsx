"use client";

export default function SubscriptionOverlay({
  onUpgrade,
  onLogout,
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-[#111827] border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-red-600 py-5 text-center">

          <div className="text-5xl mb-2">
            ⚠️
          </div>

          <h1 className="text-3xl font-black text-white">
            Subscription Expired
          </h1>

        </div>

        {/* Body */}

        <div className="p-8">

          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
            alt="Sodah"
            className="w-20 h-20 mx-auto rounded-2xl mb-6"
          />

          <p className="text-gray-300 text-center leading-7">

            Your Sodah.io subscription has expired.

            <br /><br />

            AI Auto Reply has been paused.

            WhatsApp Automation has been disabled.

            Dashboard synchronization has stopped.

            <br /><br />

            Renew your subscription to restore all services instantly.

          </p>

          {/* Status */}

          <div className="mt-8 space-y-3">

            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <span>❌</span>
              <span className="text-gray-200">
                AI Auto Reply Disabled
              </span>
            </div>

            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <span>❌</span>
              <span className="text-gray-200">
                WhatsApp Automation Disabled
              </span>
            </div>

            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <span>❌</span>
              <span className="text-gray-200">
                Dashboard Sync Paused
              </span>
            </div>

          </div>

          {/* Buttons */}

          <button
            onClick={onUpgrade}
            className="w-full mt-8 py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-black font-bold text-lg transition"
          >
            Upgrade Subscription
          </button>

          <button
            onClick={onLogout}
            className="w-full mt-3 py-4 rounded-2xl border border-white/10 text-gray-300 hover:bg-white/5"
          >
            Logout
          </button>

        </div>

      </div>

    </div>
  );
}