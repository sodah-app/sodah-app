"use client";

import { useEffect, useState } from "react";

export default function InstallationButton() {
  const [prompt, setPrompt] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      setOpen(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = async () => {
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
      setOpen(false);
      return;
    }

    alert(
      "Desktop:\nChrome/Edge → ⋮ → Install Sodah.io\n\nAndroid:\n⋮ → Install App\n\niPhone:\nShare → Add to Home Screen"
    );
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 top-1/2 -translate-y-1/2 z-[9999] rounded-full bg-gradient-to-r from-blue-600 to-green-500 px-5 py-3 text-white font-bold shadow-2xl hover:scale-105 transition"
      >
        📲 Install
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">

          <div className="w-[380px] rounded-3xl bg-[#0B1F1A] p-8 text-white shadow-2xl border border-green-500">

            <h2 className="text-3xl font-bold mb-2">
              📲 Install Sodah.io
            </h2>

            <p className="text-gray-300 mb-6">
              Install Sodah.io for a faster experience with notifications,
              offline access and one-click launching.
            </p>

            <button
              onClick={install}
              className="w-full rounded-xl bg-gradient-to-r from-green-400 to-emerald-600 py-3 text-black font-bold hover:scale-105 transition"
            >
              Install Now
            </button>

            <div className="mt-6 text-sm text-gray-400">
              <p>💻 Chrome / Edge → ⋮ → Install App</p>
              <p>📱 Android → ⋮ → Install App</p>
              <p>🍎 iPhone → Share → Add to Home Screen</p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full text-gray-400 hover:text-white"
            >
              Maybe Later
            </button>

          </div>

        </div>
      )}
    </>
  );
}