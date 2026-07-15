"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface BeforeInstallPromptEvent
  extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome: string;
    platform: string;
  }>;
}

type InstallContextType = {
  installApp: () => Promise<void>;
  canInstall: boolean;
};

const InstallContext =
  createContext<InstallContextType>({
    installApp: async () => {},
    canInstall: false,
  });

export function InstallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    deferredPrompt,
    setDeferredPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    );

  const [
    canInstall,
    setCanInstall,
  ] = useState(false);

  useEffect(() => {
    const installed =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      (window.navigator as any)
        .standalone;

    if (installed) {
      setCanInstall(false);

      return;
    }

    const handler = (
      e: Event
    ) => {
      e.preventDefault();

      const installEvent =
        e as BeforeInstallPromptEvent;

      console.log(
        "INSTALL AVAILABLE"
      );

      setDeferredPrompt(
        installEvent
      );

      setCanInstall(true);
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

  const installApp =
    async () => {
      const ua =
        navigator.userAgent.toLowerCase();

      console.log(
        "USER AGENT:",
        ua
      );

      const isIOS =
        /iphone|ipad|ipod/i.test(
          ua
        );

      const isAndroid =
        /android/i.test(
          ua
        );

      const isFirefox =
        ua.includes(
          "firefox"
        ) &&
        !ua.includes(
          "chrome"
        );

      const isSafari =
        /^((?!chrome|android).)*safari/i.test(
          ua
        );

      const isFacebook =
        ua.includes(
          "fban"
        ) ||
        ua.includes(
          "fbav"
        ) ||
        ua.includes(
          "facebook"
        );

      const isInstagram =
        ua.includes(
          "instagram"
        );

      const isTikTok =
        ua.includes(
          "tiktok"
        );

      const isWhatsApp =
        ua.includes(
          "whatsapp"
        );

      const isTelegram =
        ua.includes(
          "telegram"
        );

      const isLinkedIn =
        ua.includes(
          "linkedin"
        );

      const isInAppBrowser =
        isFacebook ||
        isInstagram ||
        isTikTok ||
        isWhatsApp ||
        isTelegram ||
        isLinkedIn;

      // -----------------------------
      // Opened inside app browser
      // -----------------------------
      if (
        isInAppBrowser
      ) {
        let message =
          "To install Sodah, first open this page in your phone browser.\n\n";

        if (isIOS) {
          message +=
            "Tap ⋯ or Share button\nThen select:\nOpen in Safari";
        } else {
          message +=
            "Tap ⋯ menu\nThen select:\nOpen in Browser or Chrome";
        }

        alert(
          message
        );

        return;
      }

      // -----------------------------
      // Native install prompt
      // -----------------------------
      if (
        deferredPrompt
      ) {
        try {
          await deferredPrompt.prompt();

          const choice =
            await deferredPrompt.userChoice;

          console.log(
            "INSTALL RESULT",
            choice
          );

          if (
            choice.outcome ===
            "accepted"
          ) {
            localStorage.setItem(
              "sodah-installed",
              "true"
            );

            localStorage.setItem(
              "sodah-install-popup",
              "true"
            );

            setCanInstall(
              false
            );
          }

          setDeferredPrompt(
            null
          );

          return;
        } catch (err) {
          console.log(
            err
          );
        }
      }

      // -----------------------------
      // Firefox
      // -----------------------------
      if (isFirefox) {
        alert(
          "Firefox does not support automatic installation.\n\nTap ☰ Menu\nThen choose:\nInstall"
        );

        return;
      }

      // -----------------------------
      // iPhone Safari
      // -----------------------------
      if (
        isIOS &&
        isSafari
      ) {
        alert(
          "To install Sodah:\n\n1. Tap Share ⬆️\n2. Scroll down\n3. Tap 'Add to Home Screen'"
        );

        return;
      }

      // -----------------------------
      // Android fallback
      // -----------------------------
      if (
        isAndroid
      ) {
        alert(
          "To install Sodah:\n\nTap ⋮ Menu\nThen choose:\nInstall App\nor\nAdd to Home Screen"
        );

        return;
      }

      // -----------------------------
      // Desktop fallback
      // -----------------------------
      alert(
        "Installation is not available right now.\n\nTry opening Sodah in Chrome or Edge."
      );
    };

  return (
    <InstallContext.Provider
      value={{
        installApp,
        canInstall,
      }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  return useContext(
    InstallContext
  );
}