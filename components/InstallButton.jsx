"use client";

import { useEffect, useState } from "react";

export default function InstallButton() {
  const [promptEvent, setPromptEvent] =
    useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );
    };
  }, []);

  const install = async () => {
    if (!promptEvent) {
      alert(
        "Installation is not available yet."
      );
      return;
    }

    promptEvent.prompt();

    await promptEvent.userChoice;
  };

  return (
    <button
      onClick={install}
      className="
        rounded-full
        bg-green-500
        px-4
        py-2
        text-white
        text-sm
        font-semibold
        hover:bg-green-600
        transition
      "
    >
      📲 Download
    </button>
  );
}