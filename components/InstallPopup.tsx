"use client";

import {
  useEffect,
  useState,
} from "react";

import { useInstall } from "./InstallationButton";

export default function InstallPopup() {
  const {
    installApp,
    canInstall,
  } = useInstall();

  const [open, setOpen] =
    useState(false);

  const [isFirefox, setIsFirefox] =
    useState(false);

  const [isIOS, setIsIOS] =
    useState(false);

  // ==========================
  // INITIAL LOAD
  // ==========================
  useEffect(() => {
    const installed =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

    const dismissed =
      localStorage.getItem(
        "sodah-install-popup"
      );

    const ua =
      navigator.userAgent.toLowerCase();

    const ios =
      /iphone|ipad|ipod/.test(
        ua
      );

    const firefox =
      ua.includes(
        "firefox"
      ) &&
      !ua.includes(
        "chrome"
      ) &&
      !ua.includes(
        "edg"
      );

    setIsIOS(ios);
    setIsFirefox(firefox);

    if (installed) return;

    if (!dismissed) {
      setTimeout(() => {
        setOpen(true);
      }, 1200);
    }
  }, []);

  // ==========================
  // OPEN FROM DOWNLOAD BUTTON
  // ==========================
  useEffect(() => {
    const openPopup = () => {
      const installed =
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches;

      if (installed) return;

      setOpen(true);
    };

    document.addEventListener(
      "open-install-popup",
      openPopup
    );

    return () => {
      document.removeEventListener(
        "open-install-popup",
        openPopup
      );
    };
  }, []);

  // ==========================
  // CLOSE
  // ==========================
  const closePopup = () => {
    localStorage.setItem(
      "sodah-install-popup",
      "true"
    );

    setOpen(false);
  };

  // ==========================
  // INSTALL
  // ==========================
  const handleInstall =
    async () => {
      // iPhone / iPad
      if (isIOS) {
        alert(
          "To install Sodah:\n\n1. Tap the Share button.\n2. Select 'Add to Home Screen'.\n3. Tap Add."
        );

        return;
      }

      // Firefox
      if (isFirefox) {
        alert(
          "Firefox users:\n\n☰ Menu → Install"
        );

        return;
      }

      // Chrome install not ready
      if (!canInstall) {
        alert(
          "Installation is not ready yet.\n\nPlease wait a few seconds and try again."
        );

        return;
      }

      try {
        await installApp();

        localStorage.setItem(
          "sodah-install-popup",
          "true"
        );

        setOpen(false);
      } catch (err) {
        console.log(err);
      }
    };

  if (!open) return null;

  return (
    <div
      className="
      fixed inset-0
      bg-black/65
      backdrop-blur-sm
      flex items-center
      justify-center
      z-[999999]
      px-4
    "
    >
      <div
        className="
        relative
        bg-white
        rounded-[28px]
        w-full
        max-w-[300px]
        p-6
        text-center
        shadow-[0_25px_80px_rgba(0,0,0,0.45)]
        animate-[popup_.35s_cubic-bezier(0.22,1,0.36,1)]
      "
      >
        {/* CLOSE */}

        <button
          onClick={closePopup}
          className="
            absolute
            top-4
            right-4
            text-gray-400
            hover:text-gray-700
            text-lg
            transition
          "
        >
          ✕
        </button>

        {/* ICON */}

        <div className="text-5xl">
          📲
        </div>

        {/* TITLE */}

        <h2
          className="
          mt-3
          text-[32px]
          font-bold
          text-gray-900
        "
        >
          Install Sodah
        </h2>

        {/* DESCRIPTION */}

        <p
          className="
          mt-3
          text-gray-500
          text-sm
          leading-7
        "
        >
          Get faster access,
          notifications and a
          smoother app experience.
        </p>

        {/* IOS */}

        {isIOS && (
          <p
            className="
            mt-4
            text-xs
            text-gray-400
            leading-6
          "
          >
            Tap Share ↗️
            <br />
            Then select
            <br />
            <b>Add to Home Screen</b>
          </p>
        )}

        {/* FIREFOX */}

        {isFirefox && (
          <p
            className="
            mt-4
            text-xs
            text-gray-400
          "
          >
            Firefox users:
            <br />
            ☰ Menu → Install
          </p>
        )}

        {/* BUTTON */}

        <button
          onClick={
            handleInstall
          }
          className="
          mt-6
          w-full
          py-3.5
          rounded-2xl
          bg-gradient-to-r
          from-green-500
          to-emerald-600
          text-white
          font-bold
          text-base
          shadow-lg
          hover:scale-[1.03]
          active:scale-[0.97]
          transition
        "
        >
          {isIOS
            ? "📲 Add to Home Screen"
            : "📲 Install App"}
        </button>

        {/* LATER */}

        <button
          onClick={
            closePopup
          }
          className="
          mt-3
          text-sm
          text-gray-400
          hover:text-gray-700
          transition
        "
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}