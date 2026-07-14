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
  installApp: () => void;
  canInstall: boolean;
};

const InstallContext =
  createContext<InstallContextType>({
    installApp: () => {},
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
      // Firefox fallback
      const isFirefox =
        navigator.userAgent
          .toLowerCase()
          .includes("firefox");

      if (
        !deferredPrompt
      ) {
        if (isFirefox) {
          alert(
            "Firefox does not support automatic installation.\n\nUse:\nMenu → Install"
          );

          return;
        }

        alert(
          "Install prompt is not ready yet."
        );

        return;
      }

      try {
        await deferredPrompt.prompt();

        const choice =
          await deferredPrompt.userChoice;

        console.log(
          choice
        );

        setDeferredPrompt(
          null
        );

        setCanInstall(
          false
        );
      } catch (err) {
        console.log(err);
      }
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