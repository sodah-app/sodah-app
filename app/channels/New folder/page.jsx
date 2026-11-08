"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";
import WelcomeCompleteModal from "@/components/WelcomeCompleteModal";
import SodahSidebar from "@/components/SodahSidebar";

/* ============================================================
   SODAH WORKSPACE
   ------------------------------------------------------------
   FINAL HOMEPAGE STRUCTURE

   LAYER 1
   Compact premium hero.

   LAYER 2
   Automatic visual product showcase.
   Changes every 10 seconds.
   Showcase visuals are NOT navigation buttons.

   LAYER 3
   Focused operating layer.
   Only the most important quick actions live here.
   The full workspace remains available through the permanent sidebar.

   ADMIN IMPLEMENTATION PRESERVED
   - Maintenance mode
   - Global announcements
   - Personal business notifications
   - Supabase realtime
   - Business routing
   - WhatsApp status
   - Gmail status
   - Subscription status
   - Idle screen
============================================================ */

/* ============================================================
   BRAND
============================================================ */

const BRAND = {
  whatsapp:
    "https://cdn.simpleicons.org/whatsapp/25D366",

  gmail:
    "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png",

  sodah:
    "https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png",
};

/* First-layer projection visuals are intentionally web-sourced so the hero
   can show recognizable business-software imagery instead of generic placeholders. */
const HERO_SHOWCASE_IMAGES = [
  // Web-sourced visuals selected to match Sodah's first-layer
  // business automation / workspace projection.
  "https://cdn.dribbble.com/userupload/46749098/file/7cbd9f7bad5b696abf8457c1d4191f5d.png?resize=%7Bwidth%7Dx%7Bheight%7D&vertical=center",
  "https://ixymyhazbhztpjnlxmbd.supabase.co/storage/v1/object/images/generated/gestao-atendentes-whatsapp-821.webp",
  "https://iolab.nyc3.digitaloceanspaces.com/images/generated/blog/auto/ai-powered-data-analytics-small-business-2026-cover.png",
];

/* Premium generated product-project images used by both Layer 1 and Layer 2.
   These are visual presentation assets only; they do not replace the live UI. */
const SODAH_PROJECT_IMAGES = [
  "/sodah-projects/sodah-dashboard-project.png",
  "/sodah-projects/sodah-workspace-project.png",
];

/* ============================================================
   BACKGROUNDS
============================================================ */

const BACKGROUNDS = [
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=2200&q=90",
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=2200&q=90",
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=2200&q=90",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=2200&q=90",
];

/* ============================================================
   SHOWCASE ITEMS

   These are VISUAL showcases.
   They are deliberately not buttons.
============================================================ */

const SHOWCASES = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    eyebrow: "WHATSAPP AUTOMATION",
    color: "#25D366",
    title: "Keep WhatsApp working for your business.",
    description:
      "Connect your existing business WhatsApp through the QR connection flow and let Sodah assist with conversations, replies, appointments and follow-ups.",
    visual: "whatsapp",
  },
  {
    id: "cashflow",
    label: "Cashflow",
    eyebrow: "BUSINESS FINANCE",
    color: "#0f4c5c",
    title: "See your numbers. Run smarter.",
    description:
      "Monitor income, expenses and business performance from one professional operating workspace.",
    visual: "cashflow",
  },
  {
    id: "timesheets",
    label: "Timesheets",
    eyebrow: "TEAM OPERATIONS",
    color: "#38bdf8",
    title: "Your team. One workspace.",
    description:
      "Track attendance, check-ins, check-outs and working hours without switching between different systems.",
    visual: "timesheets",
  },
  {
    id: "gmail",
    label: "Gmail",
    eyebrow: "SMART EMAIL",
    color: "#0f766e",
    title: "Bring your business inbox into one intelligent workspace.",
    description:
      "Connect Gmail, organize incoming conversations and use AI assistance to help generate professional replies.",
    visual: "gmail",
  },
  {
    id: "campaign",
    label: "WhatsApp Campaign",
    eyebrow: "CAMPAIGN CENTER",
    color: "#25D366",
    title: "Reach customers. Follow up automatically.",
    description:
      "Manage customer campaigns and structured WhatsApp messaging from the same connected business workspace.",
    visual: "campaign",
  },
  {
    id: "email",
    label: "Bulk Email",
    eyebrow: "EMAIL AUTOMATION",
    color: "#06b6d4",
    title: "Manage business email at scale.",
    description:
      "Organize bulk email activity, AI-generated messaging and customer responses in one place.",
    visual: "email",
  },
  {
    id: "subscription",
    label: "Subscription",
    eyebrow: "SODAH WORKSPACE",
    color: "#a78bfa",
    title: "Scale your workspace with your business.",
    description:
      "Manage your plan and access the automation capabilities available to your business.",
    visual: "subscription",
  },
  {
    id: "settings",
    label: "Settings",
    eyebrow: "WORKSPACE CONTROL",
    color: "#64748b",
    title: "Keep your business configured.",
    description:
      "Manage the settings that control your connected Sodah workspace and business environment.",
    visual: "settings",
  },
  {
    id: "growth-priority",
    label: "Growth Priority",
    eyebrow: "SODAH.IO",
    color: "#10B981",
    title: "Sodah.io — your business growth, our priority.",
    description:
      "Put customer conversations, automation, bookings, campaigns, finance and team operations into one focused growth workspace.",
    visual: "growth",
  },
  {
    id: "multilingual-ai",
    label: "Multilingual AI",
    eyebrow: "ADVANCED AI",
    color: "#06B6D4",
    title: "Your AI can chat with your customers in any language.",
    description:
      "Keep conversations natural across languages while Sodah helps your business respond, qualify customers and keep conversations moving.",
    visual: "multilingual",
  },
  {
    id: "pro-plan",
    label: "Pro — $29",
    eyebrow: "START YOUR AUTOMATION",
    color: "#8B5CF6",
    title: "Start your automation from $29/month with Pro.",
    description:
      "Start small, connect your business and grow into more advanced automation as your operation expands.",
    visual: "pro",
  },
  {
    id: "appointments",
    label: "Appointments",
    eyebrow: "BOOKINGS",
    color: "#3B82F6",
    title: "Turn conversations into confirmed appointments.",
    description:
      "Let customers request services, choose a time and receive a clear confirmation while your team stays organized.",
    visual: "appointments",
  },
  {
    id: "leads",
    label: "Leads",
    eyebrow: "LEAD MANAGEMENT",
    color: "#F97316",
    title: "Capture every serious customer opportunity.",
    description:
      "Keep lead details, conversations and customer activity together so opportunities do not disappear inside scattered chats.",
    visual: "leads",
  },
  {
    id: "followups",
    label: "Follow-ups",
    eyebrow: "CUSTOMER JOURNEYS",
    color: "#EC4899",
    title: "Never let an important conversation go cold.",
    description:
      "Create structured follow-ups and reminders so customers receive the right message at the right stage.",
    visual: "followups",
  },
  {
    id: "team-schedule",
    label: "Team Schedule",
    eyebrow: "TEAM COMMUNICATION",
    color: "#14B8A6",
    title: "Schedule messages for your team.",
    description:
      "Prepare an internal message today and schedule it for the exact time your team needs to receive it.",
    visual: "team",
  },
  {
    id: "business-updates",
    label: "Business Updates",
    eyebrow: "SELF-MANAGED BUSINESS",
    color: "#6366F1",
    title: "Update your business yourself.",
    description:
      "Keep important business information, announcements and customer-facing details current from your own workspace.",
    visual: "updates",
  },
  {
    id: "analytics",
    label: "Analytics",
    eyebrow: "DAILY & WEEKLY INTELLIGENCE",
    color: "#0EA5E9",
    title: "Know what happened today, this week and this month.",
    description:
      "Turn activity into a clear operating picture with conversations, leads, bookings and business performance in one view.",
    visual: "analytics",
  },
  {
    id: "ai-assistant",
    label: "AI Assistant",
    eyebrow: "SODAH INTELLIGENCE",
    color: "#22C55E",
    title: "An intelligent business assistant that keeps working.",
    description:
      "Use advanced AI to support customer conversations, organize activity and help your business stay responsive around the clock.",
    visual: "assistant",
  },
  {
    id: "qr-connection",
    label: "QR Connection",
    eyebrow: "CONNECT IN MINUTES",
    color: "#25D366",
    title: "Connect your business WhatsApp with a simple QR scan.",
    description:
      "Connect the WhatsApp account you already use and bring conversations into the Sodah workspace without changing how your customers reach you.",
    visual: "qr",
  },
  {
    id: "one-workspace",
    label: "One Workspace",
    eyebrow: "THE SODAH OPERATING LAYER",
    color: "#0F172A",
    title: "One place for conversations, customers and business operations.",
    description:
      "Sodah brings communication, AI, campaigns, bookings, email, analytics, cash flow and team operations into one connected business workspace.",
    visual: "workspace",
  },
];


/* Top-right hero showcase: each feature appears as a clean text-only slide,
   followed by its product preview. This list intentionally contains no email/Gmail stories. */
const HERO_FEATURES = [
  { id: "growth-priority", eyebrow: "SODAH WORKSPACE", color: "#0f4c5c", title: "Manage your business in Sodah Workspace.", description: "Manage your business in Sodah Workspace.", visual: "growth" },
  { id: "qr-connection", eyebrow: "ADVANCED QR CODE", color: "#059669", title: "Automate Smart and Fast with Sodah Advanced QR Code.", description: "Automate Smart and Fast with Sodah Advanced QR Code.", visual: "qr" },
  { id: "whatsapp", eyebrow: "YOUR EXISTING WHATSAPP", color: "#0f766e", title: "Use your existing business WhatsApp.", description: "Use your existing business WhatsApp.", visual: "whatsapp" },
  { id: "whatsapp-stability", eyebrow: "BUSINESS WHATSAPP", color: "#166534", title: "Business WhatsApp is advised for stability and longevity.", description: "Business WhatsApp is advised for stability and longevity.", visual: "whatsapp" },
  { id: "ai-assistant", eyebrow: "AI REPLIES 24/7", color: "#16a34a", title: "Watch AI reply to your customers 24/7.", description: "Watch AI reply to your customers 24/7.", visual: "assistant" },
  { id: "appointments", eyebrow: "APPOINTMENTS", color: "#14532d", title: "Book appointments, follow-ups and reminders.", description: "Book appointments, follow-ups and reminders.", visual: "appointments" },
  { id: "promotions-products", eyebrow: "PROMOTIONS & PRODUCTS", color: "#0f766e", title: "Run promotions and add your products.", description: "Run promotions and add your products.", visual: "campaign" },
  { id: "voice-notes", eyebrow: "AI VOICE NOTES", color: "#164e63", title: "AI replies to voice notes in any language.", description: "AI replies to voice notes in any language.", visual: "multilingual" },
  { id: "multilingual-ai", eyebrow: "MULTILINGUAL CHAT", color: "#0f766e", title: "Your business can chat in your customer's language.", description: "Your business can chat in your customer's language.", visual: "multilingual" },
  { id: "business-updates", eyebrow: "BUSINESS MANAGEMENT", color: "#0e7490", title: "Update your business details anytime.", description: "Update your business details anytime.", visual: "updates" },
  { id: "campaign", eyebrow: "WHATSAPP CAMPAIGNS", color: "#065f46", title: "Run WhatsApp broadcasting and campaigns.", description: "Run WhatsApp broadcasting and campaigns.", visual: "campaign" },
  { id: "bulk-messaging", eyebrow: "BULK MESSAGING", color: "#1d4ed8", title: "Send up to 1,000+ WhatsApp messages.", description: "Send up to 1,000+ WhatsApp messages.", visual: "campaign" },
  { id: "team-schedule", eyebrow: "MESSAGE SCHEDULING", color: "#1e3a5f", title: "Schedule WhatsApp messages daily, weekly or monthly for your team or customers.", description: "Schedule WhatsApp messages daily, weekly or monthly for your team or customers.", visual: "team" },
  { id: "message-templates", eyebrow: "MESSAGE TEMPLATES", color: "#166534", title: "Use templates to generate your business messages.", description: "Use templates to generate your business messages.", visual: "updates" },
  { id: "whatsapp-history", eyebrow: "WHATSAPP HISTORY", color: "#155e75", title: "Use WhatsApp history and drafts.", description: "Use WhatsApp history and drafts.", visual: "whatsapp" },
  { id: "business-data", eyebrow: "BUSINESS DATA", color: "#1e3a5f", title: "Manage your business data.", description: "Manage your business data.", visual: "workspace" },
  { id: "timesheets", eyebrow: "EMPLOYEE TIMESHEETS", color: "#155e75", title: "Manage employee timesheets with advanced check-in and check-out.", description: "Manage employee timesheets with advanced check-in and check-out.", visual: "timesheets" },
  { id: "cashflow", eyebrow: "INVOICES & CASHFLOW", color: "#1e3a5f", title: "Manage invoices and cashflow.", description: "Manage invoices and cashflow.", visual: "cashflow" },
  { id: "leads", eyebrow: "LEAD DASHBOARD", color: "#047857", title: "Manage all leads in the Sodah Lead Dashboard.", description: "Manage all leads in the Sodah Lead Dashboard.", visual: "leads" },
  { id: "starter-price", eyebrow: "SODAH STARTER", color: "#0f766e", title: "All these features for $41 with Sodah Starter.", description: "All these features for $41 with Sodah Starter.", visual: "subscription" },
];

const SHOWCASE_INTERVAL = 12000;

/* ============================================================
   ADMIN DEFAULTS
============================================================ */

const DEFAULT_ADMIN_SETTINGS = {
  maintenance_mode: false,
  notifications: false,

  maintenance_message:
    "We are currently performing scheduled maintenance. Some services may be temporarily unavailable. Please check back shortly.",

  notification_message:
    "We have an important update for you. Please check this message for the latest information.",
};

/* ============================================================
   MAIN PAGE
============================================================ */

export default function WelcomePage() {
  const router = useRouter();

  /* ==========================================================
     USER
  ========================================================== */

  const [user, setUser] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessId: "",
    businessName: "",
  });

  const [isMobile, setIsMobile] = useState(false);

  /* ==========================================================
     SHOWCASE
  ========================================================== */

  const [showcaseIndex, setShowcaseIndex] = useState(0);

  const [backgroundIndex, setBackgroundIndex] =
    useState(0);

  /* ==========================================================
     CONNECTIONS
  ========================================================== */

  const [whatsappConnected, setWhatsappConnected] =
    useState(false);

  const [gmailConnected, setGmailConnected] =
    useState(false);

  const [gmailAccountEmail, setGmailAccountEmail] =
    useState("");

  const [whatsappLoading, setWhatsappLoading] =
    useState(true);

  const [gmailLoading, setGmailLoading] =
    useState(true);

  /* ==========================================================
     SUBSCRIPTION
  ========================================================== */

  const [isPremier, setIsPremier] =
    useState(false);

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(true);

  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null);
  const [expiryClock, setExpiryClock] = useState(Date.now());
  const [dismissedExpiryWarning, setDismissedExpiryWarning] = useState(false);

  useEffect(() => {
    const expiryTimer = window.setInterval(() => setExpiryClock(Date.now()), 60 * 1000);
    return () => window.clearInterval(expiryTimer);
  }, []);

  /* ==========================================================
     MODALS
  ========================================================== */

  const [showSuccess, setShowSuccess] =
    useState(false);

  const [showSupport, setShowSupport] =
    useState(false);

  const [showAbout, setShowAbout] =
    useState(false);

  const [showWhy, setShowWhy] =
    useState(false);

  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

  /* ==========================================================
     ADMIN
  ========================================================== */

  const [adminNotifications, setAdminNotifications] =
    useState([]);

  const [adminNotificationsLoading, setAdminNotificationsLoading] =
    useState(true);

  const [
    dismissedPersonalNotifications,
    setDismissedPersonalNotifications,
  ] = useState(() => new Set());

  const [adminSettings, setAdminSettings] =
    useState(DEFAULT_ADMIN_SETTINGS);

  const [adminSettingsLoading, setAdminSettingsLoading] =
    useState(true);

  const [isSuperAdmin, setIsSuperAdmin] =
    useState(false);

  /* ==========================================================
     IDLE
  ========================================================== */

  const [idleMode, setIdleMode] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState("");

  const idleTimer = useRef(null);

  const currentShowcase =
    SHOWCASES[
      showcaseIndex % SHOWCASES.length
    ];

  /* ==========================================================
     ACTIVE BUSINESS
  ========================================================== */

  const activeBusinessId = useMemo(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return "";
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const queryBusinessId =
      params.get("businessId")?.trim() ||
      params.get("business_id")?.trim();

    if (queryBusinessId) {
      return queryBusinessId;
    }

    const userBusinessId =
      user?.businessId ||
      user?.business_id ||
      user?.business?.business_id ||
      user?.business?.id;

    if (userBusinessId) {
      return String(
        userBusinessId
      ).trim();
    }

    try {
      return (
        localStorage
          .getItem("business_id")
          ?.trim() ||
        localStorage
          .getItem("businessId")
          ?.trim() ||
        ""
      );
    } catch {
      return "";
    }
  }, [
    user.businessId,
    user.business_id,
    user.business,
  ]);

  /* ==========================================================
     BUSINESS-AWARE NAVIGATION
  ========================================================== */

  const navigateWithBusinessId =
    useCallback(
      (path) => {
        if (
          typeof window ===
          "undefined"
        ) {
          return;
        }

        const businessId =
          String(
            activeBusinessId || ""
          ).trim();

        if (!businessId) {
          console.error(
            "[Sodah] Navigation blocked: business ID is not loaded.",
            path
          );
          return;
        }

        const url = new URL(
          path,
          window.location.origin
        );

        url.searchParams.set(
          "businessId",
          businessId
        );

        router.push(
          `${url.pathname}${url.search}${url.hash}`
        );
      },
      [
        activeBusinessId,
        router,
      ]
    );

  /* ==========================================================
     LOAD USER
  ========================================================== */

  const loadUser =
    useCallback(async () => {
      try {
        const auth =
          await getCurrentUser();

        if (
          !auth?.authenticated
        ) {
          router.push("/");
          return;
        }

        setIsSuperAdmin(
          Boolean(
            auth.isSuperAdmin
          )
        );

        const businessId =
          auth?.business
            ?.business_id ||
          auth?.business?.id ||
          "";

        if (businessId) {
          try {
            localStorage.setItem(
              "business_id",
              String(businessId)
            );
          } catch {
            // Optional local persistence.
          }
        }

        setUser({
          fullName:
            auth?.profile
              ?.fullName ||
            auth?.profile?.email
              ?.split("@")[0] ||
            "User",

          email:
            auth?.profile
              ?.email || "",

          phone:
            auth?.profile
              ?.phone || "",

          businessId:
            String(
              businessId
            ),

          businessName:
            auth?.business
              ?.business_name ||
            auth?.business?.name ||
            "Your Business",
        });
      } catch (error) {
        console.error(
          "[Sodah] User loading failed:",
          error
        );

        router.push("/");
      }
    }, [router]);

  /* ==========================================================
     SUBSCRIPTION
  ========================================================== */

  const loadSubscriptionStatus =
    useCallback(async () => {
      try {
        setSubscriptionLoading(
          true
        );

        const auth =
          await getCurrentUser();

        if (
          !auth?.authenticated
        ) {
          setIsPremier(false);
          return;
        }

        const businessId =
          auth?.business
            ?.business_id ||
          auth?.business?.id ||
          activeBusinessId;

        if (!businessId) {
          setIsPremier(false);
          return;
        }

        // Subscription expiry lives in subscription_expiry on current Sodah
        // business records. Keep the older plan_expiry field as a fallback.
        let { data, error } = await supabase
          .from("businesses")
          .select("business_id, subscription_plan, subscription_status, subscription_expiry")
          .eq("business_id", businessId)
          .maybeSingle();

        if (error) {
          // Older deployments may still use plan_expiry. Retry only that
          // legacy schema rather than letting a missing column hide warnings.
          const legacy = await supabase
            .from("businesses")
            .select("business_id, plan, subscription, plan_expiry")
            .eq("business_id", businessId)
            .maybeSingle();
          data = legacy.data;
          error = legacy.error;
        }

        if (error) throw error;

        const rawExpiry = data?.subscription_expiry || data?.plan_expiry || null;
        const expiryDate = rawExpiry ? new Date(rawExpiry) : null;
        setSubscriptionExpiry(
          expiryDate && Number.isFinite(expiryDate.getTime()) ? expiryDate : null
        );
        setDismissedExpiryWarning(false);

        const plan =
          String(
            data?.subscription_plan ||
              data?.plan ||
              data?.subscription ||
              ""
          )
            .trim()
            .toLowerCase();

        const expiry = rawExpiry
          ? new Date(rawExpiry).getTime()
          : NaN;

        const active =
          !Number.isFinite(
            expiry
          ) ||
          expiry >= Date.now();

        setIsPremier(
          active &&
            (
              plan ===
                "premier" ||
              plan ===
                "premium" ||
              plan.includes(
                "premier"
              ) ||
              plan.includes(
                "premium"
              )
            )
        );
      } catch (error) {
        console.error(
          "[Sodah] Subscription status failed:",
          error
        );

        setIsPremier(false);
      } finally {
        setSubscriptionLoading(
          false
        );
      }
    }, [activeBusinessId]);

  /* ==========================================================
     WHATSAPP STATUS
  ========================================================== */

  const loadWhatsAppStatus =
    useCallback(async () => {
      try {
        setWhatsappLoading(
          true
        );

        const auth =
          await getCurrentUser();

        if (
          !auth?.authenticated
        ) {
          setWhatsappConnected(
            false
          );
          return;
        }

        const businessId =
          auth?.business
            ?.business_id ||
          auth?.business?.id ||
          activeBusinessId;

        if (!businessId) {
          setWhatsappConnected(
            false
          );
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("businesses")
          .select(
            "business_id, whatsapp_connected, whatsappConnected"
          )
          .eq(
            "business_id",
            businessId
          )
          .maybeSingle();

        if (error) {
          throw error;
        }

        setWhatsappConnected(
          data?.whatsapp_connected ===
            true ||
            data?.whatsappConnected ===
              true
        );
      } catch (error) {
        console.error(
          "[Sodah] WhatsApp status failed:",
          error
        );

        setWhatsappConnected(
          false
        );
      } finally {
        setWhatsappLoading(
          false
        );
      }
    }, [activeBusinessId]);

  /* ==========================================================
     GMAIL STATUS
  ========================================================== */

  const loadGmailStatus =
    useCallback(async () => {
      try {
        setGmailLoading(
          true
        );

        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const token =
          data?.session
            ?.access_token;

        if (!token) {
          setGmailConnected(
            false
          );

          setGmailAccountEmail(
            ""
          );

          return;
        }

        const response =
          await fetch(
            "/api/inbox-email-ai/connection-status",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const result =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !response.ok ||
          result?.success !==
            true
        ) {
          setGmailConnected(
            false
          );

          setGmailAccountEmail(
            ""
          );

          return;
        }

        const account =
          result?.account ||
          null;

        const email =
          String(
            account?.gmail_email ||
              account?.email ||
              account?.google_email ||
              account?.googleEmail ||
              account?.account_email ||
              account?.accountEmail ||
              result?.gmail ||
              ""
          ).trim();

        setGmailConnected(
          result?.connected ===
            true ||
            Boolean(account)
        );

        setGmailAccountEmail(
          email
        );
      } catch (error) {
        console.error(
          "[Sodah] Gmail status failed:",
          error
        );

        setGmailConnected(
          false
        );

        setGmailAccountEmail(
          ""
        );
      } finally {
        setGmailLoading(
          false
        );
      }
    }, []);

  /* ==========================================================
     ADMIN SETTINGS / NOTIFICATIONS
  ========================================================== */

  const loadAdminNotifications =
    useCallback(async () => {
      try {
        setAdminSettingsLoading(
          true
        );

        setAdminNotificationsLoading(
          true
        );

        const auth =
          await getCurrentUser();

        if (
          !auth?.authenticated
        ) {
          setAdminNotifications(
            []
          );

          return;
        }

        /* GLOBAL PLATFORM SETTINGS */

        try {
          const {
            data: sessionData,
          } =
            await supabase.auth.getSession();

          const headers = {};

          if (
            sessionData?.session
              ?.access_token
          ) {
            headers.Authorization =
              `Bearer ${sessionData.session.access_token}`;
          }

          const response =
            await fetch(
              "/api/platform-settings",
              {
                method: "GET",
                credentials: "include",
                headers,
                cache: "no-store",
              }
            );

          const result =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            response.ok &&
            result?.success &&
            result?.settings
          ) {
            setAdminSettings({
              maintenance_mode:
                Boolean(
                  result.settings
                    .maintenance_mode
                ),

              notifications:
                Boolean(
                  result.settings
                    .notifications
                ),

              maintenance_message:
                result.settings
                  .maintenance_message ||
                DEFAULT_ADMIN_SETTINGS.maintenance_message,

              notification_message:
                result.settings
                  .notification_message ||
                DEFAULT_ADMIN_SETTINGS.notification_message,
            });
          }
        } catch (error) {
          console.error(
            "[Sodah] Platform settings failed:",
            error
          );
        }

        /* PERSONAL BUSINESS NOTIFICATIONS */

        const businessId =
          auth?.business
            ?.business_id ||
          auth?.business?.id;

        if (!businessId) {
          setAdminNotifications(
            []
          );

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from(
            "business_notifications"
          )
          .select(
            "id, business_id, title, message, type, is_read, created_at, expires_at"
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "type",
            "personal"
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

        if (error) {
          throw error;
        }

        const now =
          Date.now();

        const active =
          (data || []).filter(
            (
              notification
            ) => {
              if (
                !notification?.id ||
                notification?.type !==
                  "personal"
              ) {
                return false;
              }

              if (
                notification.expires_at
              ) {
                const expiresAt =
                  new Date(
                    notification.expires_at
                  ).getTime();

                if (
                  Number.isFinite(
                    expiresAt
                  ) &&
                  expiresAt <=
                    now
                ) {
                  return false;
                }
              }

              return true;
            }
          );

        setAdminNotifications(
          active
        );
      } catch (error) {
        console.error(
          "[Sodah] Admin notifications failed:",
          error
        );

        /*
         * Personal notification failure
         * must never disable platform settings.
         */
        setAdminNotifications(
          []
        );
      } finally {
        setAdminNotificationsLoading(
          false
        );

        setAdminSettingsLoading(
          false
        );
      }
    }, []);

  /* ==========================================================
     INITIAL USER
  ========================================================== */

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /* ==========================================================
     RESPONSIVE
  ========================================================== */

  useEffect(() => {
    const closeProfileMenu = (event) => {
      if (!event.target.closest?.("[data-sodah-profile-menu]")) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", closeProfileMenu);
    return () => document.removeEventListener("mousedown", closeProfileMenu);
  }, []);

  useEffect(() => {
    const resize =
      () => {
        setIsMobile(
          window.innerWidth <
            768
        );
      };

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    return () => {
      window.removeEventListener(
        "resize",
        resize
      );
    };
  }, []);

  /* ==========================================================
     SHOWCASE AUTOMATION
     SLOW CINEMATIC ROTATION — FEATURE TEXT THEN PRODUCT PREVIEW
  ========================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setShowcaseIndex(
            (current) =>
              (current + 1) %
              SHOWCASES.length
          );
        },
        SHOWCASE_INTERVAL
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  /* ==========================================================
     BACKGROUND ROTATION
  ========================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setBackgroundIndex(
            (current) =>
              (current + 1) %
              BACKGROUNDS.length
          );
        },
        12000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  /* ==========================================================
     CHANNEL STATUS
  ========================================================== */

  useEffect(() => {
    loadWhatsAppStatus();
    loadGmailStatus();
    loadSubscriptionStatus();
  }, [
    loadWhatsAppStatus,
    loadGmailStatus,
    loadSubscriptionStatus,
  ]);

  /* ==========================================================
     ADMIN REALTIME
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    let settingsChannel =
      null;

    let notificationsChannel =
      null;

    const setup =
      async () => {
        const auth =
          await getCurrentUser();

        const businessId =
          auth?.business
            ?.business_id ||
          auth?.business?.id;

        if (
          !mounted ||
          !auth?.authenticated
        ) {
          if (mounted) {
            setAdminSettingsLoading(
              false
            );

            setAdminNotificationsLoading(
              false
            );
          }

          return;
        }

        await loadAdminNotifications();

        if (!mounted) {
          return;
        }

        /* GLOBAL SETTINGS REALTIME */

        settingsChannel =
          supabase
            .channel(
              "sodah-platform-settings-live"
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table:
                  "settings",
              },
              (payload) => {
                const settings =
                  payload?.new;

                if (!settings) {
                  return;
                }

                setAdminSettings({
                  maintenance_mode:
                    Boolean(
                      settings.maintenance_mode
                    ),

                  notifications:
                    Boolean(
                      settings.notifications
                    ),

                  maintenance_message:
                    settings.maintenance_message ||
                    DEFAULT_ADMIN_SETTINGS.maintenance_message,

                  notification_message:
                    settings.notification_message ||
                    DEFAULT_ADMIN_SETTINGS.notification_message,
                });
              }
            )
            .subscribe();

        /* PERSONAL NOTIFICATION REALTIME */

        if (businessId) {
          notificationsChannel =
            supabase
              .channel(
                `business-personal-notifications-${businessId}`
              )
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema: "public",
                  table:
                    "business_notifications",
                  filter:
                    `business_id=eq.${businessId}`,
                },
                (payload) => {
                  const type =
                    payload?.new
                      ?.type ||
                    payload?.old
                      ?.type;

                  if (
                    type !==
                    "personal"
                  ) {
                    return;
                  }

                  if (
                    payload.eventType ===
                    "DELETE"
                  ) {
                    setAdminNotifications(
                      (current) =>
                        current.filter(
                          (
                            item
                          ) =>
                            item.id !==
                            payload.old
                              ?.id
                        )
                    );

                    setDismissedPersonalNotifications(
                      (
                        current
                      ) => {
                        const next =
                          new Set(
                            current
                          );

                        next.delete(
                          payload
                            .old
                            ?.id
                        );

                        return next;
                      }
                    );

                    return;
                  }

                  const notification =
                    payload.new;

                  if (
                    !notification?.id
                  ) {
                    return;
                  }

                  if (
                    notification.expires_at
                  ) {
                    const expiresAt =
                      new Date(
                        notification.expires_at
                      ).getTime();

                    if (
                      Number.isFinite(
                        expiresAt
                      ) &&
                      expiresAt <=
                        Date.now()
                    ) {
                      return;
                    }
                  }

                  setAdminNotifications(
                    (
                      current
                    ) => {
                      const without =
                        current.filter(
                          (
                            item
                          ) =>
                            item.id !==
                            notification.id
                        );

                      return [
                        notification,
                        ...without,
                      ].sort(
                        (
                          a,
                          b
                        ) =>
                          new Date(
                            b.created_at ||
                              0
                          ).getTime() -
                          new Date(
                            a.created_at ||
                              0
                          ).getTime()
                      );
                    }
                  );
                }
              )
              .subscribe();
        }
      };

    setup();

    return () => {
      mounted = false;

      if (
        settingsChannel
      ) {
        supabase.removeChannel(
          settingsChannel
        );
      }

      if (
        notificationsChannel
      ) {
        supabase.removeChannel(
          notificationsChannel
        );
      }
    };
  }, [
    loadAdminNotifications,
  ]);

  /* ==========================================================
     CLOCK
  ========================================================== */

  useEffect(() => {
    const update =
      () => {
        const now =
          new Date();

        setCurrentTime(
          `${now.toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          )} • ${now.toLocaleDateString(
            [],
            {
              weekday:
                "long",
              month:
                "long",
              day:
                "numeric",
            }
          )}`
        );
      };

    update();

    const timer =
      window.setInterval(
        update,
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  /* ==========================================================
     IDLE MODE
  ========================================================== */

  useEffect(() => {
    const resetIdle =
      () => {
        setIdleMode(
          false
        );

        if (
          idleTimer.current
        ) {
          window.clearTimeout(
            idleTimer.current
          );
        }

        idleTimer.current =
          window.setTimeout(
            () => {
              setIdleMode(
                true
              );
            },
            60000
          );
      };

    window.addEventListener(
      "mousemove",
      resetIdle
    );

    window.addEventListener(
      "keydown",
      resetIdle
    );

    window.addEventListener(
      "click",
      resetIdle
    );

    window.addEventListener(
      "touchstart",
      resetIdle
    );

    resetIdle();

    return () => {
      if (
        idleTimer.current
      ) {
        window.clearTimeout(
          idleTimer.current
        );
      }

      window.removeEventListener(
        "mousemove",
        resetIdle
      );

      window.removeEventListener(
        "keydown",
        resetIdle
      );

      window.removeEventListener(
        "click",
        resetIdle
      );

      window.removeEventListener(
        "touchstart",
        resetIdle
      );
    };
  }, []);

  /* ==========================================================
     CONNECTION SUCCESS
  ========================================================== */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get(
        "connected"
      ) === "true"
    ) {
      setShowSuccess(
        true
      );

      const timer =
        window.setTimeout(
          () => {
            loadWhatsAppStatus();
            loadGmailStatus();
          },
          700
        );

      return () =>
        window.clearTimeout(
          timer
        );
    }

    return undefined;
  }, [
    loadWhatsAppStatus,
    loadGmailStatus,
  ]);

  /* ==========================================================
     NAVIGATION ACTIONS

     These remain available to actual workspace controls.
  ========================================================== */

  const startWhatsApp =
    () => {
      // Use the same proven QR connection flow on every device.
      // This keeps phone and desktop on the exact same working connection path.
      navigateWithBusinessId(
        "/connect-whatsapp/load"
      );
    };

  const openVoiceSettings =
    () => {
      navigateWithBusinessId("/voice-settings");
    };

  const openGmail =
    () => {
      navigateWithBusinessId(
        "/email-ai"
      );
    };

  const openCampaign =
    () => {
      navigateWithBusinessId(
        "/whatsapp-campaign"
      );
    };

  const openCashflow =
    () => {
      navigateWithBusinessId(
        "/cashflow"
      );
    };

  const openTimesheets =
    () => {
      navigateWithBusinessId(
        "/timesheets"
      );
    };

  const openSubscription =
    () => {
      navigateWithBusinessId(
        "/subscription"
      );
    };

  const openSettings =
    () => {
      navigateWithBusinessId(
        "/settings"
      );
    };

  const openInbox =
    () => {
      navigateWithBusinessId(
        "/inbox"
      );
    };

  const openLeads =
    () => {
      navigateWithBusinessId(
        "/dashboard"
      );
    };

  const openBulkEmail =
    () => {
      navigateWithBusinessId(
        "/email-ai"
      );
    };

  const openBusinessAI =
    () => {
      navigateWithBusinessId(
        "/business-update-ai"
      );
    };

  /* ==========================================================
     NAVIGATION GUARANTEE

     All workspace buttons that change pages use
     navigateWithBusinessId(). Buttons that only open/close
     local modals or dismiss notifications do not navigate.
  ========================================================== */

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const handleLogout =
    async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error(
          "[Sodah] Sign out failed:",
          error
        );
      }

      try {
        localStorage.removeItem(
          "user"
        );

        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "business_id"
        );
      } catch {
        // Optional cleanup.
      }

      router.push("/");
    };

  /* ==========================================================
     IDLE SCREEN
  ========================================================== */

  if (idleMode) {
    return (
      <div className="fixed inset-0 z-[500] overflow-hidden bg-[#020806] text-white">
        {BACKGROUNDS.map(
          (
            background,
            index
          ) => (
            <div
              key={background}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[3000ms] ${
                index ===
                backgroundIndex
                  ? "opacity-100"
                  : "opacity-0"
              }`}
              style={{
                backgroundImage:
                  `url("${background}")`,
              }}
            />
          )
        )}

        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
          <SodahLogo large />

          <p className="mt-5 text-sm uppercase tracking-[5px] text-green-300">
            AI BUSINESS WORKSPACE
          </p>

          <p className="mt-8 rounded-full border border-white/10 bg-black/30 px-6 py-3 text-xs text-gray-300 backdrop-blur-xl">
            {currentTime}
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07110d] text-white">
      {/* ======================================================
          PERMANENT SIDEBAR
      ====================================================== */}

      <div className="hidden lg:block">
        <SodahSidebar
          businessId={activeBusinessId}
          user={user}
        />
      </div>

      <div className="min-h-screen lg:pl-[74px]">
        {/* ====================================================
            TOP BAR
        ==================================================== */}

        <header className="fixed left-0 right-0 top-0 z-[180] border-b border-emerald-900/10 bg-white/82 shadow-[0_8px_35px_rgba(7,55,35,0.10)] backdrop-blur-2xl lg:left-[74px]">
          <div className="flex h-[66px] items-center justify-between px-4 md:px-7">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[3px] text-green-700">
                SODAH WORKSPACE
              </p>

              <p className="text-sm font-bold text-gray-900">
                {user.businessName ||
                  "Your Business"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  startWhatsApp
                }
                className="hidden items-center gap-2 rounded-xl border border-green-500/25 bg-green-50/80 px-3 py-2 text-xs font-bold text-green-800 shadow-sm transition duration-500 hover:-translate-y-0.5 hover:bg-green-100 sm:flex"
              >
                <img
                  src={
                    BRAND.whatsapp
                  }
                  alt="WhatsApp"
                  className="h-4 w-4"
                />

                Connect WhatsApp
              </button>

              <button
                type="button"
                onClick={
                  openGmail
                }
                className="hidden items-center gap-2 rounded-xl border border-red-400/25 bg-white/80 px-3 py-2 text-xs font-bold text-gray-800 shadow-sm transition duration-500 hover:-translate-y-0.5 md:flex"
              >
                <img
                  src={
                    BRAND.gmail
                  }
                  alt="Gmail"
                  className="h-4 w-4"
                />

                Gmail
              </button>

              <button
                type="button"
                onClick={
                  openSettings
                }
                className="hidden rounded-xl border border-gray-300 bg-white/70 px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-white md:block"
              >
                Settings
              </button>

              <div className="relative" data-sodah-profile-menu>
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((value) => !value)}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/85 p-1.5 pr-2.5 shadow-sm transition hover:border-emerald-300 hover:bg-white"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 font-black text-black">
                    {(user.fullName || "U").charAt(0).toUpperCase()}
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="max-w-[130px] truncate text-xs font-bold text-gray-900">
                      {user.fullName || "User"}
                    </p>
                    <p className="max-w-[130px] truncate text-[9px] text-gray-500">
                      {user.email || "Account"}
                    </p>
                  </div>

                  <span className="ml-1 text-xs font-black text-gray-400">⌄</span>
                </button>

                {showProfileMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+10px)] z-[260] w-[230px] overflow-hidden rounded-2xl border border-gray-200 bg-white/98 p-2 shadow-[0_25px_70px_rgba(15,23,42,.20)] backdrop-blur-2xl"
                  >
                    <div className="border-b border-gray-100 px-3 py-2.5">
                      <p className="text-[9px] font-black uppercase tracking-[1.8px] text-emerald-600">
                        SODAH ACCOUNT
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-gray-900">
                        {user.fullName || "User"}
                      </p>
                      <p className="truncate text-[10px] text-gray-500">
                        {user.email || "Account"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigateWithBusinessId("/profile");
                      }}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      role="menuitem"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">◉</span>
                      My Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        openSubscription();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-purple-50 hover:text-purple-700"
                      role="menuitem"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">◆</span>
                      Subscription
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        openSettings();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-slate-50 hover:text-slate-900"
                      role="menuitem"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">⚙</span>
                      Settings
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-black text-red-600 transition hover:bg-red-50"
                      role="menuitem"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">↪</span>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* INLINE NOTICE STRIP — occupies space only while an expiry warning or announcement is active. */}
        <div className="pt-[66px]">
        {/* SUBSCRIPTION EXPIRY WARNING — shown during the final five days */}
        {!subscriptionLoading && subscriptionExpiry && (() => {
          const expiryEndOfDay = new Date(subscriptionExpiry);
          expiryEndOfDay.setHours(23, 59, 59, 999);
          const remainingMs = expiryEndOfDay.getTime() - expiryClock;
          const daysLeft = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
          if (remainingMs < 0 || daysLeft > 5 || dismissedExpiryWarning) return null;
          return (
            <div role="status" aria-live="polite" className="w-full border-b-2 border-yellow-500 bg-amber-100 text-amber-950 shadow-sm lg:ml-[74px] lg:w-[calc(100%-74px)]">
              <div className="flex min-h-11 items-center gap-3 px-3 py-2">
                <span aria-hidden="true" className="text-xl leading-none">⚠️</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold leading-5 tracking-wide">
                    {daysLeft === 0 ? "⚠ YOUR SODAH SUBSCRIPTION EXPIRES TODAY — renew to avoid interruption." : `⚠ YOUR SODAH SUBSCRIPTION EXPIRES IN ${daysLeft} DAY${daysLeft === 1 ? "" : "S"} — renew before the final day to avoid interruption.`}
                  </p>
                </div>
                <button type="button" onClick={() => setDismissedExpiryWarning(true)} aria-label="Close subscription expiry warning" className="shrink-0 rounded px-2 text-xl font-black text-amber-900 hover:bg-amber-200">×</button>
              </div>
            </div>
          );
        })()}

        {!adminSettingsLoading && adminSettings.notifications && !adminSettings.maintenance_mode && (
          <div className="w-full border-b border-amber-300 bg-slate-900 text-white lg:ml-[74px] lg:w-[calc(100%-74px)]">
            <div className="flex min-h-9 items-center gap-3 px-3 py-2">
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[1.5px] text-emerald-300">SODAH ANNOUNCEMENT</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-gray-100">📢 {adminSettings.notification_message}</p>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* ====================================================
            PAGE
        ==================================================== */}

        <main className="relative min-h-[calc(100vh-66px)] overflow-hidden px-3 pb-20 pt-6 md:px-6 md:pt-7">
          {/* ==================================================
              BACKGROUND
          ================================================== */}

          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-[#f3fbf5] via-[#edf8f2] to-[#f5fbff]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(34,197,94,0.12),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_75%_85%,rgba(255,255,255,0.55),transparent_35%)]" />
          </div>

          <div className="mx-auto max-w-[1480px]">

            {/* =================================================
                LAYER 1
                COMPACT HERO
            ================================================= */}

            <section className="relative mb-5 overflow-hidden rounded-[30px] border border-emerald-300/25 bg-gradient-to-br from-[#06251a] via-[#0a3827] to-[#063b35] shadow-[0_35px_110px_rgba(5,55,35,0.28)]">
              <div className="grid min-h-[345px] lg:grid-cols-[0.92fr_1.08fr]">

                {/* HERO COPY */}

                <div className="relative flex items-center overflow-hidden bg-gradient-to-br from-[#06251a]/95 via-[#0a3a28]/92 to-[#0a4b40]/85 p-6 md:p-8 xl:p-10">
                  <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />

                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[3px] text-emerald-300">
                      SODAH AUTOMATION
                    </p>

                    <h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-1.5px] text-emerald-50 md:text-5xl xl:text-[60px]">
                      Welcome back,
                      <br />

                      <span>
                        {(user.fullName || "there").split(" ")[0]}
                      </span>

                      <span className="ml-2 inline-block text-3xl md:text-4xl">
                        👋
                      </span>
                    </h1>

                    <p className="mt-4 text-lg font-black text-emerald-300 md:text-xl">
                      Your business tools in one place
                    </p>

                    {/* DESCRIPTION AS PREMIUM INFO PANEL */}

                    <div className="mt-4 max-w-[620px] rounded-2xl border border-green-400/25 bg-gradient-to-r from-green-50/90 via-white/75 to-cyan-50/80 p-4 shadow-[0_15px_45px_rgba(16,185,129,0.10)] backdrop-blur-xl">
                      <p className="text-xs font-medium leading-6 text-gray-700 md:text-sm">
                        Sodah.io is a powerful,
                        all-in-one platform that
                        helps you manage
                        conversations,
                        customers, automation,
                        campaigns, finances
                        and your team — so you
                        can grow your business
                        faster, save time and get
                        more done.
                      </p>
                    </div>

                  </div>
                </div>

                {/* HERO PHONE VISUAL */}

                <HeroPhoneVisual
                  whatsappConnected={
                    whatsappConnected
                  }
                  currentShowcase={
                    currentShowcase
                  }
                  onConnectWhatsApp={
                    openVoiceSettings
                  }
                />
              </div>
            </section>

            {/* =================================================
                LAYER 2
                AUTOMATIC MOVING SHOWCASE
            ================================================= */}

            <section className="relative mb-5 overflow-hidden rounded-[28px] border border-emerald-200/45 bg-gradient-to-br from-[#f2fff7]/92 via-[#e8faf1]/78 to-[#e9fbff]/82 shadow-[0_30px_90px_rgba(20,80,55,0.16)] backdrop-blur-2xl">

              <div
                key={`layer-two-project-${currentShowcase.id}`}
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                style={{ animation: "sodah-project-crossfade 1500ms ease both" }}
              >
                <img
                  src={SODAH_PROJECT_IMAGES[0]}
                  alt=""
                  aria-hidden="true"
                  className="absolute right-[-7%] top-[-28%] h-[160%] w-[55%] object-contain opacity-[0.10]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#f2fff7] via-[#f2fff7]/92 to-[#e9fbff]/65" />
              </div>

              <div className="relative z-10 flex items-center justify-between border-b border-emerald-900/10 px-5 py-4 md:px-7">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2.5px] text-green-700">
                    LIVE WORKSPACE
                  </p>

                  <h2 className="mt-1 text-xl font-black text-gray-900 md:text-2xl">
                    Every Sodah tool, showcased automatically.
                  </h2>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[1.7px] text-slate-400">
                    20 premium product stories • fast premium rotation
                  </p>
                </div>

<div className="text-[9px] font-black uppercase tracking-[1.5px] text-emerald-700">WhatsApp automation</div>
              </div>

              {/* =================================================
                  IMPORTANT:
                  NO BUTTONS INSIDE THIS SHOWCASE.
                  IT IS A PRODUCT VISUAL ONLY.
              ================================================= */}

              <div className="relative z-10 overflow-hidden">
                <div className="flex">
                  <ShowcaseSlide
                    item={SHOWCASES[0]}
                    whatsappConnected={whatsappConnected}
                    gmailConnected={gmailConnected}
                    gmailEmail=""
                  />
                </div>
              </div>


            </section>

            {/* =================================================
                LAYER 3
                COMPLETE OPERATING LAYER
            ================================================= */}

            <section className="mb-5 rounded-[28px] border border-emerald-200/45 bg-gradient-to-br from-[#effcf4]/92 via-white/65 to-[#eafaff]/80 p-5 shadow-[0_25px_80px_rgba(20,80,55,0.14)] backdrop-blur-2xl md:p-7">

              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2.5px] text-green-700">
                    BUSINESS TOOLS
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-gray-900 md:text-3xl">
                    Your complete operating layer.
                  </h2>
                </div>

                <p className="max-w-xl text-xs leading-5 text-gray-600">
                  Communication, campaigns,
                  customer management and
                  business operations in one
                  connected workspace.
                </p>
              </div>

              {/* Desktop quick-access tiles removed as requested. */}

              {/* PHONE QUICK ACCESS — only the Automate WhatsApp action */}
              <div className="grid grid-cols-1 gap-3 sm:max-w-sm lg:hidden">
                <ToolTile
                  logo={BRAND.whatsapp}
                  label="Automate WhatsApp"
                  onClick={openVoiceSettings}
                  featured
                  accent="whatsapp"
                />
                <div className="-mt-1 rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-[#062d20] via-[#073b2b] to-[#07111a] p-4 text-left shadow-[0_16px_40px_rgba(37,211,102,.12)]">
                  <p className="text-sm font-black leading-5 text-white">Connect WhatsApp. Automate your business.</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-50/90">For the best experience, sign in to your Sodah account on a computer to connect leads, appointment booking, WhatsApp broadcasts and campaigns, spreadsheets, and your business details.</p>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[1.5px] text-[#25D366]">Tap to start WhatsApp automation ↑</p>
                </div>
              </div>
            </section>

            {/* =================================================
                SODAH INTELLIGENCE
            ================================================= */}

            <section className="mb-5 overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-green-50/80 via-white/45 to-cyan-50/70 p-6 shadow-[0_25px_80px_rgba(20,80,60,0.12)] backdrop-blur-2xl md:p-8">

              <div className="grid gap-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2.5px] text-green-700">
                    SODAH INTELLIGENCE
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-4xl">
                    Turn conversations into business activity.
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                    AI assistance helps your
                    business respond, follow up,
                    organize customer activity
                    and keep important
                    conversations moving.
                  </p>
                </div>

              </div>
            </section>

            {/* =================================================
                FOOTER
            ================================================= */}

            <footer className="flex flex-col gap-3 border-t border-gray-300/70 py-7 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="font-black text-gray-700">
                  Sodah.io
                </span>{" "}
                — AI Business Workspace
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowWhy(
                      true
                    )
                  }
                  className="transition hover:text-green-600"
                >
                  Why Sodah.io
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowAbout(
                      true
                    )
                  }
                  className="transition hover:text-green-600"
                >
                  About Us
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowSupport(
                      true
                    )
                  }
                  className="transition hover:text-green-600"
                >
                  Help & Support
                </button>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="transition hover:text-red-500"
                >
                  Logout
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>

        <style>{`
          @keyframes sodah-hero-story-copy {
            0% { opacity: 0; transform: translate3d(18px, -10px, 0) scale(.96); filter: blur(4px); }
            70% { opacity: 1; transform: translate3d(-2px, 2px, 0) scale(1.01); filter: blur(0); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          }
          @keyframes sodah-hero-visual-in {
            0% { opacity: 0; transform: translate3d(-24px, 26px, 0) scale(.86) rotate(-2deg); }
            70% { opacity: 1; transform: translate3d(3px, -2px, 0) scale(1.02) rotate(.5deg); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0); }
          }
          @keyframes sodah-hero-device-in {
            0% { opacity: 0; transform: translate3d(45px, 55px, 0) scale(.78); }
            70% { opacity: 1; transform: translate3d(-4px, -2px, 0) scale(1.02); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          }

          @keyframes sodah-phone-enter {
            0% { opacity: 0; transform: translateY(24px) scale(.92) rotate(-8deg); }
            60% { opacity: 1; transform: translateY(-5px) scale(1.02) rotate(-3deg); }
            100% { opacity: 1; transform: translateY(0) scale(1) rotate(-5deg); }
          }

          @keyframes sodah-hero-message-in {
            0% { opacity: 0; transform: translate3d(-20px, 12px, 0) scale(.94); }
            65% { opacity: 1; transform: translate3d(4px, -2px, 0) scale(1.01); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          }

          @keyframes sodah-hero-image-in {
            0% { opacity: 0; transform: translate3d(-30px, 20px, 0) scale(.82) rotate(-4deg); }
            65% { opacity: 1; transform: translate3d(4px, -2px, 0) scale(1.02) rotate(1deg); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
          }

          /* HERO DEVICE HANDOFF
             20-second loop:
             0–42%   phone is visible
             42–50%  phone slides toward the welcome-copy area and disappears
             50–58%  laptop slides in and opens
             58–92%  laptop stays open and projects the workspace
             92–100% laptop exits so the phone can return on the next cycle
          */
          .sodah-device-phone {
            animation: sodah-phone-cycle 20s cubic-bezier(.22,1,.36,1) infinite;
            transform-origin: 50% 90%;
          }

          .sodah-device-laptop {
            animation: sodah-laptop-cycle 20s cubic-bezier(.22,1,.36,1) infinite;
            transform-origin: 50% 100%;
          }

          .sodah-device-companion {
            animation: sodah-companion-cycle 20s cubic-bezier(.22,1,.36,1) infinite;
          }

          .sodah-laptop-projection {
            animation: sodah-projection-cycle 20s ease-in-out infinite;
          }

          @keyframes sodah-phone-cycle {
            0%, 38% {
              opacity: 1;
              transform: translate3d(0,0,0) scale(1) rotate(0deg);
            }
            44% {
              opacity: 1;
              transform: translate3d(-70px,-12px,0) scale(.96) rotate(-3deg);
            }
            50%, 96%, 100% {
              opacity: 0;
              transform: translate3d(-250px,-65px,0) scale(.72) rotate(-10deg);
            }
          }

          @keyframes sodah-laptop-cycle {
            0%, 43% {
              opacity: 0;
              transform: translate3d(190px,55px,0) scale(.76) rotate(3deg);
            }
            50% {
              opacity: 1;
              transform: translate3d(70px,12px,0) scale(.90) rotate(1deg);
            }
            58%, 88% {
              opacity: 1;
              transform: translate3d(0,0,0) scale(1) rotate(0deg);
            }
            96% {
              opacity: 0;
              transform: translate3d(190px,45px,0) scale(.82) rotate(3deg);
            }
            100% {
              opacity: 0;
              transform: translate3d(190px,55px,0) scale(.76) rotate(3deg);
            }
          }

          @keyframes sodah-companion-cycle {
            0%, 38% {
              opacity: 1;
              transform: translate3d(0,0,0) scale(1);
            }
            44% {
              opacity: 1;
              transform: translate3d(-35px,-10px,0) scale(.96);
            }
            50%, 96%, 100% {
              opacity: 0;
              transform: translate3d(-170px,-55px,0) scale(.72);
            }
          }

          @keyframes sodah-projection-cycle {
            0%, 55% {
              opacity: 0;
              transform: translate3d(-50%,35px,0) scale(.82);
            }
            62%, 86% {
              opacity: 1;
              transform: translate3d(-50%,0,0) scale(1);
            }
            92%, 100% {
              opacity: 0;
              transform: translate3d(-50%,-10px,0) scale(.94);
            }
          }
          @keyframes sodah-scene-in {
            0% { opacity: 0; transform: translateY(8px) scale(.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes sodah-feature-pop {
            0% { opacity: 0; transform: translateY(6px) scale(.94); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes sodah-message-in {
            0% { opacity: 0; transform: translateY(9px) scale(.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes sodah-qr-scan {
            0%, 100% { transform: translateY(0); opacity: .35; }
            50% { transform: translateY(56px); opacity: 1; }
          }
          @keyframes sodah-pulse {
            0%, 100% { transform: scale(.75); opacity: .45; }
            50% { transform: scale(1.2); opacity: 1; }
          }
          @keyframes sodah-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-7px); }
          }
          @keyframes sodah-progress {
            0% { width: 18%; }
            50% { width: 82%; }
            100% { width: 62%; }
          }
          @keyframes sodah-bar {
            from { transform: scaleY(.72); transform-origin: bottom; }
            to { transform: scaleY(1); transform-origin: bottom; }
          }
          @keyframes sodah-project-crossfade {
            0% { opacity: 0; transform: scale(1.025); }
            100% { opacity: 1; transform: scale(1); }
          }

          @keyframes sodah-project-card-in {
            0% { opacity: 0; transform: translate3d(28px, 18px, 0) scale(.86) rotate(2deg); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
          }

          @media (prefers-reduced-motion: reduce) {
            .sodah-message-in,
            .sodah-scene-in,
            .sodah-feature-pop,
            .sodah-device-phone,
            .sodah-device-laptop,
            .sodah-device-companion,
            .sodah-laptop-projection,
            .sodah-hero-message-in,
            .sodah-hero-image-in {
              animation: none !important;
            }

            .sodah-device-phone {
              opacity: 1 !important;
              transform: translate3d(0,0,0) scale(1) rotate(0deg) !important;
            }

            .sodah-device-laptop,
            .sodah-laptop-projection {
              opacity: 0 !important;
            }
          }
        `}</style>

      {/* ========================================================
          ADMIN MAINTENANCE
      ======================================================== */}

      {!adminSettingsLoading &&
        adminSettings.maintenance_mode &&
        !isSuperAdmin && (
          <MaintenanceOverlay
            message={
              adminSettings.maintenance_message
            }
          />
        )}

      {/* ========================================================
          PERSONAL ADMIN NOTIFICATIONS
      ======================================================== */}

      {!adminNotificationsLoading &&
        adminNotifications.length >
          0 && (
          <div className="fixed left-1/2 top-[88px] z-[210] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-3">
            {adminNotifications.map(
              (
                notification
              ) => {
                if (
                  dismissedPersonalNotifications.has(
                    notification.id
                  )
                ) {
                  return null;
                }

                return (
                  <div
                    key={
                      notification.id
                    }
                    className="relative rounded-2xl border border-cyan-400/25 bg-[#06110c]/95 p-4 shadow-2xl backdrop-blur-2xl"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setDismissedPersonalNotifications(
                          (
                            current
                          ) => {
                            const next =
                              new Set(
                                current
                              );

                            next.add(
                              notification.id
                            );

                            return next;
                          }
                        )
                      }
                      className="absolute right-3 top-3 text-gray-500 transition hover:text-white"
                      aria-label="Dismiss notification"
                    >
                      ×
                    </button>

                    <p className="text-[9px] font-black uppercase tracking-[2px] text-cyan-300">
                      Personal Message
                    </p>

                    <h3 className="mt-1 pr-6 text-sm font-black text-white">
                      {notification.title ||
                        "Personal Message"}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-300">
                      {
                        notification.message
                      }
                    </p>
                  </div>
                );
              }
            )}
          </div>
        )}

      {/* ========================================================
          SUPPORT
      ======================================================== */}

      <button
        type="button"
        onClick={() =>
          setShowSupport(
            true
          )
        }
        aria-label="Open AI Help and Support"
        className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-2xl border border-cyan-300/25 bg-white/85 px-3 py-2.5 text-gray-900 shadow-2xl backdrop-blur-xl transition duration-500 hover:-translate-y-1"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 text-black">
          🤖
        </span>

        <span className="hidden text-left sm:block">
          <span className="block text-[8px] font-black uppercase tracking-[1.5px] text-cyan-700">
            AI Assistant
          </span>

          <span className="block text-xs font-bold">
            Help & Support
          </span>
        </span>
      </button>

      {/* ========================================================
          MODALS
      ======================================================== */}

      {showSupport && (
        <SupportModal
          user={user}
          onClose={() =>
            setShowSupport(
              false
            )
          }
          onNavigate={navigateWithBusinessId}
        />
      )}

      {showWhy && (
        <InfoModal
          eyebrow="WHY SODAH.IO"
          title="Powerful business automation in one workspace."
          onClose={() =>
            setShowWhy(
              false
            )
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBox
              icon="⚡"
              title="Fast setup"
              text="Connect your business tools and start using the workspace without unnecessary technical complexity."
            />

            <InfoBox
              icon="🤖"
              title="AI-powered"
              text="Use AI assistance across customer conversations, email and repetitive business workflows."
            />

            <InfoBox
              icon="📱"
              title="WhatsApp connection"
              text="Connect your existing WhatsApp through the supported QR connection flow."
            />

            <InfoBox
              icon="📈"
              title="Built to scale"
              text="Start with the tools your business needs and expand the workspace as your team grows."
            />
          </div>
        </InfoModal>
      )}

      {showAbout && (
        <InfoModal
          eyebrow="ABOUT SODAH.IO"
          title="AI Business Workspace"
          onClose={() =>
            setShowAbout(
              false
            )
          }
        >
          <div className="space-y-4 text-sm leading-7 text-gray-300">
            <p>
              Sodah.io is an AI business
              workspace designed to bring
              customer communication,
              automation and business
              operations into one connected
              environment.
            </p>

            <p>
              The platform helps businesses
              respond faster, automate
              repetitive work, organize
              customer activity and maintain
              a professional digital
              operation.
            </p>

            <div className="rounded-2xl border border-green-400/15 bg-green-400/[0.05] p-5">
              <p className="font-black text-green-300">
                AI BUSINESS WORKSPACE
              </p>

              <p className="mt-2">
                Conversations. Automation.
                Customers. Business
                operations.
              </p>
            </div>
          </div>
        </InfoModal>
      )}

      <WelcomeCompleteModal
        open={showSuccess}
        onClose={() =>
          setShowSuccess(
            false
          )
        }
      />
    </div>
  );
}

/* ============================================================
   LAYER 1 — HERO PHONE
============================================================ */


const DEVICE_SCENES = [
  {
    id: "whatsapp",
    color: "#25D366",
    label: "WHATSAPP",
    headline: "Conversations handled automatically",
    features: [
      ["Connect", "Scan QR"],
      ["Reply", "24/7 AI"],
      ["History", "Delivered"],
    ],
  },
  {
    id: "appointments",
    color: "#3B82F6",
    label: "APPOINTMENTS",
    headline: "Turn chats into confirmed bookings",
    features: [
      ["Booking", "2:00 PM"],
      ["Calendar", "Synced"],
      ["Reminder", "Scheduled"],
    ],
  },
  {
    id: "campaigns",
    color: "#22C55E",
    label: "CAMPAIGNS",
    headline: "Launch campaigns and track delivery",
    features: [
      ["Send", "1,248"],
      ["Delivered", "932"],
      ["Replies", "318"],
    ],
  },
  {
    id: "gmail",
    color: "#0f766e",
    label: "GMAIL AI",
    headline: "Your inbox, organized and assisted",
    features: [
      ["Inbox", "124"],
      ["AI Reply", "Ready"],
      ["Auto-send", "On"],
    ],
  },
  {
    id: "analytics",
    color: "#06B6D4",
    label: "ANALYTICS",
    headline: "See leads, bookings and revenue move",
    features: [
      ["Leads", "+120%"],
      ["Bookings", "+80%"],
      ["Revenue", "+95%"],
    ],
  },
  {
    id: "cashflow",
    color: "#F59E0B",
    label: "CASHFLOW",
    headline: "Track income and expenses in real time",
    features: [
      ["Income", "$12.4K"],
      ["Expenses", "$4.8K"],
      ["Net", "+$7.6K"],
    ],
  },
  {
    id: "timesheets",
    color: "#38BDF8",
    label: "TIME-SHEETS",
    headline: "Know who is working and for how long",
    features: [
      ["Team", "12 online"],
      ["Hours", "86.5h"],
      ["Attendance", "96%"],
    ],
  },
  {
    id: "workspace",
    color: "#8B5CF6",
    label: "WORKSPACE",
    headline: "Everything connected in one place",
    features: [
      ["Tools", "8 active"],
      ["AI", "24/7"],
      ["Status", "Healthy"],
    ],
  },
];

function HeroPhoneVisual({
  whatsappConnected,
  currentShowcase,
  onConnectWhatsApp,
}) {
  const [storyIndex, setStoryIndex] = useState(0);

  const HERO_STORIES = [
    ...HERO_FEATURES.map((item, index) => {
      const device = [
        "phone", "laptop", "laptop", "laptop", "phone",
        "laptop", "laptop", "laptop", "phone", "phone",
        "laptop", "phone", "laptop", "phone", "laptop",
        "laptop", "laptop", "phone", "phone", "laptop",
      ][index] || "laptop";

      const images = [
        HERO_SHOWCASE_IMAGES[0],
        HERO_SHOWCASE_IMAGES[1],
        HERO_SHOWCASE_IMAGES[2],
        HERO_SHOWCASE_IMAGES[0],
        HERO_SHOWCASE_IMAGES[1],
        HERO_SHOWCASE_IMAGES[2],
        SODAH_PROJECT_IMAGES[0],
        SODAH_PROJECT_IMAGES[1],
        HERO_SHOWCASE_IMAGES[0],
        HERO_SHOWCASE_IMAGES[2],
        SODAH_PROJECT_IMAGES[1],
        HERO_SHOWCASE_IMAGES[1],
        HERO_SHOWCASE_IMAGES[0],
        HERO_SHOWCASE_IMAGES[2],
        SODAH_PROJECT_IMAGES[0],
        SODAH_PROJECT_IMAGES[1],
        HERO_SHOWCASE_IMAGES[2],
        HERO_SHOWCASE_IMAGES[0],
        HERO_SHOWCASE_IMAGES[1],
        SODAH_PROJECT_IMAGES[0],
      ];

      const metrics = [
        [["Workspace", "All-in-one"], ["AI", "24/7"], ["Tools", "Connected"]],
        [["Connection", "QR code"], ["Setup", "Fast"], ["AI", "Ready"]],
        [["WhatsApp", "Existing"], ["Connection", "Active"], ["AI", "Ready"]],
        [["Business", "WhatsApp"], ["Stability", "Priority"], ["Control", "Yours"]],
        [["AI replies", "24/7"], ["Response", "Fast"], ["Support", "Always on"]],
        [["Bookings", "Appointments"], ["Follow-ups", "Automatic"], ["Reminders", "On"]],
        [["Products", "Showcase"], ["Offers", "Promote"], ["WhatsApp", "Ready"]],
        [["Voice notes", "AI"], ["Languages", "Multiple"], ["Replies", "Natural"]],
        [["Languages", "100+"], ["Replies", "Natural"], ["Support", "24/7"]],
        [["Business info", "Editable"], ["Updates", "Anytime"], ["Control", "Yours"]],
        [["Broadcasts", "WhatsApp"], ["Campaigns", "Managed"], ["Reach", "Customers"]],
        [["Messages", "1,000+"], ["Channel", "WhatsApp"], ["Campaigns", "Ready"]],
        [["Schedule", "Daily"], ["Repeat", "Weekly"], ["Repeat", "Monthly"]],
        [["Templates", "Ready"], ["Messages", "Business"], ["Creation", "Faster"]],
        [["History", "Saved"], ["Drafts", "Available"], ["Chats", "Organized"]],
        [["Business data", "Managed"], ["Records", "Organized"], ["Workspace", "One place"]],
        [["Check-in", "Tracked"], ["Check-out", "Tracked"], ["Hours", "Organized"]],
        [["Invoices", "Managed"], ["Cashflow", "Visible"], ["Finance", "Organized"]],
        [["Leads", "Managed"], ["Dashboard", "Live"], ["Follow-up", "Ready"]],
        [["Starter", "$41"], ["Features", "Included"], ["Workspace", "Sodah"]],
      ];

      const descriptions = HERO_FEATURES.map((feature) => feature.description);

      return {
        id: item.id,
        eyebrow: item.eyebrow,
        title: item.title,
        text: descriptions[index] || item.description,
        accent: item.color,
        image: images[index],
        device,
        metrics: metrics[index],
      };
    }),
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStoryIndex((value) => (value + 1) % (HERO_STORIES.length * 2));
    }, SHOWCASE_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  const featureIndex = Math.floor(storyIndex / 2);
  const textOnlySlide = storyIndex % 2 === 0;
  const story = HERO_STORIES[featureIndex];
  const showcaseId = story.id;
  const scene = DEVICE_SCENES.find((item) => item.id === showcaseId) || DEVICE_SCENES[storyIndex % DEVICE_SCENES.length];

  if (textOnlySlide) {
    return (
      <div
        key={`hero-text-only-${story.id}`}
        className="relative flex min-h-[345px] items-center overflow-hidden px-6 py-8 md:px-8 lg:px-10"
        style={{ background: `linear-gradient(135deg, ${story.accent}, ${story.accent}dd 58%, #061f18)` }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[30px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 max-w-[650px]" style={{ animation: "sodah-hero-story-copy 520ms cubic-bezier(.22,1,.36,1) both" }}>
          <p className="text-[9px] font-black uppercase tracking-[3px] text-white/75">SODAH FEATURE {String(featureIndex + 1).padStart(2, "0")} / {HERO_FEATURES.length}</p>
          <h2 className="mt-5 text-3xl font-black leading-[1.04] tracking-[-1px] text-white sm:text-4xl md:text-5xl xl:text-[54px]">{story.title}</h2>
        </div>
      </div>
    );
  }

  const PREVIEW_SCENES = {
    "growth-priority": { contact: "Sodah Workspace", status: "Workspace connected", message: "Your business tools are ready in one place.", detail: "Business overview · Leads · Activity" },
    "qr-connection": { contact: "WhatsApp connection", status: "Connected securely", message: "Your QR connection is ready. Sodah can now help manage customer conversations.", detail: "Connection active · AI ready" },
    "whatsapp": { contact: "Customer chat", status: "Online", message: "Hello! Welcome to our business. How can we help you today?", detail: "Existing business WhatsApp" },
    "whatsapp-stability": { contact: "Business WhatsApp", status: "Connected", message: "Your customers can keep contacting your usual business number.", detail: "Your number · Your customers" },
    "ai-assistant": { contact: "New customer", status: "AI assistant replying", message: "Hi there 👋 Thanks for contacting us. What can I help you with today?", detail: "Automatic reply · 24/7" },
    "appointments": { contact: "Appointment booking", status: "Booking details collected", message: "You're booked in! We'll send you a reminder before your appointment.", detail: "Appointment · Follow-up · Reminder" },
    "promotions-products": { contact: "Customer", status: "Promotion delivered", message: "Hi 👋 We have a special offer available today. Would you like to see our products and prices?", detail: "Product photo · Offer · WhatsApp chat" },
    "voice-notes": { contact: "Customer voice note", status: "Voice note understood", message: "Thanks for your voice message. I understand what you need and can help you with that.", detail: "Voice note · AI response" },
    "multilingual-ai": { contact: "Customer · Español", status: "Reply in customer's language", message: "¡Hola! Gracias por escribirnos. ¿En qué podemos ayudarte hoy?", detail: "Language detected · Reply sent" },
    "business-updates": { contact: "Business details", status: "Update saved", message: "Your business details have been updated. Let us know if you need anything else.", detail: "Services · Hours · Business information" },
    "campaign": { contact: "WhatsApp campaign", status: "Campaign running", message: "Hello! We wanted to share our latest offer with you. Reply here if you'd like more details.", detail: "Audience selected · Campaign sent" },
    "bulk-messaging": { contact: "Broadcast center", status: "Sending complete", message: "Your campaign has finished sending. Delivery results are available in your workspace.", detail: "10,000 recipients · Delivery report" },
    "team-schedule": { contact: "Scheduled message", status: "Next send scheduled", message: "Reminder: our weekly update will be sent automatically at the scheduled time.", detail: "Daily · Weekly · Monthly" },
    "message-templates": { contact: "Message template", status: "Template ready", message: "Hello {{customer_name}}, thank you for choosing {{business_name}}. How can we assist you?", detail: "Reusable · Personalised · Ready to send" },
    "whatsapp-history": { contact: "Message drafts", status: "Draft saved", message: "Your unsent message is saved. Open your history to continue where you left off.", detail: "Chat history · Saved drafts" },
    "business-data": { contact: "Business workspace", status: "Records organized", message: "Your business information and customer activity are available from one workspace.", detail: "Business records · Customer activity" },
    "timesheets": { contact: "Team timesheet", status: "Attendance recorded", message: "Check-in recorded at 9:00 AM. Your working hours will update when you check out.", detail: "Employee · Check-in · Check-out" },
    "cashflow": { contact: "Invoice #1048", status: "Invoice recorded", message: "Invoice saved successfully. Your business cashflow summary has been updated.", detail: "Invoice · Payment status · Cashflow" },
    "leads": { contact: "New lead", status: "Lead captured", message: "A new customer enquiry has been added to your lead dashboard for follow-up.", detail: "Lead captured · Follow-up available" },
    "starter-price": { contact: "Sodah Starter", status: "Plan overview", message: "Get the Sodah Starter features for $41. Manage customer conversations and business activity in one place.", detail: "Starter plan · $41" },
  };
  const preview = PREVIEW_SCENES[story.id] || PREVIEW_SCENES.whatsapp;
  const isBulk = story.id === "bulk-messaging";
  const isPromotion = story.id === "promotions-products";
  const isBusinessUpdate = story.id === "business-updates";
  const isCampaign = story.id === "campaign" || isBulk;

  /* Preview slide: the feature title is intentionally NOT repeated here.
     Show the actual customer-facing flow or a focused app screen instead of old marketing artwork. */
  return (
    <div
      key={`hero-real-preview-${story.id}`}
      className="relative min-h-[345px] overflow-hidden px-4 py-4 sm:px-6 md:px-8"
      style={{
        background: `radial-gradient(circle at 82% 10%, ${story.accent}66, transparent 36%), linear-gradient(135deg, ${story.accent} 0%, ${story.accent}e8 52%, #07111a 100%)`,
      }}
    >
      <div className="absolute inset-0 overflow-hidden opacity-40" aria-hidden="true">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[28px] border-white" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[313px] items-center justify-center">
        {isBusinessUpdate || story.id === "business-data" || story.id === "timesheets" || story.id === "cashflow" || story.id === "leads" || story.id === "starter-price" || story.id === "growth-priority" ? (
          <div className="w-full max-w-[600px] overflow-hidden rounded-[22px] border border-white bg-white/95 shadow-[0_24px_65px_rgba(15,23,42,.17)]" style={{ animation: "sodah-hero-visual-in 620ms cubic-bezier(.22,1,.36,1) both" }}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white" style={{ backgroundColor: story.accent }}>S</span>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold text-slate-800">{preview.contact}</p><p className="text-[8px] text-slate-500">{preview.status}</p></div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[7px] font-black text-emerald-700">● LIVE</span>
            </div>
            {isBusinessUpdate ? (
              <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
                {[["Business name", "Sodah Business"], ["Working hours", "9:00 AM – 6:00 PM"], ["Services", "Updated"], ["Languages", "Multiple"], ["Contact", "Saved"], ["Status", "Up to date"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-[9px] font-extrabold text-slate-800">{value}</p></div>)}
              </div>
            ) : isBulk || isCampaign ? (
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-extrabold text-slate-800">{isBulk ? "WhatsApp broadcast" : "Customer promotion"}</p><p className="mt-1 text-[8px] text-slate-500">{isBulk ? "10,000 recipients selected" : "Campaign audience selected"}</p></div><span className="rounded-lg bg-emerald-600 px-3 py-2 text-[8px] font-black text-white">{isBulk ? "Send messages" : "Send campaign"}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-emerald-500" /></div>
                <div className="mt-3 grid grid-cols-3 gap-2">{[[isBulk ? "10,000" : "2,480", "Recipients"], ["98%", "Delivered"], ["Complete", "Status"]].map(([value, label]) => <div key={label} className="rounded-xl border border-slate-100 p-3 text-center"><p className="text-sm font-black text-slate-900">{value}</p><p className="mt-1 text-[7px] font-bold uppercase text-slate-400">{label}</p></div>)}</div>
                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[8px] font-bold text-emerald-800">✓ {isBulk ? "All messages have been sent. Delivery results are ready." : "Campaign is ready to reach customers on WhatsApp."}</div>
              </div>
            ) : (
              <div className="p-4"><div className="grid grid-cols-3 gap-2">{preview.detail.split(" · ").map((item, i) => <div key={item} className="rounded-xl bg-slate-50 p-3"><p className="text-[7px] font-bold uppercase text-slate-400">{["OVERVIEW", "ACTIVITY", "STATUS"][i] || "DETAIL"}</p><p className="mt-1 text-[9px] font-extrabold text-slate-800">{item}</p></div>)}</div><div className="mt-3 rounded-xl bg-emerald-50 p-3 text-[9px] font-semibold text-emerald-900">✓ {preview.message}</div></div>
            )}
          </div>
        ) : (
          <div className="flex w-full max-w-[610px] items-center justify-center" style={{ animation: "sodah-hero-visual-in 900ms cubic-bezier(.22,1,.36,1) both" }}>
            <div className="hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">☎</span><div><p className="text-[9px] font-extrabold text-slate-800">{preview.contact}</p><p className="text-[7px] text-emerald-600">{preview.status}</p></div></div>
              {isPromotion && <div className="my-3 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 via-lime-50 to-green-200"><div className="text-center"><p className="text-[7px] font-black uppercase tracking-widest text-emerald-800">SPECIAL OFFER</p><p className="mt-1 text-lg font-black text-emerald-950">20% OFF</p><p className="text-[7px] font-semibold text-emerald-800">Limited-time offer</p></div></div>}
              <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-3 text-[9px] leading-4 text-slate-800">{preview.message}<div className="mt-1 text-right text-[7px] text-slate-500">9:41 AM ✓✓</div></div>
              <div className="mt-3 max-w-[88%] rounded-2xl rounded-tl-sm bg-slate-100 p-3 text-[9px] leading-4 text-slate-700">{isPromotion ? "Yes, please show me the products and prices." : "Thank you. Please tell me more."}<div className="mt-1 text-right text-[7px] text-slate-400">9:42 AM</div></div>
              <div className="mt-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2"><span className="flex-1 text-[8px] text-slate-400">Message</span><span className="rounded-full bg-emerald-500 px-3 py-1 text-[7px] font-black text-white">Send</span></div>
            </div>
            <div className="w-full max-w-[330px] rounded-[30px] border-[6px] border-[#07110d] bg-[#07110d] p-2 shadow-[0_28px_70px_rgba(7,17,13,.38)] transition-transform duration-1000 sm:max-w-[350px]" style={{ transform: featureIndex % 2 === 0 ? "rotate(-2deg)" : "rotate(2deg)" }}>
              <div className="overflow-hidden rounded-[22px] bg-[#efeae2]">
                <div className="flex items-center gap-2 bg-[#075e54] px-3 py-3 text-white"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[10px] font-black">S</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-extrabold">{preview.contact}</p><p className="text-[9px] text-white/75">{preview.status}</p></div><span className="text-xs">⋮</span></div>
                <div className="min-h-[210px] space-y-2 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.65),transparent_35%)] p-3">
                  {isPromotion && <div className="flex h-[88px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-200 via-lime-100 to-emerald-300"><div className="text-center"><p className="text-[7px] font-black tracking-widest text-emerald-900">TODAY'S SPECIAL</p><p className="text-2xl font-black text-emerald-950">20% OFF</p><p className="text-[7px] font-bold text-emerald-900">Ask us for details</p></div></div>}
                  <div className="ml-auto max-w-[96%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-2.5 text-[10px] leading-5 text-slate-800 shadow-sm">{preview.message}<div className="mt-1 text-right text-[8px] text-slate-500">9:41 AM ✓✓</div></div>
                  <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-white p-2.5 text-[10px] leading-5 text-slate-700 shadow-sm">{isPromotion ? "Yes please 😊 Show me the products." : "Thanks! I'd like to know more."}<div className="mt-1 text-right text-[8px] text-slate-400">9:42 AM</div></div>
                  {isPromotion && <div className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-2 text-[8px] text-slate-800 shadow-sm">Here are our available products. Which one interests you? <div className="mt-1 text-right text-[8px] text-slate-500">9:42 AM ✓✓</div></div>}
                </div>
                <div className="flex items-center gap-2 bg-[#f7f7f7] p-2"><span className="flex-1 rounded-full bg-white px-3 py-2 text-[7px] text-slate-400">Type a message</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#128c7e] text-[9px] text-white">➤</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-3 right-4 z-20 rounded-full border border-white/40 bg-black/25 px-3 py-1.5 text-[7px] font-black uppercase tracking-[1.5px] text-white shadow-sm backdrop-blur-md">LIVE PREVIEW · {String(featureIndex + 1).padStart(2, "0")} / {HERO_FEATURES.length}</div>
    </div>
  );
}

function FakeQrCode() {
  const pattern = [
    "11111110010111111",
    "10000010100100001",
    "10111010110101101",
    "10111010011101101",
    "10111010101101101",
    "10000010010100001",
    "11111110101011111",
    "00000000110100000",
    "10101111100101101",
    "01100100111010010",
    "11010111001111100",
    "00111001110100111",
    "11111110010101001",
    "10000010111001110",
    "10111010100110101",
    "10111010011101011",
    "11111110101011101",
  ];

  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-white p-1 shadow-inner">
      <div className="grid h-full w-full grid-cols-17 gap-[1px]">
        {pattern.join("").split("").map((cell, index) => (
          <span
            key={index}
            className={cell === "1" ? "bg-[#071b14]" : "bg-white"}
          />
        ))}
      </div>
      <span
        className="pointer-events-none absolute left-1 right-1 top-1 h-[2px] rounded-full bg-[#25D366] shadow-[0_0_8px_rgba(37,211,102,.9)]"
        style={{ animation: "sodah-qr-scan 2.1s ease-in-out infinite" }}
      />
      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#25D366] shadow-[0_0_7px_rgba(37,211,102,.9)]" style={{ animation: "sodah-pulse 1.2s ease-in-out infinite" }} />
    </div>
  );
}

/* ============================================================
   LAPTOP — HERO DEVICE
============================================================ */

function LaptopMockup({
  showcaseId = "whatsapp",
  deviceScene = DEVICE_SCENES[0],
}) {
  const laptopTitle = {
    whatsapp: "Sodah Smart Automation",
    campaign: "WhatsApp Campaigns",
    cashflow: "Cashflow",
    timesheets: "Timesheets",
    gmail: "Gmail AI",
    email: "Bulk Email",
    subscription: "Subscription",
    settings: "Workspace Settings",
  }[showcaseId] || "Sodah Smart Automation";

  return (
    <div className="relative w-[500px] max-w-[96vw] md:w-[650px]">
      {/* projector glow */}
      <div className="pointer-events-none absolute -inset-x-16 -top-10 h-72 rounded-full bg-cyan-300/15 blur-3xl" />

      {/* projected workspace */}
      <div className="sodah-laptop-projection pointer-events-none absolute left-1/2 top-[-112px] z-0 w-[72%] -translate-x-1/2 rounded-2xl border border-white/60 bg-white/18 p-2 opacity-0 backdrop-blur-md">
        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-[0_20px_55px_rgba(6,55,38,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-black uppercase tracking-[1.5px] text-emerald-600">
              LIVE PROJECTION
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.9)]" />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-50 p-2">
              <p className="text-[6px] font-black text-gray-400">LEADS</p>
              <p className="mt-1 text-[10px] font-black text-gray-900">+120%</p>
            </div>
            <div className="rounded-lg bg-cyan-50 p-2">
              <p className="text-[6px] font-black text-gray-400">BOOKINGS</p>
              <p className="mt-1 text-[10px] font-black text-gray-900">+80%</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-[6px] font-black text-gray-400">STATUS</p>
              <p className="mt-1 text-[10px] font-black text-green-700">ACTIVE</p>
            </div>
          </div>
        </div>
      </div>

      {/* open laptop */}
      <div className="relative z-10">
        <div className="mx-auto w-[88%]">
          <div className="relative rounded-[18px] border-[7px] border-[#18231d] bg-[#07110d] p-2 shadow-[0_35px_90px_rgba(0,0,0,0.45)] [transform:perspective(1200px)_rotateX(2deg)]">
            <div className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gray-500" />

            <div className="overflow-hidden rounded-[10px] border border-white/10 bg-[#edf9f2]">
              <div className="flex h-8 items-center gap-2 border-b border-gray-200 bg-white px-3">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="ml-2 truncate text-[7px] font-black text-gray-500">
                  {laptopTitle}
                </span>
              </div>

              <DeviceFeatureShowcase scene={deviceScene} compact="laptop" />

              <div className="grid min-h-[185px] grid-cols-[76px_1fr]">
                <div className="border-r border-gray-200 bg-[#071b14] p-2">
                  <div className="h-4 rounded bg-emerald-400/20" />
                  <div className="mt-3 h-2 rounded bg-white/10" />
                  <div className="mt-2 h-2 rounded bg-white/10" />
                  <div className="mt-2 h-2 rounded bg-white/10" />
                  <div className="mt-6 h-2 rounded bg-green-400/25" />
                </div>

                <div className="bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-[1.5px] text-emerald-600">
                        SODAH WORKSPACE
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        Business overview
                      </p>
                    </div>
                    <span className="rounded-full bg-green-50 px-2 py-1 text-[6px] font-black text-green-700">
                      LIVE
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[6px] text-gray-400">CONVERSATIONS</p>
                      <p className="mt-1 text-[10px] font-black text-gray-900">248</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[6px] text-gray-400">APPOINTMENTS</p>
                      <p className="mt-1 text-[10px] font-black text-gray-900">42</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[6px] text-gray-400">AUTOMATION</p>
                      <p className="mt-1 text-[10px] font-black text-green-700">ON</p>
                    </div>
                  </div>

                  <div className="mt-3 h-14 rounded-lg bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-2">
                    <div className="flex h-full items-end gap-1">
                      {[34, 54, 43, 72, 61, 86, 69, 92].map((height, index) => (
                        <span
                          key={index}
                          className="flex-1 rounded-t bg-gradient-to-t from-emerald-400 to-cyan-300"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* laptop base */}
          <div className="relative mx-[-5%] h-5 rounded-b-[28px] rounded-t-sm bg-gradient-to-b from-[#9aa9a1] to-[#4a5751] shadow-[0_18px_35px_rgba(0,0,0,0.32)]">
            <div className="absolute left-1/2 top-1 h-1.5 w-24 -translate-x-1/2 rounded-full bg-white/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PHONE
============================================================ */

function PhoneMockup({
  whatsappConnected,
  showcaseId = "whatsapp",
  deviceScene = DEVICE_SCENES[0],
}) {
  const screenTitle = {
    whatsapp: "Sodah Smart Automation",
    campaign: "WhatsApp Campaigns",
    cashflow: "Cashflow",
    timesheets: "Timesheets",
    gmail: "Gmail AI",
    email: "Bulk Email",
    subscription: "Subscription",
    settings: "Workspace Settings",
  }[showcaseId] || "Sodah Smart Automation";

  return (
    <div
      key={showcaseId}
      className="relative"
      style={{
        animation: "sodah-phone-enter 1200ms cubic-bezier(.22,1,.36,1) both",
      }}
    >
      <div className="absolute -inset-12 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative w-[245px] rotate-[-5deg] rounded-[34px] border-[6px] border-[#18231d] bg-[#09110d] p-[5px] shadow-[0_35px_90px_rgba(0,0,0,0.42)] transition-transform duration-[2500ms] hover:rotate-0 sm:w-[275px] md:w-[300px]">

        <div className="absolute left-1/2 top-2 z-30 h-4 w-20 -translate-x-1/2 rounded-full bg-[#111a15]" />

        <div className="overflow-hidden rounded-[27px] bg-[#eaf8ef]">

          <div className="flex items-center gap-2 bg-gradient-to-r from-[#075e54] to-[#087f67] px-3 py-3 pt-6">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
              <img
                src={BRAND.whatsapp}
                alt="WhatsApp"
                className="h-5 w-5"
              />
            </div>

            <div>
              <p className="text-[9px] font-black text-white">
                {screenTitle}
              </p>
              <p className="text-[7px] text-green-100">
                {whatsappConnected ? "online • 24/7" : "ready • 24/7"}
              </p>
            </div>

            <div className="ml-auto flex gap-1 text-white/80">
              <span>⌕</span>
              <span>⋮</span>
            </div>
          </div>

          <DeviceFeatureShowcase scene={deviceScene} compact="phone" />

          {showcaseId === "whatsapp" ? (
            <div className="min-h-[300px] space-y-2 bg-[#efeae2] p-3">
              <PhoneBubble side="left" text="Hi 👋 Welcome to our business. How can we help you today?" animated delay="0.2s" />
              <PhoneBubble side="right" text="I want to book an appointment." animated delay="0.8s" />
              <PhoneBubble side="left" text="Of course. What service and preferred time would you like?" animated delay="1.4s" />
              <PhoneBubble side="right" text="2:00 PM please." animated delay="2s" />
              <div
                className="ml-auto max-w-[88%] rounded-xl rounded-br-sm bg-[#d9fdd3] p-2.5 shadow-sm"
                style={{
                  animation: "sodah-message-in 700ms 2.6s both",
                }}
              >
                <p className="text-[8px] font-black text-green-800">✓ Appointment Confirmed!</p>
                <p className="mt-1 text-[7px] text-gray-500">See you soon!</p>
              </div>
            </div>
          ) : showcaseId === "campaign" ? (
            <div className="min-h-[300px] bg-slate-50 p-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[7px] font-black uppercase tracking-[1.5px] text-green-600">CAMPAIGN</p>
                <p className="mt-1 text-sm font-black text-slate-900">Summer Promotion</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-green-400 to-cyan-400" style={{ animation: "sodah-progress 2.8s ease-in-out infinite" }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniPhoneStat value="1,248" label="Sent" />
                  <MiniPhoneStat value="932" label="Delivered" />
                  <MiniPhoneStat value="318" label="Replies" />
                  <MiniPhoneStat value="126" label="Bookings" />
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-green-50 p-2 text-[8px] font-bold text-green-700">
                ✓ Campaign running • multiple customers
              </div>
            </div>
          ) : showcaseId === "gmail" || showcaseId === "email" ? (
            <div className="min-h-[300px] bg-slate-50 p-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[7px] font-black uppercase tracking-[1.5px] text-red-500">SMART EMAIL</p>
                <p className="mt-1 text-sm font-black text-slate-900">Inbox</p>
                <div className="mt-3 space-y-2">
                  <MiniEmailRow sender="Customer" subject="Appointment request" />
                  <MiniEmailRow sender="Lead" subject="Interested in your service" />
                  <MiniEmailRow sender="Client" subject="Thank you!" />
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-cyan-50 p-2 text-[8px] font-bold text-cyan-700">
                ✦ AI reply ready
              </div>
            </div>
          ) : showcaseId === "timesheets" ? (
            <div className="min-h-[300px] bg-slate-50 p-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[7px] font-black uppercase tracking-[1.5px] text-sky-500">TEAM OPERATIONS</p>
                <p className="mt-1 text-sm font-black text-slate-900">Today's team</p>
                {[
                  ["John", "09:00", "8h"],
                  ["Sarah", "09:15", "7h 30m"],
                  ["Mohammed", "10:00", "8h"],
                ].map(([name, time, hours], index) => (
                  <div
                    key={name}
                    className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2"
                    style={{
                      animation: `sodah-message-in 500ms ${0.25 + index * 0.35}s both`,
                    }}
                  >
                    <span className="text-[8px] font-bold text-slate-700">{name}</span>
                    <span className="text-[7px] text-slate-500">{time}</span>
                    <span className="text-[7px] font-black text-sky-600">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : showcaseId === "cashflow" ? (
            <div className="min-h-[300px] bg-slate-950 p-3">
              <div className="rounded-xl bg-white p-3">
                <p className="text-[7px] font-black uppercase tracking-[1.5px] text-emerald-600">CASHFLOW</p>
                <p className="mt-1 text-lg font-black text-slate-900">$12,450</p>
                <p className="text-[7px] text-slate-500">Monthly income</p>
                <div className="mt-4 flex h-24 items-end gap-1">
                  {[30,48,38,62,55,76,68,92].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t bg-gradient-to-t from-emerald-500 to-cyan-400"
                      style={{ height: `${height}%`, animation: "sodah-bar 2s ease-in-out infinite alternate" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : showcaseId === "subscription" ? (
            <div className="min-h-[300px] bg-[#071b14] p-3 text-white">
              <p className="text-[7px] font-black uppercase tracking-[1.5px] text-emerald-300">SODAH PLAN</p>
              <p className="mt-2 text-lg font-black">Premium Workspace</p>
              <div className="mt-4 rounded-xl bg-white/10 p-3">
                <p className="text-[8px] text-emerald-200">Automation</p>
                <p className="mt-1 text-xl font-black">Unlimited</p>
              </div>
              <div className="mt-3 rounded-xl bg-emerald-400/15 p-3 text-[8px] text-emerald-200">✓ Workspace active</div>
            </div>
          ) : (
            <div className="min-h-[300px] bg-slate-50 p-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[7px] font-black uppercase tracking-[1.5px] text-slate-500">WORKSPACE CONTROL</p>
                <p className="mt-1 text-sm font-black text-slate-900">Settings</p>
                {[
                  ["WhatsApp", "Connected"],
                  ["AI Assistant", "Active"],
                  ["Notifications", "On"],
                ].map(([label, value], index) => (
                  <div key={label} className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2">
                    <span className="text-[8px] font-bold text-slate-700">{label}</span>
                    <span className="rounded-full bg-green-50 px-2 py-1 text-[7px] font-black text-green-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceFeatureShowcase({ scene, compact = "phone" }) {
  const isPhone = compact === "phone";

  return (
    <div
      key={scene.id}
      className={`${isPhone ? "border-b border-black/5 bg-white px-2 py-2" : "border-b border-gray-100 bg-slate-50 px-3 py-2"} sodah-scene-in` }
      style={{ animation: "sodah-scene-in 700ms cubic-bezier(.22,1,.36,1) both" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className={isPhone ? "truncate text-[7px] font-black uppercase tracking-[0.7px]" : "truncate text-[8px] font-black uppercase tracking-[0.8px]"}
            style={{ color: scene.color }}
          >
            {scene.label}
          </p>
          <p className={isPhone ? "mt-0.5 truncate text-[8px] font-black text-slate-800" : "mt-0.5 truncate text-[9px] font-black text-slate-800"}>
            {scene.headline}
          </p>
        </div>
        <span
          className={isPhone ? "h-1.5 w-1.5 shrink-0 rounded-full" : "h-2 w-2 shrink-0 rounded-full"}
          style={{ backgroundColor: scene.color, boxShadow: `0 0 9px ${scene.color}99` }}
        />
      </div>

      <div className={isPhone ? "mt-1.5 grid grid-cols-3 gap-1" : "mt-2 grid grid-cols-3 gap-1.5"}>
        {scene.features.map(([label, value], index) => (
          <div
            key={`${scene.id}-${label}`}
            className={`${isPhone ? "min-w-0 rounded-md border border-slate-100 bg-slate-50 px-1 py-1" : "min-w-0 rounded-lg border border-slate-100 bg-white px-2 py-1.5 shadow-sm"} sodah-feature-pop` }
            style={{ animation: `sodah-feature-pop 500ms ${index * 90}ms both` }}
          >
            <p className={isPhone ? "truncate text-[6px] font-black uppercase text-slate-400" : "truncate text-[7px] font-black uppercase text-slate-400"}>{label}</p>
            <p className={isPhone ? "mt-0.5 truncate text-[8px] font-black text-slate-800" : "mt-0.5 truncate text-[9px] font-black text-slate-800"}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniPhoneStat({ value, label }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <p className="text-[10px] font-black text-slate-900">{value}</p>
      <p className="mt-0.5 text-[6px] font-black uppercase text-slate-400">{label}</p>
    </div>
  );
}

function MiniEmailRow({ sender, subject }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2"
      style={{ animation: "sodah-message-in 600ms both" }}
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-[6px] font-black text-red-500">
        {sender.charAt(0)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[7px] font-black text-slate-700">{sender}</p>
        <p className="truncate text-[7px] text-slate-500">{subject}</p>
      </div>
    </div>
  );
}

/* ============================================================
   PHONE BUBBLE
============================================================ */

function PhoneBubble({
  side,
  text,
  animated = false,
  delay = "0s",
}) {
  return (
    <div
      className={`flex ${
        side === "right"
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`max-w-[88%] whitespace-pre-line rounded-xl p-2 text-[7px] leading-4 shadow-sm ${
          animated ? "sodah-message-in" : ""
        } ${
          side === "right"
            ? "rounded-br-sm bg-[#d9fdd3] text-[#27372b]"
            : "rounded-bl-sm bg-white text-gray-700"
        }`}
        style={
          animated
            ? { animationDelay: delay }
            : undefined
        }
      >
        {text}
      </div>
    </div>
  );
}

/* ============================================================
   FLOATING KPI
============================================================ */

function FloatingKpi({
  className,
  title,
  value,
  color,
}) {
  return (
    <div
      className={`absolute z-30 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_15px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl ${className}`}
    >
      <p className="text-[8px] font-black text-gray-500">
        {title}
      </p>

      <p
        className="mt-1 text-sm font-black"
        style={{
          color,
        }}
      >
        📈 {value}
      </p>
    </div>
  );
}

/* ============================================================
   LAYER 2 — SHOWCASE SLIDE
============================================================ */

function ShowcaseSlide({
  item,
  whatsappConnected,
  gmailConnected,
  gmailEmail,
}) {
  return (
    <div className="min-w-full shrink-0">
      <div className="grid min-h-[300px] lg:grid-cols-[0.82fr_1.18fr]">

        {/* TEXT */}

        <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
          <p
            className="text-[9px] font-black uppercase tracking-[2.5px]"
            style={{
              color:
                item.color,
            }}
          >
            {item.eyebrow}
          </p>

          <h3 className="mt-3 text-3xl font-black leading-[1.02] text-gray-900 md:text-4xl">
            {item.title}
          </h3>

          <p className="mt-4 max-w-xl text-sm leading-6 text-gray-600">
            {item.description}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{
                background:
                  item.color,
                boxShadow:
                  `0 0 14px ${item.color}`,
              }}
            />

            <span className="text-[9px] font-black uppercase tracking-[1.5px] text-gray-500">
              AUTOMATED PRODUCT SHOWCASE
            </span>
          </div>
        </div>

        {/* VISUAL */}

        <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white/30 to-cyan-50/80 p-5">
          <ShowcaseVisual
            item={item}
            whatsappConnected={
              whatsappConnected
            }
            gmailConnected={
              gmailConnected
            }
            gmailEmail={
              gmailEmail
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHOWCASE VISUAL
============================================================ */

function ShowcaseVisual({
  item,
  whatsappConnected,
  gmailConnected,
  gmailEmail,
}) {
  switch (item.id) {
    case "whatsapp":
      return (
        <WhatsAppShowcase
          connected={
            whatsappConnected
          }
        />
      );

    case "cashflow":
      return (
        <CashflowShowcase />
      );

    case "timesheets":
      return (
        <TimesheetShowcase />
      );

    case "gmail":
      return (
        <GmailShowcase
          connected={
            gmailConnected
          }
          email={
            gmailEmail
          }
        />
      );

    case "campaign":
      return (
        <CampaignShowcase />
      );

    case "email":
      return (
        <BulkEmailShowcase />
      );

    case "subscription":
      return (
        <SubscriptionShowcase
          premier={
            false
          }
        />
      );

    case "settings":
      return (
        <SettingsShowcase />
      );

    default:
      return <AdvancedShowcase item={item} />;
  }
}


/* ============================================================
   ADVANCED PRODUCT SHOWCASES
   ------------------------------------------------------------
   Additional visual product projects for the slow 20-scene
   cinematic workspace rotation.
============================================================ */

function AdvancedShowcase({ item }) {
  const visual = item.visual;
  const imageMap = {
    growth: HERO_SHOWCASE_IMAGES[0],
    multilingual: HERO_SHOWCASE_IMAGES[1],
    pro: HERO_SHOWCASE_IMAGES[2],
    appointments: HERO_SHOWCASE_IMAGES[0],
    leads: HERO_SHOWCASE_IMAGES[1],
    followups: HERO_SHOWCASE_IMAGES[2],
    team: HERO_SHOWCASE_IMAGES[0],
    updates: HERO_SHOWCASE_IMAGES[1],
    analytics: HERO_SHOWCASE_IMAGES[2],
    assistant: HERO_SHOWCASE_IMAGES[0],
    qr: HERO_SHOWCASE_IMAGES[1],
    workspace: HERO_SHOWCASE_IMAGES[2],
  };
  const image = imageMap[visual];

  const statSets = {
    growth: [["CUSTOMERS", "+38%"], ["REPLIES", "+64%"], ["AUTOMATION", "24/7"]],
    multilingual: [["ENGLISH", "ACTIVE"], ["ARABIC", "ACTIVE"], ["FRENCH", "ACTIVE"]],
    pro: [["MONTHLY", "$29"], ["WHATSAPP", "1 CONNECTION"], ["AUTOMATION", "UNLIMITED"]],
    appointments: [["TODAY", "42"], ["CONFIRMED", "36"], ["REMINDERS", "18"]],
    leads: [["NEW LEADS", "128"], ["QUALIFIED", "74"], ["FOLLOW-UP", "31"]],
    followups: [["DUE TODAY", "24"], ["SENT", "18"], ["REPLIED", "11"]],
    team: [["SCHEDULED", "18"], ["DELIVERED", "18"], ["ON TIME", "100%"]],
    updates: [["BUSINESS INFO", "LIVE"], ["ANNOUNCEMENTS", "ON"], ["SELF EDIT", "READY"]],
    analytics: [["TODAY", "+18%"], ["THIS WEEK", "+31%"], ["THIS MONTH", "+46%"]],
    assistant: [["RESPONSES", "24/7"], ["LANGUAGES", "MULTI"], ["STATUS", "ACTIVE"]],
    qr: [["STEP 01", "OPEN"], ["STEP 02", "SCAN"], ["STEP 03", "CONNECTED"]],
    workspace: [["TOOLS", "20 STORIES"], ["AI", "24/7"], ["WORKSPACE", "LIVE"]],
  };
  const stats = statSets[visual] || [];

  const titles = {
    growth: "Growth command center",
    multilingual: "Global customer conversation",
    pro: "Pro automation workspace",
    appointments: "Booking pipeline",
    leads: "Lead command center",
    followups: "Customer follow-up engine",
    team: "Scheduled team communication",
    updates: "Business control center",
    analytics: "Business activity report",
    assistant: "AI assistant active",
    qr: "WhatsApp connection",
    workspace: "One connected workspace",
  };

  return (
    <div className="relative w-full max-w-[720px] overflow-hidden rounded-[28px] border border-white/90 bg-white/72 p-3 shadow-[0_30px_80px_rgba(15,23,42,.14)] backdrop-blur-2xl md:p-4">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative grid gap-3 md:grid-cols-[0.72fr_1.28fr]">
        <div className="relative min-h-[215px] overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950">
          <img
            src={image}
            alt={`${item.label} Sodah product showcase`}
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
            <div className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[7px] font-black uppercase tracking-[1.5px] text-white backdrop-blur-xl">
              SODAH.IO
            </div>
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 14px ${item.color}` }} />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[7px] font-black uppercase tracking-[2px]" style={{ color: item.color }}>{item.eyebrow}</p>
            <p className="mt-1 text-lg font-black leading-tight text-white">{item.label}</p>
            <p className="mt-1 text-[8px] leading-4 text-white/70">Live product experience</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[1.6px]" style={{ color: item.color }}>{item.eyebrow}</p>
              <p className="mt-1 text-base font-black text-slate-900">{titles[visual]}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[6px] font-black text-emerald-700">LIVE</span>
          </div>

          {visual === "multilingual" ? (
            <div className="mt-3 space-y-2">
              {[
                ["Customer", "Bonjour 👋 Je veux prendre rendez-vous.", "French"],
                ["Sodah AI", "Of course. What time works for you?", "English"],
                ["Customer", "غداً الساعة 4 مساءً من فضلك.", "Arabic"],
              ].map(([sender, message, language], index) => (
                <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-2" style={{ animation: `sodah-message-in 600ms ${index * 220}ms both` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-black text-slate-700">{sender}</span>
                    <span className="text-[6px] font-black uppercase text-cyan-600">{language}</span>
                  </div>
                  <p className="mt-1 text-[7px] leading-4 text-slate-500">{message}</p>
                </div>
              ))}
            </div>
          ) : visual === "pro" ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["FREE", "$0", "TRIAL"],
                ["PRO", "$29", "POPULAR"],
                ["PREMIUM", "$79", "ADVANCED"],
              ].map(([plan, price, tag], index) => (
                <div key={plan} className={`rounded-xl border p-2 ${index === 1 ? "border-violet-300 bg-violet-50 shadow-[0_10px_30px_rgba(139,92,246,.16)]" : "border-slate-100 bg-slate-50"}`}>
                  <p className="text-[6px] font-black uppercase text-slate-400">{plan}</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{price}</p>
                  <p className="mt-1 text-[5px] font-black uppercase tracking-[1px]" style={{ color: index === 1 ? item.color : "#94a3b8" }}>{tag}</p>
                </div>
              ))}
            </div>
          ) : visual === "qr" ? (
            <div className="mt-3 flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="scale-[0.82] origin-left"><FakeQrCode /></div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-900">Scan your WhatsApp QR</p>
                <p className="mt-1 text-[7px] leading-4 text-slate-500">Connect your existing business number and start your workspace.</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[6px] font-black uppercase tracking-[1px] text-emerald-700">Ready to connect</span>
                </div>
              </div>
            </div>
          ) : visual === "workspace" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["WhatsApp", "AI conversations"],
                ["Gmail AI", "Smart inbox"],
                ["Campaigns", "Reach customers"],
                ["Analytics", "Daily insights"],
                ["Cash Flow", "Know your numbers"],
                ["Timesheet", "Team operations"],
              ].map(([name, value], index) => (
                <div key={name} className="rounded-xl border border-slate-100 bg-slate-50 p-2" style={{ animation: `sodah-feature-pop 500ms ${index * 80}ms both` }}>
                  <p className="text-[7px] font-black text-slate-800">{name}</p>
                  <p className="mt-0.5 text-[6px] text-slate-400">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {stats.map(([label, value], index) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5" style={{ animation: `sodah-feature-pop 500ms ${index * 100}ms both` }}>
                  <p className="text-[6px] font-black uppercase tracking-[1px] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: visual === "qr" ? "100%" : visual === "pro" ? "72%" : "86%",
                background: `linear-gradient(90deg, ${item.color}, #22d3ee)`,
                animation: "sodah-progress 4s ease-in-out infinite",
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[6px] font-black uppercase tracking-[1.3px] text-slate-400">SODAH ADVANCED SYSTEM</span>
            <span className="text-[6px] font-black text-emerald-600">● ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   WHATSAPP SHOWCASE
============================================================ */

function WhatsAppShowcase({
  connected,
}) {
  return (
    <div className="relative flex w-full max-w-[650px] items-center justify-center">

      <div className="absolute h-60 w-60 rounded-full bg-green-300/25 blur-3xl" />

      <div className="relative w-[225px] rotate-[-3deg] rounded-[30px] border-[6px] border-gray-900 bg-black p-1.5 shadow-2xl md:w-[250px]">

        <div className="overflow-hidden rounded-[24px] bg-[#efeae2]">

          <div className="bg-[#075e54] px-4 py-3">
            <div className="flex items-center gap-2">
              <img
                src={
                  BRAND.whatsapp
                }
                alt="WhatsApp"
                className="h-7 w-7"
              />

              <div>
                <p className="text-[10px] font-black text-white">
                  Sodah Business
                </p>

                <p className="text-[7px] text-green-100">
                  AI assistant
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3">
            <PhoneBubble
              side="left"
              text="Hi 👋 How can we help you today?"
            />

            <PhoneBubble
              side="right"
              text="I want to book an appointment."
            />

            <PhoneBubble
              side="left"
              text="We have 2:00 PM and 4:30 PM available."
            />

            <PhoneBubble
              side="right"
              text="2:00 PM please."
            />

            <div className="rounded-xl bg-[#d9fdd3] p-2.5 text-[8px] font-black text-green-800">
              ✓ Appointment Confirmed!

              <p className="mt-1 font-normal text-gray-500">
                See you soon!
              </p>
            </div>
          </div>
        </div>
      </div>

      <VisualBadge
        className="right-2 top-4"
        label="CONNECTION"
        value={
          connected
            ? "ACTIVE"
            : "QR READY"
        }
        color="#25D366"
      />

      <VisualBadge
        className="bottom-4 left-2"
        label="AUTOMATION"
        value="24/7 AI"
        color="#06b6d4"
      />
    </div>
  );
}

/* ============================================================
   CASHFLOW SHOWCASE
============================================================ */

function CashflowShowcase() {
  return (
    <div className="w-full max-w-[650px] rounded-[25px] border border-white bg-white/90 p-5 shadow-2xl backdrop-blur-xl">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[2px] text-gray-400">
            CASHFLOW
          </p>

          <p className="mt-1 text-lg font-black text-gray-900">
            Business overview
          </p>
        </div>

        <span className="rounded-full bg-green-50 px-3 py-1 text-[7px] font-black text-green-700">
          THIS MONTH
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <VisualStat
          label="Income"
          value="$12,450"
          color="#16a34a"
        />

        <VisualStat
          label="Expenses"
          value="$4,230"
          color="#0f766e"
        />

        <VisualStat
          label="Net Profit"
          value="$8,220"
          color="#0891b2"
        />
      </div>

      <div className="mt-5 flex h-32 items-end gap-2 rounded-2xl bg-gray-50 p-4">
        {[
          38,
          65,
          48,
          78,
          59,
          88,
          54,
          94,
          66,
          82,
          61,
          96,
        ].map(
          (
            height,
            index
          ) => (
            <div
              key={index}
              className="flex h-full flex-1 items-end gap-1"
            >
              <div
                className="w-1/2 rounded-t bg-green-400"
                style={{
                  height:
                    `${height}%`,
                }}
              />

              <div
                className="w-1/2 rounded-t bg-blue-400"
                style={{
                  height:
                    `${Math.max(
                      22,
                      height -
                        24
                    )}%`,
                }}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TIMESHEET SHOWCASE
============================================================ */

function TimesheetShowcase() {
  const rows = [
    [
      "JD",
      "John Doe",
      "09:00 AM",
      "05:00 PM",
      "8h",
    ],

    [
      "SA",
      "Sarah Ahmed",
      "09:15 AM",
      "04:45 PM",
      "7h 30m",
    ],

    [
      "MK",
      "Mohammed Khan",
      "10:00 AM",
      "06:00 PM",
      "8h",
    ],
  ];

  return (
    <div className="w-full max-w-[680px] overflow-hidden rounded-[25px] border border-white bg-white/90 shadow-2xl">

      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[2px] text-sky-500">
            TEAM OPERATIONS
          </p>

          <p className="mt-1 text-lg font-black text-gray-900">
            Team hours
          </p>
        </div>

        <span className="rounded-full bg-sky-50 px-3 py-1 text-[7px] font-black text-sky-700">
          ACTIVE
        </span>
      </div>

      <div className="overflow-hidden border-t border-gray-200">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr] bg-gray-50 px-4 py-2 text-[7px] font-black uppercase text-gray-400">
          <span>Name</span>
          <span>Check in</span>
          <span>Check out</span>
          <span>Hours</span>
        </div>

        {rows.map(
          (
            row
          ) => (
            <div
              key={
                row[0]
              }
              className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr] items-center border-t border-gray-100 px-4 py-3 text-[8px] text-gray-600"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 font-black text-sky-600">
                  {
                    row[0]
                  }
                </span>

                <span className="font-bold">
                  {
                    row[1]
                  }
                </span>
              </div>

              <span>
                {
                  row[2]
                }
              </span>

              <span>
                {
                  row[3]
                }
              </span>

              <span className="font-black text-gray-800">
                {
                  row[4]
                }
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ============================================================
   GMAIL SHOWCASE
============================================================ */

function GmailShowcase({
  connected,
  email,
}) {
  return (
    <div className="w-full max-w-[650px] rounded-[25px] border border-white bg-white/90 p-5 shadow-2xl">

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
          <img
            src={
              BRAND.gmail
            }
            alt="Gmail"
            className="h-7 w-7"
          />
        </div>

        <div>
          <p className="text-[8px] font-black uppercase tracking-[2px] text-red-500">
            SMART EMAIL
          </p>

          <p className="text-lg font-black text-gray-900">
            Business inbox
          </p>
        </div>

        <span
          className={`ml-auto rounded-full px-3 py-1 text-[7px] font-black ${
            connected
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {connected
            ? "CONNECTED"
            : "READY"}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        <EmailPreview
          sender={
            email ||
            "customer@business.com"
          }
          subject="Appointment request"
          text="Hello, I would like to book a time..."
        />

        <EmailPreview
          sender="client@example.com"
          subject="Business enquiry"
          text="Could you please send me more information..."
        />

        <EmailPreview
          sender="partner@example.com"
          subject="Follow-up"
          text="Just following up on our previous conversation..."
        />
      </div>
    </div>
  );
}

/* ============================================================
   CAMPAIGN SHOWCASE
============================================================ */

function CampaignShowcase() {
  return (
    <div className="relative w-full max-w-[650px] rounded-[25px] border border-white bg-white/90 p-5 shadow-2xl">

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50">
          <img
            src={
              BRAND.whatsapp
            }
            alt="WhatsApp"
            className="h-7 w-7"
          />
        </div>

        <div>
          <p className="text-[8px] font-black uppercase tracking-[2px] text-green-600">
            CAMPAIGN CENTER
          </p>

          <p className="text-lg font-black text-gray-900">
            WhatsApp campaign
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-gray-700">
            Customer promotion
          </span>

          <span className="rounded-full bg-green-100 px-3 py-1 text-[7px] font-black text-green-700">
            RUNNING
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniVisualMetric
            value="2,480"
            label="Recipients"
          />

          <MiniVisualMetric
            value="91%"
            label="Delivered"
          />

          <MiniVisualMetric
            value="38%"
            label="Replies"
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BULK EMAIL SHOWCASE
============================================================ */

function BulkEmailShowcase() {
  return (
    <div className="w-full max-w-[650px] rounded-[25px] border border-white bg-white/90 p-5 shadow-2xl">

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-xl">
          📨
        </div>

        <div>
          <p className="text-[8px] font-black uppercase tracking-[2px] text-cyan-600">
            EMAIL AUTOMATION
          </p>

          <p className="text-lg font-black text-gray-900">
            Bulk email workspace
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniVisualMetric
          value="4,820"
          label="Sent"
        />

        <MiniVisualMetric
          value="93%"
          label="Delivered"
        />

        <MiniVisualMetric
          value="27%"
          label="Replies"
        />
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-[8px] font-black uppercase tracking-[1.5px] text-gray-400">
          AI MESSAGE
        </p>

        <p className="mt-2 text-xs leading-5 text-gray-700">
          Hello, thank you for contacting
          our business. We would be happy
          to help you with your request...
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   SUBSCRIPTION SHOWCASE
============================================================ */

function SubscriptionShowcase() {
  return (
    <div className="w-full max-w-[600px] rounded-[25px] border border-white bg-[#0c0a14]/95 p-6 text-white shadow-2xl">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10 text-2xl">
        ◆
      </div>

      <p className="mt-4 text-center text-lg font-black">
        Sodah Subscription
      </p>

      <p className="mt-2 text-center text-xs text-gray-500">
        Manage your business plan and
        automation capabilities.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <DarkMiniMetric
          label="Trial"
          value="7 Days"
          color="#a78bfa"
        />

        <DarkMiniMetric
          label="Plans"
          value="PRO"
          color="#22d3ee"
        />

        <DarkMiniMetric
          label="AI"
          value="ON"
          color="#25D366"
        />
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS SHOWCASE
============================================================ */

function SettingsShowcase() {
  return (
    <div className="w-full max-w-[600px] rounded-[25px] border border-white bg-white/90 p-5 shadow-2xl">

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-xl">
          ⚙️
        </div>

        <div>
          <p className="text-[8px] font-black uppercase tracking-[2px] text-gray-500">
            WORKSPACE CONTROL
          </p>

          <p className="text-lg font-black text-gray-900">
            Business settings
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <SettingVisual
          title="WhatsApp connection"
          value="Connected"
          color="#25D366"
        />

        <SettingVisual
          title="AI assistant"
          value="Active"
          color="#06b6d4"
        />

        <SettingVisual
          title="Notifications"
          value="Enabled"
          color="#8b5cf6"
        />

        <SettingVisual
          title="Business workspace"
          value="Operational"
          color="#22c55e"
        />
      </div>
    </div>
  );
}

/* ============================================================
   TOOL TILE
   Actual clickable operating-layer item.
============================================================ */

function ToolTile({
  logo,
  icon,
  label,
  onClick,
  featured = false,
  accent = "default",
}) {
  const accentStyles = {
    whatsapp: {
      card: "border-green-400/40 bg-gradient-to-br from-[#061b14] via-[#062d20] to-[#03100c] shadow-[0_18px_45px_rgba(37,211,102,0.18)] hover:border-[#25D366] hover:shadow-[0_24px_55px_rgba(37,211,102,0.30)]",
      icon: "bg-[#25D366] text-black shadow-[0_0_24px_rgba(37,211,102,0.30)]",
      text: "text-white",
      accent: "text-[#25D366]",
    },
    timesheets: {
      card: "border-sky-400/40 bg-gradient-to-br from-[#061725] via-[#082b43] to-[#030b14] shadow-[0_18px_45px_rgba(56,189,248,0.16)] hover:border-[#38BDF8] hover:shadow-[0_24px_55px_rgba(56,189,248,0.28)]",
      icon: "bg-[#38BDF8] text-[#03111b] shadow-[0_0_24px_rgba(56,189,248,0.28)]",
      text: "text-white",
      accent: "text-[#38BDF8]",
    },
    cashflow: {
      card: "border-amber-400/40 bg-gradient-to-br from-[#1c1504] via-[#292005] to-[#080702] shadow-[0_18px_45px_rgba(245,158,11,0.15)] hover:border-[#F59E0B] hover:shadow-[0_24px_55px_rgba(245,158,11,0.27)]",
      icon: "bg-[#F59E0B] text-[#171003] shadow-[0_0_24px_rgba(245,158,11,0.28)]",
      text: "text-white",
      accent: "text-[#FBBF24]",
    },
    gmail: {
      card: "border-red-400/40 bg-gradient-to-br from-[#21080a] via-[#351015] to-[#090304] shadow-[0_18px_45px_rgba(234,67,53,0.16)] hover:border-[#0f766e] hover:shadow-[0_24px_55px_rgba(234,67,53,0.28)]",
      icon: "bg-white shadow-[0_0_24px_rgba(234,67,53,0.22)]",
      text: "text-white",
      accent: "text-[#0f766e]",
    },
    suggestions: {
      card: "border-violet-400/40 bg-gradient-to-br from-[#120a24] via-[#251047] to-[#08040f] shadow-[0_18px_45px_rgba(139,92,246,0.18)] hover:border-[#8B5CF6] hover:shadow-[0_24px_55px_rgba(139,92,246,0.30)]",
      icon: "bg-[#8B5CF6] text-white shadow-[0_0_24px_rgba(139,92,246,0.30)]",
      text: "text-white",
      accent: "text-[#C4B5FD]",
    },
    campaign: {
      card: "border-emerald-400/40 bg-gradient-to-br from-[#061b14] via-[#063b2a] to-[#020d08] shadow-[0_18px_45px_rgba(34,197,94,0.18)] hover:border-[#22C55E] hover:shadow-[0_24px_55px_rgba(34,197,94,0.30)]",
      icon: "bg-[#22C55E] text-[#03150b] shadow-[0_0_24px_rgba(34,197,94,0.30)]",
      text: "text-white",
      accent: "text-[#4ADE80]",
    },
    subscription: {
      card: "border-purple-400/40 bg-gradient-to-br from-[#130b24] via-[#24103e] to-[#07030d] shadow-[0_18px_45px_rgba(167,139,250,0.18)] hover:border-[#A78BFA] hover:shadow-[0_24px_55px_rgba(167,139,250,0.30)]",
      icon: "bg-[#A78BFA] text-[#160d24] shadow-[0_0_24px_rgba(167,139,250,0.30)]",
      text: "text-white",
      accent: "text-[#C4B5FD]",
    },
    settings: {
      card: "border-slate-400/40 bg-gradient-to-br from-[#08101b] via-[#162337] to-[#03070d] shadow-[0_18px_45px_rgba(100,116,139,0.16)] hover:border-[#94A3B8] hover:shadow-[0_24px_55px_rgba(100,116,139,0.28)]",
      icon: "bg-[#94A3B8] text-[#08101b] shadow-[0_0_24px_rgba(148,163,184,0.25)]",
      text: "text-white",
      accent: "text-[#CBD5E1]",
    },
    default: {
      card: "border-blue-400/30 bg-gradient-to-br from-[#061321] via-[#0a1d35] to-[#030810]",
      icon: "bg-blue-400 text-black",
      text: "text-white",
      accent: "text-blue-300",
    },
  };

  const style = accentStyles[accent] || accentStyles.default;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[112px] flex-col items-center justify-center overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition duration-500 hover:-translate-y-1 ${
        style.card
      }`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/[0.04] blur-2xl" />

      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition duration-500 group-hover:scale-110 ${
          style.icon
        }`}
      >
        {logo ? (
          <img
            src={logo}
            alt={label}
            className="h-8 w-8 object-contain"
          />
        ) : icon === "clock" ? (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7v5l3.2 2" strokeLinecap="round" />
          </svg>
        ) : icon === "cashflow" ? (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M4 19V9" strokeLinecap="round" />
            <path d="M10 19V5" strokeLinecap="round" />
            <path d="M16 19v-7" strokeLinecap="round" />
            <path d="M22 19V3" strokeLinecap="round" />
            <path d="M3 19h20" strokeLinecap="round" />
          </svg>
        ) : icon === "campaign" ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.1">
            <path d="M4 10v4a2 2 0 0 0 2 2h2l2 4h2l-1.7-6H14l5 3V7l-5 3H8a4 4 0 0 0-4 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : icon === "subscription" ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.1">
            <path d="m12 3 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 3Z" strokeLinejoin="round" />
          </svg>
        ) : icon === "settings" ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.1">
            <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
            <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.8 1.8 0 0 0-.9-3H4.1a1.7 1.7 0 0 1 0-3.4h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.7 1.7 0 0 1 3.4 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.7 1.7 0 0 1 0 3h-.2a1.8 1.8 0 0 0-.9 3Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="text-xl font-black">{icon}</span>
        )}
      </div>

      <span className={`relative mt-3 text-[10px] font-black ${style.text}`}>
        {label}
      </span>

      <span className={`relative mt-1 text-[7px] font-black uppercase tracking-[1.5px] ${style.accent}`}>
        QUICK ACCESS
      </span>
    </button>
  );
}

/* ============================================================
   VISUAL STAT
============================================================ */

function VisualStat({
  label,
  value,
  color,
}) {
  return (
    <div>
      <p className="text-[7px] font-black uppercase text-gray-400">
        {label}
      </p>

      <p
        className="mt-1 text-base font-black"
        style={{
          color,
        }}
      >
        {value}
      </p>

      <p
        className="mt-1 text-[7px] font-bold"
        style={{
          color,
        }}
      >
        ↑ 12%
      </p>
    </div>
  );
}

/* ============================================================
   VISUAL BADGE
============================================================ */

function VisualBadge({
  className,
  label,
  value,
  color,
}) {
  return (
    <div
      className={`absolute rounded-xl border border-white bg-white/90 px-3 py-2 shadow-xl backdrop-blur-xl ${className}`}
    >
      <p className="text-[7px] font-black uppercase text-gray-400">
        {label}
      </p>

      <p
        className="mt-1 text-[9px] font-black"
        style={{
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   EMAIL PREVIEW
============================================================ */

function EmailPreview({
  sender,
  subject,
  text,
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-black text-gray-500">
        {sender
          .charAt(0)
          .toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[8px] font-black text-gray-800">
          {sender}
        </p>

        <p className="mt-0.5 truncate text-[9px] font-bold text-gray-700">
          {subject}
        </p>

        <p className="mt-0.5 truncate text-[8px] text-gray-400">
          {text}
        </p>
      </div>

      <span className="h-2 w-2 rounded-full bg-red-400" />
    </div>
  );
}

/* ============================================================
   MINI VISUAL METRIC
============================================================ */

function MiniVisualMetric({
  value,
  label,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
      <p className="text-sm font-black text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase text-gray-400">
        {label}
      </p>
    </div>
  );
}

/* ============================================================
   DARK MINI METRIC
============================================================ */

function DarkMiniMetric({
  label,
  value,
  color,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-center">
      <p
        className="text-base font-black"
        style={{
          color,
        }}
      >
        {value}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase text-gray-500">
        {label}
      </p>
    </div>
  );
}

/* ============================================================
   SETTINGS VISUAL
============================================================ */

function SettingVisual({
  title,
  value,
  color,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
      <span className="text-xs font-bold text-gray-700">
        {title}
      </span>

      <span
        className="rounded-full px-3 py-1 text-[7px] font-black"
        style={{
          color,
          background:
            `${color}12`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ============================================================
   SODAH LOGO
============================================================ */

function SodahLogo({
  large = false,
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex ${
          large
            ? "h-20 w-20 rounded-[25px]"
            : "h-10 w-10 rounded-xl"
        } items-center justify-center bg-gradient-to-br from-green-400 to-cyan-400 font-black text-black shadow-[0_15px_50px_rgba(34,197,94,0.25)]`}
      >
        S
      </div>

      <div className="text-left">
        <p
          className={`font-black tracking-[-0.5px] ${
            large
              ? "text-3xl"
              : "text-lg"
          }`}
        >
          Sodah.io
        </p>

        {large && (
          <p className="mt-1 text-[9px] uppercase tracking-[3px] text-gray-400">
            AI Business Workspace
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MAINTENANCE OVERLAY
============================================================ */

function MaintenanceOverlay({
  message,
}) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[#020806]/95 p-5 backdrop-blur-2xl">
      <div className="w-full max-w-2xl rounded-[32px] border border-red-400/20 bg-[#07110d]/98 p-8 text-center shadow-[0_40px_140px_rgba(0,0,0,0.75)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-red-400/20 bg-red-500/10 text-3xl">
          ⚠️
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[3px] text-red-300">
          System Maintenance
        </p>

        <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
          Sodah is temporarily unavailable
        </h2>

        <p className="mx-auto mt-4 max-w-lg whitespace-pre-wrap text-sm leading-6 text-gray-300 md:text-base">
          {message}
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />

          Maintenance mode is active
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN ANNOUNCEMENT
============================================================ */

function AdminAnnouncement({
  message,
}) {
  if (!String(message || "").trim()) return null;
  return (
    <div className="w-full overflow-hidden border-b border-emerald-300/30 bg-[#07111a] text-white">
      <div className="flex h-9 items-center gap-3 px-3">
        <span className="shrink-0 text-[9px] font-black uppercase tracking-[1.5px] text-emerald-300">SODAH ANNOUNCEMENT</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-gray-100">📢 {message}</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INFO MODAL
============================================================ */

function InfoModal({
  eyebrow,
  title,
  children,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-[30px] border border-white/10 bg-[#08110d]/98 p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.75)] md:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[2.5px] text-green-400">
              {eyebrow}
            </p>

            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-7">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INFO BOX
============================================================ */

function InfoBox({
  icon,
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-400/10">
        {icon}
      </div>

      <h3 className="mt-4 font-black">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-gray-400">
        {text}
      </p>
    </div>
  );
}

/* ============================================================
   SUPPORT MODAL
============================================================ */

function SupportModal({
  user,
  onClose,
  onNavigate,
}) {
  return (
    <div className="fixed inset-0 z-[360] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[#07110d]/98 p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.75)] md:p-8">

        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[2.5px] text-cyan-300">
              AI ASSISTANT
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Help & Support
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-5">

          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-cyan-400 text-xl text-black">
              🤖
            </span>

            <div>
              <p className="text-sm font-black">
                Sodah AI Support
              </p>

              <p className="text-xs text-gray-500">
                {user?.email ||
                  "Your workspace"}
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-gray-300">
            Get help with WhatsApp,
            Gmail, campaigns,
            subscriptions and your
            Sodah workspace.
          </p>

          <button
            type="button"
            onClick={() =>
              onNavigate(
                "/system-support"
              )
            }
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-green-400 to-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:-translate-y-0.5"
          >
            Open Support Center →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHOWCASE PROGRESS ANIMATION
============================================================ */

function ShowcaseProgressStyle() {
  return null;
}