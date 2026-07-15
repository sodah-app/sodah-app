"use client";

import {
  useEffect,
  useState,
} from "react";

import { useInstall } from "./InstallationButton";

export default function InstallPopup() {
  const { installApp } =
    useInstall();

  const [open, setOpen] =
    useState(false);

  const [isFirefox, setIsFirefox] =
    useState(false);

  const [isIOS, setIsIOS] =
    useState(false);

  const [
    isInAppBrowser,
    setIsInAppBrowser,
  ] = useState(false);

  const [
    browserName,
    setBrowserName,
  ] = useState("");

  // ==========================
  // INITIAL LOAD
  // ==========================
  useEffect(() => {
    const installed =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      (window.navigator as any)
        .standalone;

    if (installed) return;

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
      );

    const facebook =
      ua.includes("fban") ||
      ua.includes("fbav") ||
      ua.includes(
        "facebook"
      );

    const instagram =
      ua.includes(
        "instagram"
      );

    const tiktok =
      ua.includes(
        "tiktok"
      );

    const whatsapp =
      ua.includes(
        "whatsapp"
      );

    const telegram =
      ua.includes(
        "telegram"
      );

    const linkedin =
      ua.includes(
        "linkedin"
      );

    let browser = "";

    if (facebook)
      browser = "Facebook";

    else if (instagram)
      browser = "Instagram";

    else if (tiktok)
      browser = "TikTok";

    else if (whatsapp)
      browser = "WhatsApp";

    else if (telegram)
      browser = "Telegram";

    else if (linkedin)
      browser = "LinkedIn";

    const inApp =
      facebook ||
      instagram ||
      tiktok ||
      whatsapp ||
      telegram ||
      linkedin;

    setIsIOS(ios);

    setIsFirefox(
      firefox
    );

    setIsInAppBrowser(
      inApp
    );

    setBrowserName(
      browser
    );

    if (!dismissed) {
      setTimeout(() => {
        setOpen(true);
      }, 1200);
    }
  }, []);

  // ==========================
  // OPEN FROM BUTTON
  // ==========================
  useEffect(() => {
    const openPopup = () => {
      const installed =
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches ||
        (window.navigator as any)
          .standalone;

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
        max-w-[320px]
        p-6
        text-center
        shadow-[0_25px_80px_rgba(0,0,0,0.45)]
        animate-[popup_.35s_cubic-bezier(0.22,1,0.36,1)]
      "
      >
        {/* CLOSE */}

        <button
          onClick={
            closePopup
          }
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
          smoother app
          experience.
        </p>

        {/* IN APP BROWSER */}

        {isInAppBrowser && (
          <div
            className="
            mt-5
            rounded-2xl
            bg-amber-50
            border
            border-amber-200
            p-4
            text-left
          "
          >
            <p
              className="
              text-amber-800
              text-sm
              font-semibold
            "
            >
              Open in Browser
            </p>

            <p
              className="
              mt-2
              text-xs
              text-amber-700
              leading-6
            "
            >
              You are using{" "}
              <b>
                {browserName}
              </b>{" "}
              browser.

              <br />
              <br />

              Tap the
              browser menu
              (⋯)

              <br />

              Then select:

              <br />

              <b>
                {isIOS
                  ? "Open in Safari"
                  : "Open in Browser / Chrome"}
              </b>

              <br />
              <br />

              Then install
              Sodah.
            </p>
          </div>
        )}

        {/* IOS */}

        {!isInAppBrowser &&
          isIOS && (
            <p
              className="
              mt-5
              text-xs
              text-gray-500
              leading-6
            "
            >
              Tap Share ↗️
              <br />
              Then select
              <br />
              <b>
                Add to Home
                Screen
              </b>
            </p>
          )}

        {/* FIREFOX */}

        {!isInAppBrowser &&
          isFirefox && (
            <p
              className="
              mt-5
              text-xs
              text-gray-500
            "
            >
              Firefox users:
              <br />
              ☰ Menu →
              Install
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
          {isInAppBrowser
            ? "🌐 Open In Browser"
            : isIOS
            ? "📲 Add to Home Screen"
            : "📲 Install App"}
        </button>

        {/* LATER */}

        <button
          onClick={
            closePopup
          }
          className="
          mt-4
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