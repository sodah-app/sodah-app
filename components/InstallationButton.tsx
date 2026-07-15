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
    // Already installed
    const installed =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

    if (installed) {
      console.log(
        "APP ALREADY INSTALLED"
      );

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

      console.log(
        navigator.userAgent
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

      const isFirefox =
        ua.includes(
          "firefox"
        ) &&
        !ua.includes(
          "chrome"
        ) &&
        !ua.includes(
          "edg"
        );

      // Automatic prompt available
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
          }

          setDeferredPrompt(
            null
          );

          setCanInstall(
            false
          );

          return;
        } catch (err) {
          console.log(
            "INSTALL ERROR",
            err
          );
        }
      }

      // Firefox fallback
      if (isFirefox) {
        alert(
          "Firefox does not support automatic installation.\n\nUse:\n☰ Menu → Install"
        );

        return;
      }

      // iPhone / Safari
      const isIOS =
        /iphone|ipad|ipod/i.test(
          ua
        );

      if (isIOS) {
        alert(
          "To install Sodah:\n\nTap Share (⬆)\nThen tap:\nAdd to Home Screen"
        );

        return;
      }

      // Android fallback
      alert(
        "To install Sodah:\n\nOpen browser menu (⋮)\nThen choose:\nAdd to Home Screen\nor\nInstall App"
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