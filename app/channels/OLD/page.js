"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import WelcomeCompleteModal from "@/components/WelcomeCompleteModal";
import { getCurrentUser } from "@/lib/currentUser";

const BACKGROUNDS = [
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1920&q=100",
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1920&q=100",
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1920&q=100",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=100",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920&q=100",
  "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?auto=format&fit=crop&w=1920&q=100",
];

const BRAND_LOGOS = {
  whatsapp: "https://cdn.simpleicons.org/whatsapp/25D366",
  gmail: "https://cdn.simpleicons.org/gmail/EA4335",
};

const BRAND_COLORS = {
  whatsapp: {
    primary: "#25D366",
    soft: "rgba(37,211,102,0.11)",
    border: "rgba(37,211,102,0.30)",
    glow: "rgba(37,211,102,0.25)",
  },
  gmail: {
    primary: "#EA4335",
    soft: "rgba(234,67,53,0.11)",
    border: "rgba(234,67,53,0.30)",
    glow: "rgba(234,67,53,0.25)",
  },
};

const SUPPORT_URL = "/system-support";

export default function WelcomePage() {
  const router = useRouter();

  const [showSuccess, setShowSuccess] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showWhySodah, setShowWhySodah] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAccountEmail, setGmailAccountEmail] = useState("");

  const [whatsappStatusLoading, setWhatsappStatusLoading] = useState(true);
  const [gmailStatusLoading, setGmailStatusLoading] = useState(true);

  // Protected sending features require an active Premier subscription.
  // The cards remain visible; access is checked when the feature is opened.
  const [isPremier, setIsPremier] = useState(false);
  const [subscriptionStatusLoading, setSubscriptionStatusLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [idleMode, setIdleMode] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const idleTimer = useRef(null);

  const [user, setUser] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessId: "",
    businessName: "",
  });

  /* =========================================================
     ADMIN NOTIFICATIONS

     Only notifications created by the Sodah admin dashboard are
     displayed here. There is no message-entry area for businesses.

     Types:
       - maintenance: controlled by admin, cannot be closed by user
       - general: controlled by admin, cannot be closed by user
       - personal: business-specific and user-dismissible

     Maintenance/general disappear when the admin removes/expires
     them. Personal can also be closed locally by the user.
  ========================================================== */
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminNotificationsLoading, setAdminNotificationsLoading] = useState(true);
  const [dismissedPersonalNotifications, setDismissedPersonalNotifications] = useState(() => new Set());

  /*
   * GLOBAL ADMIN SETTINGS
   *
   * Maintenance mode and the notification switch are controlled from
   * the Admin Settings page and stored in the settings table.
   */
  const [adminSettings, setAdminSettings] = useState({
    maintenance_mode: false,
    notifications: false,
    maintenance_message:
      "We are currently performing scheduled maintenance. Some services may be temporarily unavailable. Please check back shortly.",
    notification_message:
      "We have an important update for you. Please check this message for the latest information.",
  });
  const [adminSettingsLoading, setAdminSettingsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreen();

    window.addEventListener("resize", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((previous) => (previous + 1) % BACKGROUNDS.length);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  /* =========================================================
     ACTIVE BUSINESS ID

     The business is already resolved by the authenticated
     Sodah account. From this page onward, every channel
     connection must carry that same business identity.

     Priority:
       1. businessId in the current URL
       2. authenticated user's businessId
       3. previously stored business_id
  ========================================================== */

  const getActiveBusinessId = () => {
    const urlBusinessId =
      new URLSearchParams(window.location.search)
        .get("businessId")
        ?.trim();




    if (urlBusinessId) {
      return urlBusinessId;
    }

    const userBusinessId =
      user.businessId?.trim();

    if (userBusinessId) {
      return userBusinessId;
    }

    try {
      const storedBusinessId =
        localStorage.getItem("business_id")?.trim();

      if (storedBusinessId) {
        return storedBusinessId;
      }
    } catch (error) {
      console.error(
        "[Business Context] Failed to read business_id:",
        error
      );
    }

    return "";
  };

  /* =========================================================
     REFRESH SUBSCRIPTION / PREMIER ACCESS

     Gmail and WhatsApp Campaign stay visible on the Welcome page.
     Premier is the access gate for using those sending features.
     ========================================================== */
  const loadSubscriptionStatus = useCallback(async () => {
    try {
      const auth = await getCurrentUser();

      if (!auth?.authenticated || !auth?.business?.business_id) {
        setIsPremier(false);
        return;
      }

      const businessId = String(auth.business.business_id).trim();

      const { data: business, error } = await supabase
        .from("businesses")
        .select("business_id, plan, subscription, plan_expiry")
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const plan = String(
        business?.plan || business?.subscription || ""
      ).trim().toLowerCase();

      const expiryRaw = business?.plan_expiry;
      const expiryTime = expiryRaw
        ? new Date(expiryRaw).getTime()
        : NaN;

      const activeSubscription =
        !Number.isFinite(expiryTime) ||
        expiryTime >= Date.now();

      const premier =
        activeSubscription &&
        (plan === "premier" ||
          plan === "premium" ||
          plan.includes("premier") ||
          plan.includes("premium"));

      console.log("[Subscription Status] Active business:", businessId);
      console.log("[Subscription Status] Plan:", plan);
      console.log("[Subscription Status] Premier access:", premier);

      setIsPremier(premier);
    } catch (error) {
      console.error(
        "[Subscription Status] Failed to load subscription status:",
        error
      );
      setIsPremier(false);
    } finally {
      setSubscriptionStatusLoading(false);
    }
  }, []);

  /* =========================================================
     FEATURE NAVIGATION

     The Welcome page is a discovery page. Users can open Gmail and
     WhatsApp Campaign freely so they can see the complete features.
     Subscription / sending eligibility is enforced inside the actual
     sending workflows, not on this page.
  ========================================================== */

  const openWhatsAppCampaign = () => {
    navigateWithBusinessId("/whatsapp-campaign");
  };

  const openEmailSender = () => {
    navigateWithBusinessId("/email-ai");
  };

  /* =========================================================
     REFRESH WHATSAPP CONNECTION STATUS

     WhatsApp is the primary and only customer channel currently
     managed from this workspace. The active business ID is used
     to resolve the connection state from the businesses table.
  ========================================================== */

  const loadWhatsAppStatus = useCallback(async () => {
    try {
      const auth = await getCurrentUser();

      if (!auth?.authenticated || !auth?.business?.business_id) {
        throw new Error(
          "Unable to determine the active Sodah business."
        );
      }

      const businessId = auth.business.business_id;

      const { data: business, error: businessError } =
        await supabase
          .from("businesses")
          .select("business_id, whatsapp_connected, whatsappConnected")
          .eq("business_id", businessId)
          .maybeSingle();

      if (businessError) {
        throw new Error(
          businessError.message ||
            "Unable to find the active business."
        );
      }

      if (!business) {
        throw new Error(
          "Unable to determine the active Sodah business."
        );
      }

      const connected =
        business?.whatsapp_connected === true ||
        business?.whatsappConnected === true;

      console.log("[WhatsApp Status] Active business:", businessId);
      console.log("[WhatsApp Status] Connected:", connected);

      setWhatsappConnected(connected);
    } catch (error) {
      console.error(
        "[WhatsApp Status] Failed to load WhatsApp status:",
        error
      );
      setWhatsappConnected(false);
    } finally {
      setWhatsappStatusLoading(false);
    }
  }, []);

  /* =========================================================
     REFRESH GMAIL CONNECTION STATUS

     Gmail uses the same connected account already used by Email AI.
     We only expose the Gmail primary-channel card as active after the
     account endpoint confirms that a Gmail account exists.
  ========================================================== */

  const loadGmailStatus = useCallback(async () => {
    try {
      setGmailStatusLoading(true);

      /*
       * Gmail connection status is resolved server-side from the SAME
       * account source used by Email AI and Inbox.
       *
       * Do not query the Gmail tables directly from the browser.
       * Do not rely on the browser's business_id to decide whether Gmail
       * is connected. The authenticated server session is the source of truth.
       */
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message ||
            "Unable to verify the Gmail connection."
        );
      }

      const accessToken =
        sessionData?.session?.access_token ||
        "";

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "/api/inbox-email-ai/connection-status",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data =
        await response.json().catch(() => null);

      if (!response.ok || data?.success !== true) {
        console.error(
          "[Gmail Status] Connection-status endpoint failed:",
          {
            status: response.status,
            data,
          }
        );

        setGmailConnected(false);
        setGmailAccountEmail("");
        return;
      }

      const account =
        data?.account || null;

      const connectedEmail = String(
        account?.gmail_email ||
          account?.email ||
          account?.google_email ||
          account?.googleEmail ||
          account?.account_email ||
          account?.accountEmail ||
          data?.gmail ||
          ""
      ).trim();

      const connected =
        data?.connected === true ||
        Boolean(account);

      console.log(
        "[Gmail Status] Active business:",
        data?.business_id ||
          getActiveBusinessId() ||
          null
      );
      console.log(
        "[Gmail Status] Connected:",
        connected
      );
      console.log(
        "[Gmail Status] Connected account:",
        connectedEmail || "Unavailable"
      );

      setGmailConnected(connected);
      setGmailAccountEmail(
        connected ? connectedEmail : ""
      );
    } catch (error) {
      console.error(
        "[Gmail Status] Failed to load Gmail status:",
        error
      );

      setGmailConnected(false);
      setGmailAccountEmail("");
    } finally {
      setGmailStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeChannelStatuses = async () => {
      if (!cancelled) {
        await Promise.all([
          loadWhatsAppStatus(),
          loadGmailStatus(),
          loadSubscriptionStatus(),
        ]);
      }
    };

    initializeChannelStatuses();

    const params = new URLSearchParams(
      window.location.search
    );

    if (params.get("connected") === "true") {
      setShowSuccess(true);

      const timer = window.setTimeout(() => {
        loadWhatsAppStatus();
        loadGmailStatus();
        loadSubscriptionStatus();
      }, 700);

      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [loadWhatsAppStatus, loadGmailStatus, loadSubscriptionStatus]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      const time = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const date = now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      setCurrentTime(`${time} • ${date}`);
    };

    updateClock();

    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const resetIdleTimer = () => {
      setIdleMode(false);

      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }

      idleTimer.current = setTimeout(() => {
        setIdleMode(true);
      }, 60000);
    };

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("keydown", resetIdleTimer);
    window.addEventListener("click", resetIdleTimer);
    window.addEventListener("touchstart", resetIdleTimer);

    resetIdleTimer();

    return () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }

      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      window.removeEventListener("click", resetIdleTimer);
      window.removeEventListener("touchstart", resetIdleTimer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const auth = await getCurrentUser();

        if (!mounted) {
          return;
        }

        if (!auth.authenticated) {
          router.push("/");
          return;
        }

        setIsSuperAdmin(Boolean(auth.isSuperAdmin));

        setUser({
          fullName:
            auth.profile?.fullName ||
            auth.profile?.email?.split("@")[0] ||
            "User",

          email: auth.profile?.email || "",

          phone: auth.profile?.phone || "",

          businessId: auth.business?.business_id || "",

          businessName: auth.business?.business_name || "",
        });
      } catch (error) {
        console.error("Failed to load user:", error);
        router.push("/");
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);
  const loadAdminNotifications = useCallback(async () => {
    try {
      setAdminNotificationsLoading(true);
      setAdminSettingsLoading(true);

      const auth = await getCurrentUser();

      if (!auth?.authenticated) {
        setAdminNotifications([]);
        return;
      }

      /*
       * =========================================================
       * GLOBAL PLATFORM SETTINGS
       *
       * These settings are controlled by the SODAH ADMIN PLATFORM.
       *
       * The USER PLATFORM only reads them.
       *
       * Admin Platform
       *       ↓
       * Supabase settings table
       *       ↓
       * /api/platform-settings
       *       ↓
       * User Platform
       *
       * Maintenance mode is therefore completely independent
       * from business-specific personal notifications.
       * =========================================================
       */

      try {
        const {
          data: {
            session,
          },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "[Platform Settings] Failed to get user session:",
            sessionError
          );
        }

        const headers = {};

        /*
         * Send the authenticated Supabase access token.
         *
         * This allows the server-side platform-settings route
         * to verify the currently logged-in business user.
         */
        if (session?.access_token) {
          headers.Authorization =
            `Bearer ${session.access_token}`;
        }

        const response = await fetch(
          "/api/platform-settings",
          {
            method: "GET",
            credentials: "include",
            headers,
            cache: "no-store",
          }
        );

        const result =
          await response.json().catch(
            () => null
          );

        console.log(
          "[Platform Settings] Response:",
          result
        );

        if (!response.ok) {
          console.error(
            "[Platform Settings] Failed to load:",
            result
          );
        } else if (
          result?.success &&
          result?.settings
        ) {
          setAdminSettings({
            maintenance_mode: Boolean(
              result.settings.maintenance_mode
            ),

            notifications: Boolean(
              result.settings.notifications
            ),

            maintenance_message:
              result.settings.maintenance_message ||
              "We are currently performing scheduled maintenance. Some services may be temporarily unavailable. Please check back shortly.",

            notification_message:
              result.settings.notification_message ||
              "We have an important update for you. Please check this message for the latest information.",
          });
        }
      } catch (platformSettingsError) {
        console.error(
          "[Platform Settings] Request failed:",
          platformSettingsError
        );
      }

      /*
       * =========================================================
       * BUSINESS-SPECIFIC PERSONAL MESSAGES
       *
       * These are separate from global maintenance mode.
       * =========================================================
       */

      const businessId =
        auth?.business?.business_id;

      if (!businessId) {
        setAdminNotifications([]);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("business_notifications")
        .select(
          "id, business_id, title, message, type, is_read, created_at, expires_at"
        )
        .eq("business_id", businessId)
        .eq("type", "personal")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const now = Date.now();

      const active = (data || []).filter(
        (notification) => {
          if (
            !notification?.id ||
            notification?.type !== "personal"
          ) {
            return false;
          }

          if (notification.expires_at) {
            const expiresAt =
              new Date(
                notification.expires_at
              ).getTime();

            if (
              Number.isFinite(expiresAt) &&
              expiresAt <= now
            ) {
              return false;
            }
          }

          return true;
        }
      );

      setAdminNotifications(active);
    } catch (error) {
      console.error(
        "[Admin Notifications] Failed to load:",
        error
      );

      /*
       * Do NOT reset adminSettings here.
       *
       * A personal-notification failure must never
       * disable global maintenance mode.
       */
      setAdminNotifications([]);
    } finally {
      setAdminNotificationsLoading(false);
      setAdminSettingsLoading(false);
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    let settingsChannel = null;
    let notificationsChannel = null;

    const setupAdminRealtime = async () => {
      const auth = await getCurrentUser();
      const businessId = auth?.business?.business_id;

      if (!mounted || !auth?.authenticated) {
        if (mounted) {
          setAdminSettingsLoading(false);
          setAdminNotificationsLoading(false);
        }
        return;
      }

      await loadAdminNotifications();

      if (!mounted) return;

      /*
       * GLOBAL SETTINGS REALTIME
       *
       * Admin changes on the Settings page are pushed to the app
       * immediately. No browser refresh is required.
       */
      settingsChannel = supabase
        .channel("sodah-platform-settings-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "settings",
          },
          (payload) => {
            const settings = payload?.new;
            if (!settings) return;

            setAdminSettings({
              maintenance_mode: Boolean(
                settings.maintenance_mode
              ),
              notifications: Boolean(
                settings.notifications
              ),
              maintenance_message:
                settings.maintenance_message ||
                "We are currently performing scheduled maintenance. Some services may be temporarily unavailable. Please check back shortly.",
              notification_message:
                settings.notification_message ||
                "We have an important update for you. Please check this message for the latest information.",
            });
          }
        )
        .subscribe();

      /* PERSONAL MESSAGE REALTIME */
      if (businessId) {
        notificationsChannel = supabase
          .channel(
            `business-personal-notifications-${businessId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "business_notifications",
              filter: `business_id=eq.${businessId}`,
            },
            (payload) => {
              const type =
                payload?.new?.type ||
                payload?.old?.type;

              if (type !== "personal") return;

              if (payload.eventType === "DELETE") {
                setAdminNotifications((current) =>
                  current.filter(
                    (item) =>
                      item.id !== payload.old?.id
                  )
                );

                setDismissedPersonalNotifications(
                  (current) => {
                    const next = new Set(current);
                    next.delete(payload.old?.id);
                    return next;
                  }
                );

                return;
              }

              const notification = payload.new;
              if (!notification?.id) return;

              if (notification.expires_at) {
                const expiresAt = new Date(
                  notification.expires_at
                ).getTime();

                if (
                  Number.isFinite(expiresAt) &&
                  expiresAt <= Date.now()
                ) {
                  setAdminNotifications((current) =>
                    current.filter(
                      (item) =>
                        item.id !== notification.id
                    )
                  );
                  return;
                }
              }

              setAdminNotifications((current) => {
                const withoutCurrent = current.filter(
                  (item) =>
                    item.id !== notification.id
                );

                return [
                  notification,
                  ...withoutCurrent,
                ].sort(
                  (a, b) =>
                    new Date(
                      b.created_at || 0
                    ).getTime() -
                    new Date(
                      a.created_at || 0
                    ).getTime()
                );
              });
            }
          )
          .subscribe();
      }
    };

    setupAdminRealtime();

    return () => {
      mounted = false;

      if (settingsChannel) {
        supabase.removeChannel(settingsChannel);
      }

      if (notificationsChannel) {
        supabase.removeChannel(
          notificationsChannel
        );
      }
    };
  }, [loadAdminNotifications]);
  /*
   * Open the AI support assistant.
   */
  const openSupport = () => {
    setShowSupport(true);
    setShowMobileMenu(false);
    setShowUserMenu(false);
  };

  const startAutomationSetup = () => {
    const businessId = getActiveBusinessId();

    if (!businessId) {
      console.error(
        "[WhatsApp] Missing businessId. Cannot start setup."
      );
      return;
    }

    const target = isMobile
      ? "/mobile/automation"
      : "/connect-whatsapp/load";

    router.push(
      `${target}?businessId=${encodeURIComponent(
        businessId
      )}`
    );
  };

  const navigate = (path) => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
    router.push(path);
  };

  const navigateWithBusinessId = (path) => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
    const businessId = getActiveBusinessId();
    if (!businessId) {
      console.error("[Business Context] Missing businessId. Cannot navigate to:", path);
      return;
    }
    const url = new URL(path, window.location.origin);
    url.searchParams.set("businessId", businessId);
    router.push(`${url.pathname}${url.search}${url.hash}`);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Logout cleanup failed:", error);
    }

    setShowUserMenu(false);
    router.push("/");
  };

  const showDesktopOnly = (pageName) => {
    alert(`${pageName} is only available on Desktop or Laptop.`);
  };

  if (idleMode) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-[#020806] text-white">
        {BACKGROUNDS.map((background, index) => (
          <div
            key={background}
            className={
              "absolute inset-0 bg-cover bg-center transition-opacity duration-[4000ms] " +
              (index === bgIndex
                ? "scale-110 opacity-100"
                : "scale-100 opacity-0")
            }
            style={{
              backgroundImage: `url(${background})`,
              animation: "zoomAnimation 18s linear infinite",
            }}
          />
        ))}

        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(37,211,102,0.16),transparent_40%)]" />

        <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 text-center">
          <SodahBrand size="idle" centered />

          <p className="mt-6 text-lg font-medium text-gray-300 md:text-xl">
            AI Automation Platform
          </p>

          <p className="mt-2 text-sm text-gray-500">
            WhatsApp
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2">
          <div className="rounded-full border border-green-400/10 bg-black/45 px-8 py-4 shadow-2xl backdrop-blur-xl">
            <p className="text-sm font-semibold text-gray-200 md:text-lg">
              {currentTime}
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes zoomAnimation {
            0% {
              transform: scale(1);
            }

            100% {
              transform: scale(1.12);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020806] text-white">
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      <div className="fixed inset-0 -z-50 overflow-hidden bg-[#020806]">
        {BACKGROUNDS.map((background, index) => (
          <div
            key={background}
            className={
              "absolute inset-0 bg-cover bg-center transition-opacity duration-[2500ms] " +
              (index === bgIndex ? "opacity-[0.18]" : "opacity-0")
            }
            style={{
              backgroundImage: `url(${background})`,
            }}
          />
        ))}

        <div className="absolute inset-0 bg-[#020806]/90" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(37,211,102,0.14),transparent_28%),radial-gradient(circle_at_90%_15%,rgba(0,229,255,0.10),transparent_25%),radial-gradient(circle_at_50%_90%,rgba(34,197,94,0.08),transparent_35%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,12,7,0.72))]" />
      </div>

      {/* =========================================================
          FIXED TOP BAR
      ========================================================== */}

      <header className="fixed left-0 right-0 top-0 z-[100] border-b border-green-400/10 bg-[#020906]/80 shadow-[0_12px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1800px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* LOGO */}

          <button
            type="button"
            onClick={() => navigateWithBusinessId("/welcome")}
            className="group flex shrink-0 items-center gap-2.5 rounded-2xl px-2 py-1.5 transition hover:bg-white/[0.05]"
          >
            <SodahMark className="h-9 w-9 transition group-hover:scale-105" />

            <div className="hidden text-left sm:block">
              <p className="text-lg font-black leading-none tracking-tight">
                Sodah<span className="text-cyan-400">.io</span>
              </p>

              <p className="mt-1 text-[8px] font-bold uppercase tracking-[2px] text-green-400/70">
                AI Automation
              </p>
            </div>
          </button>

          {/* CONNECTED CHANNELS / WEBSITE */}
          <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.025] px-2.5 py-1.5 lg:flex">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#25D366]/20 bg-[#25D366]/[0.06]"
              title="WhatsApp"
            >
              <img
                src={BRAND_LOGOS.whatsapp}
                alt="WhatsApp"
                className="h-4 w-4 object-contain"
              />
            </div>

            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/[0.05]"
              title={gmailAccountEmail || "Gmail"}
            >
              <img
                src={BRAND_LOGOS.gmail}
                alt="Gmail"
                className="h-4 w-4 object-contain"
              />
            </div>

            <span className="ml-1 text-[10px] font-black tracking-[1.5px] text-gray-500">
              SODAH.IO
            </span>
          </div>

          {/* DESKTOP NAVIGATION */}

          <nav className="ml-2 hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            <TopBarButton
              icon="💬"
              label="Connect WhatsApp"
              onClick={startAutomationSetup}
            />

            <TopBarButton
              icon="✦"
              label="Why Sodah.io"
              onClick={() => setShowWhySodah(true)}
            />

            <TopBarButton
              icon="◎"
              label="About Us"
              onClick={() => setShowAbout(true)}
            />

            <TopBarButton
              icon="🤖"
              label="Help & Support"
              onClick={openSupport}
            />
          </nav>

          {/* RIGHT SIDE */}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigateWithBusinessId("/subscription")}
              className="hidden items-center gap-2 rounded-xl border border-purple-400/20 bg-purple-500/[0.08] px-3 py-2 text-xs font-bold text-purple-200 transition hover:border-purple-400/40 hover:bg-purple-500/[0.15] md:flex"
            >
              <span>💎</span>
              <span>Subscription</span>

              <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-1.5 py-0.5 text-[8px] text-purple-300">
                PRO
              </span>
            </button>

            <button
              type="button"
              onClick={openEmailSender}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition hover:bg-white/[0.09] hover:text-white sm:flex"
              title="Email sender"
            >
              📨
            </button>

            {/* USER */}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu((value) => !value)}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-1.5 pr-2 transition hover:border-green-400/20 hover:bg-white/[0.08]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 font-black text-black shadow-[0_0_18px_rgba(37,211,102,0.18)]">
                  {user.fullName
                    ? user.fullName.charAt(0).toUpperCase()
                    : "U"}
                </div>

                <div className="hidden max-w-[120px] text-left xl:block">
                  <p className="truncate text-xs font-bold text-white">
                    {user.fullName || "User"}
                  </p>

                  <p className="truncate text-[9px] text-gray-500">
                    {user.email || "Account"}
                  </p>
                </div>

                <span className="hidden text-xs text-gray-500 xl:block">
                  ▾
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-[52px] w-64 overflow-hidden rounded-2xl border border-green-400/10 bg-[#07100c]/95 p-2 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                  <div className="border-b border-white/10 px-3 py-3">
                    <p className="text-sm font-bold">
                      {user.fullName || "User"}
                    </p>

                    <p className="mt-1 truncate text-xs text-gray-500">
                      {user.email || "Account"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>👤</span>
                    <span>Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateWithBusinessId("/settings")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span>⚙</span>
                    <span>Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateWithBusinessId("/subscription")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-purple-300 transition hover:bg-purple-500/10"
                  >
                    <span>💎</span>
                    <span>Subscription</span>

                    <span className="ml-auto text-[8px] font-bold">
                      PRO
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    <span>↪</span>
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>

            {/* MOBILE MENU */}

            <button
              type="button"
              onClick={() => setShowMobileMenu((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-gray-300 lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE NAV */}

        {showMobileMenu && (
          <div className="border-t border-white/10 bg-[#030b07]/95 px-4 py-3 shadow-2xl backdrop-blur-2xl lg:hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MobileTopButton
                icon="💬"
                label="Connect WhatsApp"
                onClick={startAutomationSetup}
              />

              <MobileTopButton
                icon="✦"
                label="Why Sodah.io"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowWhySodah(true);
                }}
              />

              <MobileTopButton
                icon="◎"
                label="About Us"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowAbout(true);
                }}
              />

              <MobileTopButton
                icon="🤖"
                label="Help & Support"
                onClick={openSupport}
              />

              <MobileTopButton
                icon="💎"
                label="Subscription"
                onClick={() => navigateWithBusinessId("/subscription")}
              />

              <MobileTopButton
                icon="📨"
                label="Email Sender"
                onClick={openEmailSender}
              />

              <MobileTopButton
                icon="↪"
                label="Logout"
                danger
                onClick={handleLogout}
              />
            </div>
          </div>
        )}
      </header>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}

      <main className="relative min-h-screen px-4 pb-28 pt-[94px] sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-[1800px]">

          {/* HEADER */}

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[4px] text-green-400">
                Command Center
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl xl:text-5xl">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-green-300 via-green-400 to-cyan-400 bg-clip-text text-transparent">
                  {user.fullName || "User"}
                </span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                One intelligent workspace for conversations, customers,
                channels, campaigns and AI-powered business automation.
              </p>
            </div>

            <div className="hidden rounded-2xl border border-green-400/10 bg-black/20 px-4 py-3 text-right backdrop-blur-xl md:block">
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-gray-600">
                Workspace
              </p>

              <p className="mt-1 text-sm font-semibold text-green-300">
                {user.businessName || "Your Business"}
              </p>
            </div>
          </div>

          {/* =====================================================
              HERO
          ====================================================== */}

          <section className="relative mb-6 overflow-hidden rounded-[32px] border border-green-400/10 bg-[#06110b]/75 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-8 xl:p-10">
            <div className="pointer-events-none absolute -right-40 -top-40 h-[460px] w-[460px] rounded-full bg-green-400/[0.08] blur-3xl" />

            <div className="pointer-events-none absolute -bottom-40 -left-40 h-[460px] w-[460px] rounded-full bg-cyan-400/[0.06] blur-3xl" />

            <div className="relative grid items-center gap-8 md:grid-cols-[1.05fr_0.95fr] xl:gap-12">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/[0.07] px-3 py-1.5 text-[9px] font-black tracking-[1.8px] text-green-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#25D366] shadow-[0_0_12px_#25D366]" />
                  AI AUTOMATION PLATFORM
                </div>

                <h2 className="text-4xl font-black leading-[1.02] tracking-tight md:text-5xl xl:text-6xl">
                  Build smarter.
                  <br />

                  <span className="bg-gradient-to-r from-green-300 via-green-400 to-cyan-400 bg-clip-text text-transparent">
                    Automate more.
                  </span>

                  <br />

                  Grow faster.
                </h2>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-300 md:text-base">
                  Connect your customer channels, capture leads, automate
                  conversations and let AI handle repetitive work while you
                  focus on growing your business.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={startAutomationSetup}
                    className="group inline-flex items-center gap-3 rounded-2xl bg-[#25D366] px-5 py-3 font-black text-[#031109] shadow-[0_0_35px_rgba(37,211,102,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_50px_rgba(37,211,102,0.35)]"
                  >
                    <img
                      src={BRAND_LOGOS.whatsapp}
                      alt="WhatsApp"
                      className="h-6 w-6 object-contain"
                    />

                    <span>Connect WhatsApp</span>

                    <span className="text-lg transition group-hover:translate-x-1">
                      →
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openEmailSender}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/[0.05] px-5 py-3 font-semibold text-white backdrop-blur-xl transition hover:border-red-400/35 hover:bg-red-400/[0.09]"
                  >
                    <img
                      src={BRAND_LOGOS.gmail}
                      alt="Gmail"
                      className="h-5 w-5 object-contain"
                    />
                    <span>Connect Gmail</span>
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={openWhatsAppCampaign}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/[0.06] px-5 py-3 font-semibold text-white backdrop-blur-xl transition hover:border-[#25D366]/40 hover:bg-[#25D366]/[0.12]"
                  >
                    <img
                      src={BRAND_LOGOS.whatsapp}
                      alt="WhatsApp"
                      className="h-5 w-5 object-contain"
                    />
                    <span>Launch Campaign</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-center md:justify-end">
                <SodahHeroBrand />
              </div>
            </div>
          </section>

          {/* =====================================================
              STATS
          ====================================================== */}

          <section className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard
              icon="👥"
              value="10K+"
              label="Businesses"
              color="green"
            />

            <StatCard
              icon="⚡"
              value="99.9%"
              label="Uptime"
              color="cyan"
            />

            <StatCard
              icon="💬"
              value="24/7"
              label="Automation"
              color="blue"
            />

            <StatCard
              icon="🤖"
              value="AI"
              label="Powered"
              color="purple"
            />
          </section>

          {/* =====================================================
              CHANNELS
          ====================================================== */}

          <section className="mb-6 rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.075] via-[#07141a]/[0.82] to-blue-500/[0.055] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl md:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-cyan-400/80">
                  Primary Channels
                </p>

                <h2 className="mt-1 text-xl font-black md:text-2xl">
                  Connect your channels
                </h2>

                <p className="mt-1 max-w-2xl text-xs text-gray-500 md:text-sm">
                  WhatsApp powers customer conversations and automation. Gmail powers Email AI and unlimited email sending.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ConnectionPill
                  logo={BRAND_LOGOS.whatsapp}
                  label={
                    whatsappStatusLoading
                      ? "Checking WhatsApp"
                      : whatsappConnected
                        ? "WhatsApp Connected"
                        : "WhatsApp Not Connected"
                  }
                  connected={whatsappConnected}
                  brand="whatsapp"
                />

                <ConnectionPill
                  logo={BRAND_LOGOS.gmail}
                  label={
                    gmailStatusLoading
                      ? "Checking Gmail"
                      : gmailConnected
                        ? gmailAccountEmail || "Gmail Connected"
                        : "Gmail Not Connected"
                  }
                  connected={gmailConnected}
                  brand="gmail"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ChannelCard
                name="WhatsApp"
                description="Business messaging • AI automation • customer conversations"
                status={
                  whatsappStatusLoading
                    ? "Checking connection..."
                    : whatsappConnected
                      ? "Connected • Active"
                      : "Connect WhatsApp"
                }
                connected={whatsappConnected}
                locked={false}
                logo={BRAND_LOGOS.whatsapp}
                brand="whatsapp"
                onClick={startAutomationSetup}
              />

              <ChannelCard
                name="Gmail"
                description={
                  gmailConnected && gmailAccountEmail
                    ? `Email AI • Inbox • ${gmailAccountEmail}`
                    : "Email AI • Inbox • professional email automation"
                }
                status={
                  gmailStatusLoading
                    ? "Checking connection..."
                    : gmailConnected
                      ? "Connected • Active"
                      : "Connect Gmail"
                }
                connected={gmailConnected}
                locked={false}
                logo={BRAND_LOGOS.gmail}
                brand="gmail"
                onClick={openEmailSender}
              />

              <ChannelCard
                name="WhatsApp Campaign"
                description="Unlimited campaign sending • scheduling • AI-powered outreach"
                status={
                  whatsappStatusLoading
                    ? "Checking WhatsApp..."
                    : whatsappConnected
                      ? "Ready to use"
                      : "Connect WhatsApp when sending"
                }
                connected={whatsappConnected}
                logo={BRAND_LOGOS.whatsapp}
                brand="whatsapp"
                onClick={openWhatsAppCampaign}
                badge="UNLIMITED"
              />
            </div>
          </section>

          {/* =====================================================
              QUICK ACTIONS
          ====================================================== */}

          <section className="mb-6">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-green-400/70">
                Productivity
              </p>

              <h2 className="mt-1 text-2xl font-black md:text-3xl">
                Quick Actions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Everything important, without unnecessary duplicate buttons.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ActionCard
                icon="👥"
                title="Leads"
                description="View your leads, customer activity, conversations and business pipeline."
                onClick={() => {
                  if (isMobile) {
                    showDesktopOnly("Leads");
                  } else {
                    navigateWithBusinessId("/dashboard");
                  }
                }}
                accent="green"
                badge="DASHBOARD"
              />

              <ActionCard
                icon="📈"
                title="Analytics"
                description="Understand conversations, leads and automation performance."
                onClick={() => {
                  if (isMobile) {
                    showDesktopOnly("Analytics");
                  } else {
                    navigate("/analytics");
                  }
                }}
                accent="blue"
              />

              <ActionCard
                icon={
                  <img
                    src={BRAND_LOGOS.whatsapp}
                    alt="WhatsApp"
                    className="h-7 w-7 object-contain"
                  />
                }
                title="WhatsApp Campaign"
                description="Send unlimited messages, schedule outreach and manage AI-powered follow-ups."
                onClick={openWhatsAppCampaign}
                accent="green"
                badge="UNLIMITED"
              />

              <ActionCard
                icon="🧰"
                title="Business Update AI"
                description="Manage your business details, update promotions and packages."
                onClick={() => navigateWithBusinessId("/dashboard/business-ai")}
                accent="slate"
              />

              <ActionCard
                icon="💎"
                title="Subscription"
                description="View your plan, subscription status and billing options."
                onClick={() => navigateWithBusinessId("/subscription")}
                accent="purple"
                badge="PRO"
              />

              <ActionCard
                icon={
                  <img
                    src={BRAND_LOGOS.gmail}
                    alt="Gmail"
                    className="h-7 w-7 object-contain"
                  />
                }
                title="Email Sender"
                description="Send and manage professional email campaigns with your connected Gmail account."
                onClick={openEmailSender}
                accent="red"
                badge="GMAIL"
              />
            </div>
          </section>

          {/* =====================================================
              AI INTELLIGENCE
          ====================================================== */}

          <section className="relative mb-6 overflow-hidden rounded-[28px] border border-purple-400/15 bg-[#0b0712]/75 p-6 backdrop-blur-xl md:p-8">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-green-500/[0.06] blur-3xl" />

            <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-purple-300">
                  Sodah Intelligence
                </p>

                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  Let AI handle the repetitive work.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                  Automate customer conversations, lead capture, follow-ups
                  and campaign management while you focus on growing your
                  business.
                </p>
              </div>

              <button
                type="button"
                onClick={openWhatsAppCampaign}
                className="shrink-0 rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 px-6 py-3 font-black shadow-[0_0_35px_rgba(124,58,237,0.22)] transition hover:scale-[1.02]"
              >
                Open AI Assistant →
              </button>
            </div>
          </section>

          {/* =====================================================
              WHY SODAH CTA
          ====================================================== */}

          <section className="mb-6 rounded-[28px] border border-green-400/10 bg-gradient-to-r from-green-400/[0.06] to-cyan-400/[0.04] p-6 backdrop-blur-xl md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-green-400">
                  Why Sodah.io
                </p>

                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  Powerful automation without unnecessary complexity.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                  Affordable, fast to set up, simple to use and built to grow
                  professionally with your business.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWhySodah(true)}
                className="shrink-0 rounded-2xl border border-green-400/20 bg-green-400/10 px-6 py-3 font-bold text-green-300 transition hover:bg-green-400/15"
              >
                Why choose us? →
              </button>
            </div>
          </section>

          {/* BACKGROUND CONTROLS */}

          <div className="flex justify-center gap-2 py-3">
            {BACKGROUNDS.map((background, index) => (
              <button
                key={background}
                type="button"
                aria-label={`Background ${index + 1}`}
                onClick={() => setBgIndex(index)}
                className={
                  "h-2 rounded-full transition-all duration-500 " +
                  (index === bgIndex
                    ? "w-8 bg-green-400 shadow-[0_0_12px_rgba(37,211,102,0.55)]"
                    : "w-2 bg-white/20 hover:bg-green-400/40")
                }
              />
            ))}
          </div>
        </div>
      </main>

      {/* =========================================================
          GLOBAL ADMIN MAINTENANCE MODE

          Controlled from Admin Settings -> Maintenance Mode.
          It cannot be closed by the business user. Turning the admin
          toggle OFF removes it in realtime.
      ========================================================== */}
      {!adminSettingsLoading &&
        adminSettings.maintenance_mode &&
        !isSuperAdmin && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-5 backdrop-blur-md">
            <div className="w-full max-w-xl rounded-3xl border border-red-400/25 bg-[#0a0f18]/98 p-7 text-center shadow-[0_30px_120px_rgba(0,0,0,0.8)] md:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/10 text-3xl">
                🛠️
              </div>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[3px] text-red-300">
                System Maintenance
              </p>

              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
                Sodah is temporarily unavailable
              </h2>

              <p className="mx-auto mt-4 max-w-lg whitespace-pre-wrap text-sm leading-6 text-gray-300 md:text-base">
                {adminSettings.maintenance_message}
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                Maintenance mode is active
              </div>
            </div>
          </div>
        )}

      {/* =========================================================
          GLOBAL ADMIN NOTIFICATION

          Controlled from Admin Settings -> Notifications.
          It cannot be closed by the business user. Turning the admin
          toggle OFF removes it in realtime.
      ========================================================== */}
      {!adminSettingsLoading &&
        adminSettings.notifications &&
        !adminSettings.maintenance_mode && (
          <div className="fixed left-1/2 top-[88px] z-[220] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2">
            <div className="relative w-full rounded-2xl border border-blue-400/25 bg-[#07101a]/96 p-4 text-left shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/[0.10] text-lg">
                  📢
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-blue-300">
                    Sodah Announcement
                  </p>

                  <p className="mt-1 text-sm font-black text-white md:text-base">
                    Important Update
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-300 md:text-sm">
                    {adminSettings.notification_message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* =========================================================
          PERSONAL ADMIN NOTIFICATIONS

          These are business-specific messages. The business user can
          close personal messages locally.
      ========================================================== */}
      {!adminNotificationsLoading &&
        adminNotifications.length > 0 && (
          <div className="fixed left-1/2 top-[88px] z-[210] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-3">
            {adminNotifications.map((notification) => {
              if (
                dismissedPersonalNotifications.has(
                  notification.id
                )
              ) {
                return null;
              }

              return (
                <div
                  key={notification.id}
                  className="relative w-full rounded-2xl border border-cyan-400/25 bg-[#06110c]/95 p-4 text-left shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                >
                  <button
                    type="button"
                    aria-label="Close personal message"
                    onClick={() =>
                      setDismissedPersonalNotifications(
                        (current) => {
                          const next = new Set(current);
                          next.add(notification.id);
                          return next;
                        }
                      )
                    }
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </button>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.10] text-lg">
                      💬
                    </div>

                    <div className="min-w-0 flex-1 pr-7">
                      <p className="text-[9px] font-black uppercase tracking-[2px] text-cyan-400">
                        Personal Message
                      </p>

                      <p className="mt-1 text-sm font-black text-white md:text-base">
                        {notification.title ||
                          "Personal Message"}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-300 md:text-sm">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      {/* =========================================================
          SUPPORT FLOATING BUTTON
      ========================================================== */}

      <div className="fixed bottom-6 right-5 z-[80]">
        <button
          type="button"
          onClick={openSupport}
          aria-label="Open AI Help & Support"
          className="group relative flex items-center gap-2.5 rounded-2xl border border-cyan-300/20 bg-[#06110c]/92 px-3 py-2.5 text-white shadow-[0_18px_55px_rgba(0,0,0,0.45),0_0_35px_rgba(34,211,238,0.16)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-[#071710]/96 hover:shadow-[0_22px_65px_rgba(0,0,0,0.55),0_0_45px_rgba(34,211,238,0.24)] active:scale-95 sm:px-4"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 via-cyan-400 to-blue-500 text-lg shadow-[0_0_20px_rgba(34,211,238,0.20)]">
            🤖
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#06110c] bg-green-400" />
          </span>

          <span className="hidden text-left sm:block">
            <span className="block text-[9px] font-black uppercase tracking-[1.8px] text-cyan-300">
              AI Assistant
            </span>
            <span className="block text-xs font-bold text-white">
              Help & Support
            </span>
          </span>

          <span className="text-gray-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-300">
            →
          </span>
        </button>
      </div>

      {/* =========================================================
          MOBILE BOTTOM BAR
      ========================================================== */}

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] flex h-16 items-center justify-around border-t border-green-400/10 bg-[#020806]/90 backdrop-blur-2xl">
          <MobileNavButton
            icon="⌂"
            label="Home"
            active
            onClick={() => navigateWithBusinessId("/welcome")}
          />

          <MobileNavButton
            icon="👥"
            label="Leads"
            onClick={() => {
              if (isMobile) {
                showDesktopOnly("Leads");
              } else {
                navigateWithBusinessId("/dashboard");
              }
            }}
          />

          <MobileNavButton
            icon="📢"
            label="Campaign"
            onClick={openWhatsAppCampaign}
          />

          <MobileNavButton
            icon="🤖"
            label="Support"
            onClick={openSupport}
          />

          <MobileNavButton
            icon="☰"
            label="Menu"
            onClick={() => setShowMobileMenu(true)}
          />
        </div>
      )}

      {/* =========================================================
          AI SUPPORT POPUP
      ========================================================== */}

      {showSupport && (
        <SupportModal
          onClose={() => setShowSupport(false)}
          user={user}
        />
      )}
      
      {/* =========================================================
          WHY SODAH MODAL
      ========================================================== */}

      {showWhySodah && (
        <InfoModal
          title="Why choose Sodah.io?"
          eyebrow="WHY SODAH.IO"
          onClose={() => setShowWhySodah(false)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoFeature
              icon="💰"
              title="Affordable"
              text="We believe professional automation should not require an enterprise-sized budget. Sodah.io is designed to give growing businesses powerful tools at a practical cost."
            />

            <InfoFeature
              icon="⚡"
              title="Fast setup"
              text="Get your channels and automation running quickly without unnecessary technical complexity. Our goal is to get you from setup to useful automation as fast as possible."
            />

            <InfoFeature
              icon="🧩"
              title="Simple by design"
              text="You do not need to become a developer to use Sodah.io. The platform is designed around clear workflows, straightforward controls and intelligent automation."
            />

            <InfoFeature
              icon="🚀"
              title="Built to grow"
              text="Start small and expand professionally. Connect more channels, add automation, improve customer conversations and build a stronger digital operation as your business grows."
            />

            <InfoFeature
              icon="🤖"
              title="AI-powered"
              text="Let AI take care of repetitive conversations, lead capture, follow-ups and other routine tasks while your team concentrates on higher-value work."
            />

            <InfoFeature
              icon="🔗"
              title="One connected workspace"
              text="Bring your customer communication channels into one intelligent environment instead of managing everything separately."
            />
          </div>

          <div className="mt-6 rounded-2xl border border-green-400/15 bg-green-400/[0.05] p-5">
            <p className="text-sm leading-7 text-gray-300">
              <span className="font-bold text-green-300">
                Our philosophy:
              </span>{" "}
              powerful technology should feel simple. Sodah.io focuses on
              giving businesses quality automation without making the journey
              complicated, expensive or unnecessarily technical.
            </p>
          </div>
        </InfoModal>
      )}

      {/* =========================================================
          ABOUT MODAL
      ========================================================== */}

      {showAbout && (
        <InfoModal
          title="About Sodah.io"
          eyebrow="ABOUT US"
          onClose={() => setShowAbout(false)}
        >
          <div className="space-y-5 text-sm leading-7 text-gray-300">
            <p>
              <strong className="text-white">Sodah.io</strong> is an AI
              automation platform created to help businesses work smarter,
              stay active and build stronger relationships with their
              customers.
            </p>

            <p>
              Our main goal is simple: take repetitive digital work away from
              business owners and teams so they can spend more time doing the
              things that actually move the business forward.
            </p>

            <p>
              We bring communication, automation, customer conversations, lead
              management and AI assistance into one connected workspace. The
              result is a system that can help a business respond faster,
              follow up more consistently and keep customer activity organized.
            </p>

            <p>
              We believe technology should work for the business rather than
              force the business to work around complicated technology. That is
              why Sodah.io focuses heavily on simplicity, speed, affordability
              and professional scalability.
            </p>

            <p>
              Whether you are starting with one communication channel or
              building a larger automated customer operation, Sodah.io is
              designed to give you a foundation that can expand with you.
            </p>

            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
              <p className="font-bold text-cyan-300">
                Our mission
              </p>

              <p className="mt-2 text-gray-300">
                Help businesses make everyday work smarter, respond faster,
                stay connected and grow through practical AI-powered
                automation.
              </p>
            </div>
          </div>
        </InfoModal>
      )}

      <WelcomeCompleteModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}

/* ===============================================================
   TOP BAR BUTTON
================================================================ */

function TopBarButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-400 transition hover:bg-white/[0.06] hover:text-white"
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ===============================================================
   MOBILE TOP BUTTON
================================================================ */

function MobileTopButton({
  icon,
  label,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition ${
        danger
          ? "border-red-400/10 bg-red-500/[0.05] text-red-400 hover:bg-red-500/10"
          : "border-white/10 bg-white/[0.035] text-gray-300 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ===============================================================
   SODAH BRAND
================================================================ */

function SodahBrand({ size = "normal", centered = false }) {
  const sizes = {
    small: {
      mark: "h-8 w-8",
      text: "text-lg",
    },

    normal: {
      mark: "h-10 w-10",
      text: "text-2xl",
    },

    idle: {
      mark: "h-24 w-24",
      text: "text-6xl md:text-8xl",
    },
  };

  const selected = sizes[size] || sizes.normal;

  return (
    <div
      className={
        "flex items-center gap-3 " +
        (centered ? "flex-col" : "")
      }
    >
      <SodahMark className={selected.mark} />

      <div
        className={
          `${selected.text} font-black tracking-tight ` +
          (centered ? "text-center" : "")
        }
      >
        <span className="text-white">Sodah</span>

        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          .io
        </span>
      </div>
    </div>
  );
}

/* ===============================================================
   SODAH HERO
================================================================ */

function SodahHeroBrand() {
  return (
    <div className="relative flex min-h-[320px] w-full max-w-[570px] items-center justify-center md:min-h-[390px]">
      <div className="absolute h-[150px] w-[290px] rotate-[15deg] rounded-[50%] border border-green-400/50 shadow-[0_0_35px_rgba(37,211,102,0.18)] md:h-[210px] md:w-[440px]" />

      <div className="absolute h-[150px] w-[290px] -rotate-[20deg] rounded-[50%] border border-cyan-400/40 shadow-[0_0_35px_rgba(34,211,238,0.18)] md:h-[210px] md:w-[440px]" />

      <div className="absolute h-72 w-72 rounded-full bg-green-400/[0.07] blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <SodahMark className="mb-4 h-28 w-28 md:h-40 md:w-40" />

        <div className="text-center text-6xl font-black leading-none tracking-[-4px] md:text-8xl">
          <span className="text-white">Sodah</span>

          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
            .io
          </span>
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[5px] text-green-300 md:text-xs">
          AI AUTOMATION PLATFORM
        </p>
      </div>

      <BrandOrbitBadge
        brand="whatsapp"
        position="left-2 top-10 md:left-5 md:top-12"
      />

      <BrandOrbitBadge
        brand="gmail"
        position="right-2 top-10 md:right-5 md:top-12"
      />

    </div>
  );
}

/* ===============================================================
   SODAH MARK
================================================================ */

function SodahMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Sodah logo"
    >
      <defs>
        <linearGradient
          id="sodahGradient"
          x1="12"
          y1="12"
          x2="108"
          y2="108"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00E5FF" />
          <stop offset="0.48" stopColor="#2563EB" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>

        <linearGradient
          id="sodahInner"
          x1="30"
          y1="25"
          x2="90"
          y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>

        <filter
          id="sodahGlow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur
            stdDeviation="5"
            result="blur"
          />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M60 8C31 8 10 29 10 57C10 81 25 99 48 106L64 82C51 79 43 70 43 57C43 47 50 39 60 39H91L108 15C95 10 78 8 60 8Z"
        fill="url(#sodahGradient)"
        filter="url(#sodahGlow)"
      />

      <path
        d="M60 39C70 39 77 46 77 56C77 65 70 72 60 72H30L14 96C26 105 42 112 60 112C89 112 110 91 110 63C110 39 95 21 72 14L56 38C57 39 58 39 60 39Z"
        fill="url(#sodahInner)"
        opacity="0.94"
      />

      <path
        d="M60 47L69 56L60 65L51 56L60 47Z"
        fill="white"
      />

      <path
        d="M60 51L65 56L60 61L55 56L60 51Z"
        fill="#07111F"
      />
    </svg>
  );
}

/* ===============================================================
   BRAND ORBIT
================================================================ */

function BrandOrbitBadge({ position, brand = "whatsapp" }) {
  const color = BRAND_COLORS[brand] || BRAND_COLORS.whatsapp;

  return (
    <div
      className={`absolute ${position} z-20 flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-xl shadow-2xl transition-transform duration-300 hover:scale-110 md:h-14 md:w-14`}
      style={{
        borderColor: color.border,
        background: color.soft,
        boxShadow: `0 0 30px ${color.glow}`,
      }}
    >
      <img
        src={BRAND_LOGOS[brand]}
        alt={`${brand} logo`}
        className="h-7 w-7 object-contain md:h-8 md:w-8"
      />
    </div>
  );
}

/* ===============================================================
   STAT CARD
=============================================================== */



function StatCard({ icon, value, label, color }) {
  const colors = {
    green: "text-green-400",
    cyan: "text-cyan-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#06100b]/70 p-4 backdrop-blur-xl transition hover:border-green-400/15 hover:bg-white/[0.045] md:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.05] text-lg">
          {icon}
        </div>

        <div>
          <p
            className={`text-2xl font-black md:text-3xl ${
              colors[color] || "text-white"
            }`}
          >
            {value}
          </p>

          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ===============================================================
   CONNECTION PILL
================================================================ */

function ConnectionPill({
  logo,
  label,
  connected = false,
  brand = "whatsapp",
}) {
  const color = BRAND_COLORS[brand] || BRAND_COLORS.whatsapp;

  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold backdrop-blur-xl"
      style={{
        borderColor: connected ? color.border : "rgba(255,255,255,0.10)",
        background: connected ? color.soft : "rgba(255,255,255,0.025)",
        color: connected ? color.primary : "#9CA3AF",
      }}
    >
      <img
        src={logo}
        alt={brand}
        className="h-3.5 w-3.5 shrink-0 object-contain"
      />

      <span className="truncate">{label}</span>

      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: connected ? color.primary : "#6B7280",
          boxShadow: connected
            ? `0 0 8px ${color.primary}`
            : "none",
        }}
      />
    </div>
  );
}

/* ===============================================================
   CHANNEL CARD
================================================================ */

function ChannelCard({
  name,
  description,
  status,
  connected = false,
  locked = false,
  onClick,
  logo,
  brand = "whatsapp",
  badge,
}) {
  const color = BRAND_COLORS[brand] || BRAND_COLORS.whatsapp;

  const clickable = Boolean(onClick) && !locked;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      aria-disabled={!clickable}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
        locked
          ? "cursor-not-allowed border-white/10 bg-black/30 opacity-75"
          : "cursor-pointer border-white/10 bg-black/20 hover:-translate-y-1 hover:bg-white/[0.05]"
      }`}
      style={{
        boxShadow: connected
          ? `inset 0 1px 0 ${color.border}`
          : "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
        style={{ background: color.primary }}
      />

      <div className="relative flex items-center gap-4">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl"
          style={{
            borderColor: color.border,
            background: color.soft,
            boxShadow: connected
              ? `0 0 22px ${color.glow}`
              : "none",
          }}
        >
          <img
            src={logo || BRAND_LOGOS[brand]}
            alt={`${name} logo`}
            className="h-8 w-8 object-contain"
          />

          {locked && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-[#07100c] text-[9px] text-gray-400">
              🔒
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{name}</p>

            {badge && (
              <span
                className="rounded-full border px-2 py-0.5 text-[7px] font-black tracking-wider"
                style={{
                  borderColor: color.border,
                  color: color.primary,
                  background: color.soft,
                }}
              >
                {badge}
              </span>
            )}
          </div>

          <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-gray-500">
            {description}
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: connected ? color.primary : "#6B7280",
                boxShadow: connected
                  ? `0 0 8px ${color.primary}`
                  : "none",
              }}
            />

            <span
              className="text-[10px] font-bold"
              style={{
                color: connected ? color.primary : "#9CA3AF",
              }}
            >
              {status}
            </span>
          </div>
        </div>

        <span className="text-gray-600 transition group-hover:text-white">
          {locked ? "🔒" : "→"}
        </span>
      </div>
    </button>
  );
}

/* ===============================================================
   ACTION CARD
=============================================================== */



function ActionCard({
  icon,
  title,
  description,
  onClick,
  accent = "default",
  badge,
}) {
  const accentStyles = {
    default:
      "border-slate-400/10 bg-slate-500/[0.045] hover:border-slate-300/25 hover:bg-slate-400/[0.075]",

    cyan:
      "border-cyan-400/15 bg-cyan-500/[0.055] hover:border-cyan-400/35 hover:bg-cyan-400/[0.10]",

    red:
      "border-red-400/15 bg-red-500/[0.055] hover:border-red-400/35 hover:bg-red-400/[0.10]",

    green:
      "border-green-400/15 bg-green-500/[0.055] hover:border-green-400/35 hover:bg-green-400/[0.10]",

    purple:
      "border-purple-400/15 bg-purple-500/[0.055] hover:border-purple-400/35 hover:bg-purple-400/[0.10]",

    blue:
      "border-blue-400/15 bg-blue-500/[0.055] hover:border-blue-400/35 hover:bg-blue-400/[0.10]",

    orange:
      "border-orange-400/15 bg-orange-500/[0.055] hover:border-orange-400/35 hover:bg-orange-400/[0.10]",

    slate:
      "border-slate-400/15 bg-slate-500/[0.055] hover:border-slate-300/30 hover:bg-slate-400/[0.09]",

  };

  const iconStyles = {
    default:
      "border-slate-400/15 bg-slate-400/[0.08] group-hover:border-slate-300/30 group-hover:bg-slate-300/[0.12]",

    cyan:
      "border-cyan-400/20 bg-cyan-400/[0.08] group-hover:border-cyan-400/35 group-hover:bg-cyan-400/[0.14]",

    red:
      "border-red-400/20 bg-red-400/[0.08] group-hover:border-red-400/35 group-hover:bg-red-400/[0.14]",

    green:
      "border-green-400/20 bg-green-400/[0.08] group-hover:border-green-400/35 group-hover:bg-green-400/[0.14]",

    purple:
      "border-purple-400/20 bg-purple-400/[0.08] group-hover:border-purple-400/35 group-hover:bg-purple-400/[0.14]",

    blue:
      "border-blue-400/20 bg-blue-400/[0.08] group-hover:border-blue-400/35 group-hover:bg-blue-400/[0.14]",

    orange:
      "border-orange-400/20 bg-orange-400/[0.08] group-hover:border-orange-400/35 group-hover:bg-orange-400/[0.14]",

    slate:
      "border-slate-400/20 bg-slate-400/[0.08] group-hover:border-slate-300/30 group-hover:bg-slate-300/[0.14]",

  };

  const arrowStyles = {
    default: "group-hover:text-slate-300",
    cyan: "group-hover:text-cyan-400",
    red: "group-hover:text-red-400",
    green: "group-hover:text-green-400",
    purple: "group-hover:text-purple-400",
    blue: "group-hover:text-blue-400",
    orange: "group-hover:text-orange-400",
    slate: "group-hover:text-slate-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[155px] overflow-hidden rounded-[22px] border p-5 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${accentStyles[accent]}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl transition group-hover:scale-110 ${iconStyles[accent]}`}
        >
          {icon}
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full border border-green-400/15 bg-green-400/[0.06] px-2 py-1 text-[8px] font-bold tracking-wider text-green-300">
              {badge}
            </span>
          )}

          <span
            className={`text-gray-600 transition ${arrowStyles[accent]}`}
          >
            →
          </span>
        </div>
      </div>

      <h3 className="text-lg font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-gray-400">
        {description}
      </p>
    </button>
  );
}

/* ===============================================================
   MOBILE NAV
================================================================ */

function MobileNavButton({
  icon,
  label,
  active = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[58px] flex-col items-center justify-center gap-0.5 ${
        active ? "text-green-400" : "text-gray-500"
      }`}
    >
      <span className="text-xl">{icon}</span>

      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

/* ===============================================================
   SUPPORT MODAL
================================================================ */

function SupportModal({ onClose, user }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Sodah AI Support"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onTouchStart={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex h-[88vh] w-full max-w-[1050px] flex-col overflow-hidden rounded-t-[28px] border border-cyan-400/15 bg-[#020907] shadow-[0_30px_120px_rgba(0,0,0,0.7)] sm:h-[82vh] sm:rounded-[28px]"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#06110c]/90 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 text-lg shadow-[0_0_20px_rgba(37,211,102,0.18)]">
              🤖
            </div>

            <div>
              <p className="text-sm font-black text-white">
                Sodah AI Support
              </p>

              <p className="text-[10px] text-green-400">
                Online • Ready to help
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            className="relative z-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-xl text-gray-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.10] hover:text-white active:scale-95"
            aria-label="Close support"
            title="Close support"
          >
            ×
          </button>
        </div>

        <div className="relative flex-1 bg-[#020806]">
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(37,211,102,0.06),transparent_30%)]" />

          <iframe
            src={SUPPORT_URL}
            title="Sodah AI Support"
            className="relative z-20 h-full w-full border-0 bg-transparent"
            allow="clipboard-write; microphone"
          />
        </div>

        <div className="shrink-0 border-t border-white/10 bg-black/30 px-4 py-2.5">
          <p className="text-center text-[10px] text-gray-600">
            {user.fullName
              ? `Sodah AI Support • Helping ${user.fullName}`
              : "Sodah AI Support • Here to help"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===============================================================
   INFO MODAL
================================================================ */

function InfoModal({
  title,
  eyebrow,
  children,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-green-400/10 bg-[#06100b]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl md:p-8">
        <div className="mb-6 flex items-start justify-between gap-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[3px] text-green-400">
              {eyebrow}
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition hover:bg-white/[0.09] hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* ===============================================================
   INFO FEATURE
================================================================ */

function InfoFeature({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-green-400/15 hover:bg-green-400/[0.025]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xl">
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-white">{title}</h3>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}