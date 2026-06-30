"use client";

import { useEffect, useState } from "react";

export default function InstallPopup() {
  const [prompt, setPrompt] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);

      if (!localStorage.getItem("sodah-install-popup")) {
        setTimeout(() => setOpen(true), 5000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;

    prompt.prompt();
    await prompt.userChoice;

    localStorage.setItem("sodah-install-popup", "yes");
    setOpen(false);
  };

  const later = () => {
    localStorage.setItem("sodah-install-popup", "yes");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[420px] rounded-2xl bg-white p-8 shadow-xl">

        <h2 className="text-2xl font-bold">
          Install Sodah
        </h2>

        <p className="mt-4 text-gray-600">
          Install Sodah for a faster, full-screen experience with one-click access from your desktop or phone.
        </p>

        <div className="mt-8 flex gap-4">

          <button
            onClick={install}
            className="flex-1 rounded-xl bg-[#0B1F1A] py-3 text-white"
          >
            Install
          </button>

          <button
            onClick={later}
            className="flex-1 rounded-xl border py-3"
          >
            Maybe Later
          </button>

        </div>
      </div>
    </div>
  );
}