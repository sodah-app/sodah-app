/* ==========================================================================
   SODAH AUTOMATION / BUSINESS ONBOARDING

   BUSINESS-ONLY ONBOARDING

   FLOW
   --------------------------------------------------------------------------
   Existing business:
      Active, unexpired subscription -> /channels
      Missing/expired subscription -> /subscription

   New business:
      Login -> business onboarding -> save business -> /subscription
      -> selected subscription -> /channels

   Subscription access is enforced by the subscription and workspace routes.

   IMPORTANT
   --------------------------------------------------------------------------
   - No Personal setup.
   - No setup-type selector.
   - No visible AI configuration section.
   - AI capabilities are configured automatically when the business is saved.
   - Business WhatsApp number automatically becomes support_number.
   - Business description requires at least 20 words and supports up to 500 characters.
   - New businesses are sent to subscription selection before the workspace.
   - Existing businesses with active, unexpired subscriptions go to /channels.
   - New businesses and businesses with missing/expired subscriptions go to /subscription.
   - The /channels route must also enforce expiry for direct URL access.
   ========================================================================== */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const MAX_DESCRIPTION_CHARACTERS = 500;
const MIN_DESCRIPTION_WORDS = 20;

function countWords(value) {
  const text = String(value || "").trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/* ==========================================================================
   SUBSCRIPTION ACCESS CHECK
   --------------------------------------------------------------------------
   Use the subscription fields stored on the business record. Missing status,
   missing expiry, invalid dates, and expired subscriptions are not active.
   ========================================================================== */
function hasActiveSubscription(business) {
  if (!business) return false;

  const status = String(
    business.subscription_status || ""
  ).trim().toLowerCase();

  const allowedStatuses = new Set([
    "active",
    "approved",
    "trial",
    "trialing",
  ]);

  if (!allowedStatuses.has(status)) return false;

  const expiry = business.subscription_expiry;
  if (!expiry) return false;

  const expiryTime = new Date(expiry).getTime();
  if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) {
    return false;
  }

  return true;
}

/* ==========================================================================
   COUNTRIES
   ========================================================================== */

const countries = [
  { id: "AF", code: "+93", flag: "🇦🇫", name: "Afghanistan" },
  { id: "AL", code: "+355", flag: "🇦🇱", name: "Albania" },
  { id: "DZ", code: "+213", flag: "🇩🇿", name: "Algeria" },
  { id: "AD", code: "+376", flag: "🇦🇩", name: "Andorra" },
  { id: "AO", code: "+244", flag: "🇦🇴", name: "Angola" },
  { id: "AR", code: "+54", flag: "🇦🇷", name: "Argentina" },
  { id: "AM", code: "+374", flag: "🇦🇲", name: "Armenia" },
  { id: "AU", code: "+61", flag: "🇦🇺", name: "Australia" },
  { id: "AT", code: "+43", flag: "🇦🇹", name: "Austria" },
  { id: "AZ", code: "+994", flag: "🇦🇿", name: "Azerbaijan" },
  { id: "BH", code: "+973", flag: "🇧🇭", name: "Bahrain" },
  { id: "BD", code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { id: "BY", code: "+375", flag: "🇧🇾", name: "Belarus" },
  { id: "BE", code: "+32", flag: "🇧🇪", name: "Belgium" },
  { id: "BJ", code: "+229", flag: "🇧🇯", name: "Benin" },
  { id: "BO", code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { id: "BA", code: "+387", flag: "🇧🇦", name: "Bosnia and Herzegovina" },
  { id: "BW", code: "+267", flag: "🇧🇼", name: "Botswana" },
  { id: "BR", code: "+55", flag: "🇧🇷", name: "Brazil" },
  { id: "BG", code: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { id: "BF", code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { id: "BI", code: "+257", flag: "🇧🇮", name: "Burundi" },
  { id: "KH", code: "+855", flag: "🇰🇭", name: "Cambodia" },
  { id: "CM", code: "+237", flag: "🇨🇲", name: "Cameroon" },
  { id: "CA", code: "+1", flag: "🇨🇦", name: "Canada" },
  { id: "CV", code: "+238", flag: "🇨🇻", name: "Cape Verde" },
  { id: "CF", code: "+236", flag: "🇨🇫", name: "Central African Republic" },
  { id: "TD", code: "+235", flag: "🇹🇩", name: "Chad" },
  { id: "CL", code: "+56", flag: "🇨🇱", name: "Chile" },
  { id: "CN", code: "+86", flag: "🇨🇳", name: "China" },
  { id: "CO", code: "+57", flag: "🇨🇴", name: "Colombia" },
  { id: "KM", code: "+269", flag: "🇰🇲", name: "Comoros" },
  { id: "CG", code: "+242", flag: "🇨🇬", name: "Congo" },
  { id: "CD", code: "+243", flag: "🇨🇩", name: "Congo (DRC)" },
  { id: "CR", code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { id: "HR", code: "+385", flag: "🇭🇷", name: "Croatia" },
  { id: "CU", code: "+53", flag: "🇨🇺", name: "Cuba" },
  { id: "CY", code: "+357", flag: "🇨🇾", name: "Cyprus" },
  { id: "CZ", code: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { id: "DK", code: "+45", flag: "🇩🇰", name: "Denmark" },
  { id: "DJ", code: "+253", flag: "🇩🇯", name: "Djibouti" },
  { id: "EG", code: "+20", flag: "🇪🇬", name: "Egypt" },
  { id: "EE", code: "+372", flag: "🇪🇪", name: "Estonia" },
  { id: "ET", code: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { id: "FI", code: "+358", flag: "🇫🇮", name: "Finland" },
  { id: "FR", code: "+33", flag: "🇫🇷", name: "France" },
  { id: "DE", code: "+49", flag: "🇩🇪", name: "Germany" },
  { id: "GH", code: "+233", flag: "🇬🇭", name: "Ghana" },
  { id: "GR", code: "+30", flag: "🇬🇷", name: "Greece" },
  { id: "HK", code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { id: "HU", code: "+36", flag: "🇭🇺", name: "Hungary" },
  { id: "IS", code: "+354", flag: "🇮🇸", name: "Iceland" },
  { id: "IN", code: "+91", flag: "🇮🇳", name: "India" },
  { id: "ID", code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { id: "IR", code: "+98", flag: "🇮🇷", name: "Iran" },
  { id: "IQ", code: "+964", flag: "🇮🇶", name: "Iraq" },
  { id: "IE", code: "+353", flag: "🇮🇪", name: "Ireland" },
  { id: "IL", code: "+972", flag: "🇮🇱", name: "Israel" },
  { id: "IT", code: "+39", flag: "🇮🇹", name: "Italy" },
  { id: "JP", code: "+81", flag: "🇯🇵", name: "Japan" },
  { id: "JO", code: "+962", flag: "🇯🇴", name: "Jordan" },
  { id: "KE", code: "+254", flag: "🇰🇪", name: "Kenya" },
  { id: "KW", code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { id: "LB", code: "+961", flag: "🇱🇧", name: "Lebanon" },
  { id: "LY", code: "+218", flag: "🇱🇾", name: "Libya" },
  { id: "LU", code: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { id: "MY", code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { id: "MT", code: "+356", flag: "🇲🇹", name: "Malta" },
  { id: "MX", code: "+52", flag: "🇲🇽", name: "Mexico" },
  { id: "MA", code: "+212", flag: "🇲🇦", name: "Morocco" },
  { id: "NL", code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { id: "NZ", code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { id: "NG", code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { id: "NO", code: "+47", flag: "🇳🇴", name: "Norway" },
  { id: "OM", code: "+968", flag: "🇴🇲", name: "Oman" },
  { id: "PK", code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { id: "PA", code: "+507", flag: "🇵🇦", name: "Panama" },
  { id: "PE", code: "+51", flag: "🇵🇪", name: "Peru" },
  { id: "PH", code: "+63", flag: "🇵🇭", name: "Philippines" },
  { id: "PL", code: "+48", flag: "🇵🇱", name: "Poland" },
  { id: "PT", code: "+351", flag: "🇵🇹", name: "Portugal" },
  { id: "QA", code: "+974", flag: "🇶🇦", name: "Qatar" },
  { id: "RO", code: "+40", flag: "🇷🇴", name: "Romania" },
  { id: "RU", code: "+7", flag: "🇷🇺", name: "Russia" },
  { id: "SA", code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { id: "SN", code: "+221", flag: "🇸🇳", name: "Senegal" },
  { id: "SG", code: "+65", flag: "🇸🇬", name: "Singapore" },
  { id: "ZA", code: "+27", flag: "🇿🇦", name: "South Africa" },
  { id: "KR", code: "+82", flag: "🇰🇷", name: "South Korea" },
  { id: "ES", code: "+34", flag: "🇪🇸", name: "Spain" },
  { id: "LK", code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { id: "SE", code: "+46", flag: "🇸🇪", name: "Sweden" },
  { id: "CH", code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { id: "SY", code: "+963", flag: "🇸🇾", name: "Syria" },
  { id: "TW", code: "+886", flag: "🇹🇼", name: "Taiwan" },
  { id: "TH", code: "+66", flag: "🇹🇭", name: "Thailand" },
  { id: "TN", code: "+216", flag: "🇹🇳", name: "Tunisia" },
  { id: "TR", code: "+90", flag: "🇹🇷", name: "Turkey" },
  { id: "UG", code: "+256", flag: "🇺🇬", name: "Uganda" },
  { id: "UA", code: "+380", flag: "🇺🇦", name: "Ukraine" },
  { id: "AE", code: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { id: "GB", code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { id: "US", code: "+1", flag: "🇺🇸", name: "United States" },
  { id: "UY", code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { id: "VE", code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { id: "VN", code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { id: "YE", code: "+967", flag: "🇾🇪", name: "Yemen" },
  { id: "ZM", code: "+260", flag: "🇿🇲", name: "Zambia" },
  { id: "ZW", code: "+263", flag: "🇿🇼", name: "Zimbabwe" },
];

/* ==========================================================================
   INDUSTRIES
   ========================================================================== */

const industries = [
  "Healthcare",
  "Dental Clinic",
  "Medical Center",
  "Pharmacy",
  "Retail",
  "E-commerce",
  "Real Estate",
  "Property Management",
  "Education",
  "Training Center",
  "Legal Services",
  "Accounting",
  "Financial Services",
  "Insurance",
  "Automotive",
  "Car Rental",
  "Beauty Salon",
  "Barbershop",
  "Spa",
  "Fitness Gym",
  "Restaurant",
  "Cafe",
  "Catering",
  "Hotel",
  "Travel Agency",
  "Tourism",
  "Construction",
  "Architecture",
  "Interior Design",
  "Photography",
  "Cleaning Services",
  "Repair Services",
  "Consulting",
  "Marketing Agency",
  "IT Services",
  "Software",
  "Logistics",
  "Transportation",
  "Manufacturing",
  "Wholesale",
  "Other / Add industry",
];

/* ==========================================================================
   PRICE OPTIONS
   ========================================================================== */

const priceRanges = [
  "$1 - $50",
  "$50 - $100",
  "$100 - $500",
  "$500 - $1,000",
  "$1,000 - $5,000",
  "$5,000+",
  "Custom pricing",
];

/* ==========================================================================
   WORKING DAYS
   ========================================================================== */

const workingDaysList = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/* ==========================================================================
   AI CAPABILITIES
   INTERNAL ONLY
   --------------------------------------------------------------------------
   These are automatically stored on the business record.
   They are deliberately NOT displayed on the onboarding page.
   ========================================================================== */

const BUSINESS_CAPABILITIES = [
  "Appointment Booking",
  "AI Reply",
  "Follow-up Messages",
  "Order Handling",
  "Lead Capture",
  "Customer Support",
  "Reminders",
  "Payments",
  "FAQ Answers",
  "Order Tracking",
  "WhatsApp Broadcast",
  "Review Requests",
  "Quotation Requests",
  "Inventory Checks",
  "Sales Automation",
];

/* ==========================================================================
   HELPERS
   ========================================================================== */

function cleanPhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCountryId(value) {
  const id = String(value || "")
    .trim()
    .toUpperCase();

  return countries.some(
    (country) => country.id === id
  )
    ? id
    : "AE";
}

function countryById(id) {
  return (
    countries.find(
      (country) =>
        country.id === normalizeCountryId(id)
    ) ||
    countries.find(
      (country) => country.id === "AE"
    )
  );
}

function formatInternationalNumber(
  countryId,
  number
) {
  const country = countryById(countryId);

  return `${country?.code || "+971"}${cleanPhoneNumber(
    number
  )}`;
}

function isValidPhoneNumber(
  countryId,
  number
) {
  const clean = cleanPhoneNumber(number);
  const id = normalizeCountryId(countryId);

  if (id === "CA" || id === "US") {
    return clean.length === 10;
  }

  return clean.length >= 5;
}

function isGoogleMapsLocation(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return (
    normalized.includes(
      "google.com/maps"
    ) ||
    normalized.includes(
      "maps.google.com"
    ) ||
    normalized.includes(
      "maps.app.goo.gl"
    ) ||
    normalized.includes(
      "goo.gl/maps"
    )
  );
}

function isDetailedBusinessLocation(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ");

  if (normalized.length < 25) {
    return false;
  }

  if (isGoogleMapsLocation(normalized)) {
    return true;
  }

  const detailWords =
    /\b(building|tower|floor|unit|office|suite|shop|street|st|road|rd|avenue|ave|lane|ln|block|district|area|mall|landmark|near|opposite|behind|next to|beside|plot|villa|warehouse|center|centre)\b/i;

  const hasDetailWord =
    detailWords.test(normalized);

  const hasEnoughWords =
    normalized
      .split(/\s+/)
      .filter(Boolean).length >= 5;

  return (
    hasDetailWord &&
    hasEnoughWords
  );
}

function locationErrorMessage(value) {
  if (!String(value || "").trim()) {
    return "Please enter the exact business location or paste the Google Maps link.";
  }

  if (!isDetailedBusinessLocation(value)) {
    return "Please paste a Google Maps location link or enter the exact business address.";
  }

  return "";
}

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function AutomationPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] =
    useState(true);
  const [initializing, setInitializing] =
    useState(true);

  const [loginName, setLoginName] =
    useState("");

  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [invalidFields, setInvalidFields] =
    useState([]);

  const [showDaysDropdown, setShowDaysDropdown] =
    useState(false);

  const daysRef = useRef(null);

  const [form, setForm] = useState({
    businessName: "",
    industry: "",
    customIndustry: "",

    email: "",
    location: "",

    priceRange: "",
    customPrice: "",

    aiCountry: "AE",
    aiCode: "+971",
    aiNumber: "",

    workingDays: [],

    hours: "",
    customHours: "",

    serviceDescription: "",

    /*
     * Internal only.
     * Never displayed in the UI.
     */
    capabilities: BUSINESS_CAPABILITIES,
  });

  /* ==========================================================================
     THEME
     ========================================================================== */

  useEffect(() => {
    try {
      const savedTheme =
        localStorage.getItem("theme");

      if (savedTheme) {
        document.documentElement.dataset.sodahTheme =
          savedTheme;
      }
    } catch {
      // Theme preference is optional.
    }
  }, []);

  /* ==========================================================================
     ACCOUNT INITIALIZATION
     ========================================================================== */

  useEffect(() => {
    let mounted = true;

    const initializePage = async () => {
      setInitializing(true);
      setCheckingAccount(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user = session?.user;

        if (!user) {
          router.replace("/login");
          return;
        }

        /*
         * Load the logged-in user's display name.
         *
         * Priority:
         * 1. full_name
         * 2. name
         * 3. email username
         */
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "there";

        if (mounted) {
          setLoginName(displayName);
        }

        const email =
          user.email || "";

        if (!mounted) {
          return;
        }

        setForm((previous) => ({
          ...previous,
          email:
            previous.email || email,
          capabilities:
            BUSINESS_CAPABILITIES,
        }));

        /* ====================================================================
           EXISTING ONBOARDING TRACKING
           ==================================================================== */

        let onboardingData = null;

        try {
          const onboardingResponse =
            await fetch(
              "/api/onboarding/track",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization:
                    `Bearer ${session.access_token}`,
                },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({
                  event: "login",
                }),
              }
            );

          onboardingData =
            await onboardingResponse
              .json()
              .catch(() => ({}));
        } catch (onboardingError) {
          console.warn(
            "[Sodah] Onboarding tracking failed:",
            onboardingError
          );
        }

        /* ====================================================================
           CHECK FOR EXISTING BUSINESS
           ==================================================================== */

        let existingBusiness = null;

        /*
         * First check authenticated user ID.
         */
        const {
          data: businessByUser,
          error: businessUserError,
        } = await supabase
          .from("businesses")
          .select(
            "id,business_id,user_id,business_name,whatsapp_connected,subscription_plan,subscription_status,subscription_expiry"
          )
          .eq("user_id", user.id)
          .limit(1);

        if (businessUserError) {
          console.warn(
            "[Sodah] Business user lookup failed:",
            businessUserError
          );
        } else if (
          Array.isArray(businessByUser) &&
          businessByUser.length > 0
        ) {
          existingBusiness =
            businessByUser[0];
        }

        /*
         * Second check authenticated email.
         */
        if (
          !existingBusiness &&
          user.email
        ) {
          const {
            data: businessByEmail,
            error: businessEmailError,
          } = await supabase
            .from("businesses")
            .select(
              "id,business_id,user_id,business_name,whatsapp_connected,subscription_plan,subscription_status,subscription_expiry"
            )
            .eq("email", user.email)
            .limit(1);

          if (businessEmailError) {
            console.warn(
              "[Sodah] Business email lookup failed:",
              businessEmailError
            );
          } else if (
            Array.isArray(
              businessByEmail
            ) &&
            businessByEmail.length > 0
          ) {
            existingBusiness =
              businessByEmail[0];
          }
        }

        /*
         * Existing onboarding API fallback.
         */
        const onboardingBusinessId =
          onboardingData?.business_id ||
          "";

        if (
          !existingBusiness &&
          onboardingData?.onboarding_completed &&
          onboardingBusinessId
        ) {
          existingBusiness = {
            business_id:
              onboardingBusinessId,
          };
        }

        /* ====================================================================
           EXISTING BUSINESS
           --------------------------------------------------------------------
           Never reopen onboarding for an existing business. Verify its saved
           subscription before deciding between /channels and /subscription.
           ==================================================================== */

        if (existingBusiness?.business_id) {
          // The onboarding tracking fallback may only return a business ID.
          // Fetch the authoritative subscription fields before routing.
          if (
            existingBusiness.subscription_status === undefined ||
            existingBusiness.subscription_expiry === undefined
          ) {
            const { data: subscriptionBusiness, error: subscriptionLookupError } =
              await supabase
                .from("businesses")
                .select("business_id,subscription_plan,subscription_status,subscription_expiry")
                .eq("business_id", String(existingBusiness.business_id))
                .maybeSingle();

            if (subscriptionLookupError) {
              throw new Error(
                "Unable to verify your subscription. Please try again."
              );
            }

            if (subscriptionBusiness) {
              existingBusiness = {
                ...existingBusiness,
                ...subscriptionBusiness,
              };
            }
          }
          const businessId =
            String(
              existingBusiness.business_id
            ).trim();

          if (!businessId) {
            throw new Error(
              "Your business account was found, but no business ID is available."
            );
          }

          try {
            localStorage.setItem(
              "business_id",
              businessId
            );

            localStorage.setItem(
              "user_id",
              user.id
            );

            if (user.email) {
              localStorage.setItem(
                "user_email",
                user.email
              );
            }
          } catch {
            // Local persistence is optional.
          }

          if (hasActiveSubscription(existingBusiness)) {
            router.replace(
              `/channels?businessId=${encodeURIComponent(
                businessId
              )}`
            );
          } else {
            router.replace(
              `/subscription?businessId=${encodeURIComponent(
                businessId
              )}&returnTo=channels`
            );
          }

          return;
        }

        /* ====================================================================
           NEW BUSINESS
           --------------------------------------------------------------------
           KEEP THE FORM OPEN.
           ==================================================================== */

        try {
          localStorage.removeItem(
            "business_id"
          );
        } catch {
          // Optional cleanup.
        }

        if (mounted) {
          setCheckingAccount(false);
          setInitializing(false);
        }
      } catch (err) {
        console.error(
          "[Sodah] Initialization failed:",
          err
        );

        if (!mounted) {
          return;
        }

        const message =
          err?.message || "";

        if (
          /session/i.test(message) &&
          /expired|missing|invalid/i.test(
            message
          )
        ) {
          router.replace("/login");
          return;
        }

        setCheckingAccount(false);
        setInitializing(false);
      }
    };

    initializePage();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* ==========================================================================
     CLOSE WORKING-DAYS DROPDOWN
     ========================================================================== */

  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        daysRef.current &&
        !daysRef.current.contains(
          event.target
        )
      ) {
        setShowDaysDropdown(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* ==========================================================================
     FORM HELPERS
     ========================================================================== */

  const setField = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setInvalidFields((previous) =>
      previous.filter(
        (item) => item !== field
      )
    );
  };

  const toggleWorkingDay = (
    day
  ) => {
    setForm((previous) => ({
      ...previous,

      workingDays:
        previous.workingDays.includes(day)
          ? previous.workingDays.filter(
              (item) => item !== day
            )
          : [
              ...previous.workingDays,
              day,
            ],
    }));

    setInvalidFields((previous) =>
      previous.filter(
        (item) =>
          item !== "workingDays"
      )
    );
  };

  const displaySelectedDays =
    () => {
      if (!form.workingDays.length) {
        return "Choose working days";
      }

      return form.workingDays.join(
        ", "
      );
    };

  /* ==========================================================================
     SUBMIT
     ========================================================================== */

  const handleSubmit =
    async () => {
      setError("");
      setInvalidFields([]);

      const invalid = [];

      /* Business name */
      if (
        !form.businessName.trim()
      ) {
        invalid.push(
          "businessName"
        );
      }

      /* Business email */
      if (!form.email.trim()) {
        invalid.push("email");
      }

      /* Industry */
      if (!form.industry) {
        invalid.push("industry");
      }

      /* Custom industry */
      if (
        form.industry ===
          "Other / Add industry" &&
        !form.customIndustry.trim()
      ) {
        invalid.push(
          "customIndustry"
        );
      }

      /* Business location */
      if (
        !isDetailedBusinessLocation(
          form.location
        )
      ) {
        invalid.push("location");
      }

      /* Price */
      const finalPrice =
        form.priceRange ===
        "Custom pricing"
          ? form.customPrice.trim()
          : form.priceRange;

      if (!finalPrice) {
        invalid.push(
          "priceRange"
        );
      }

      /* WhatsApp number */
      if (
        !isValidPhoneNumber(
          form.aiCountry,
          form.aiNumber
        )
      ) {
        invalid.push(
          "aiNumber"
        );
      }

      /* Working days */
      if (
        !form.workingDays.length
      ) {
        invalid.push(
          "workingDays"
        );
      }

      /* Working hours */
      const finalHours =
        form.hours ===
        "Custom hours"
          ? form.customHours.trim()
          : form.hours;

      if (!finalHours) {
        invalid.push("hours");
      }

      /* Business description: required, minimum 20 words, maximum 500 characters. */
      const descriptionWordCount = countWords(
        form.serviceDescription
      );

      if (
        !form.serviceDescription.trim() ||
        descriptionWordCount < MIN_DESCRIPTION_WORDS ||
        form.serviceDescription.length > MAX_DESCRIPTION_CHARACTERS
      ) {
        invalid.push("serviceDescription");
      }

      /* ======================================================================
         VALIDATION FAILURE
         ====================================================================== */

      if (invalid.length > 0) {
        setInvalidFields(invalid);

        const locationMessage =
          invalid.includes("location")
            ? locationErrorMessage(
                form.location
              )
            : "";

        const message =
          invalid.includes("serviceDescription") &&
          descriptionWordCount < MIN_DESCRIPTION_WORDS
            ? `Please describe your business in at least ${MIN_DESCRIPTION_WORDS} words. You currently have ${descriptionWordCount} word${descriptionWordCount === 1 ? "" : "s"}. (${form.serviceDescription.length}/${MAX_DESCRIPTION_CHARACTERS} characters).`
            : locationMessage ||
              (invalid.includes("serviceDescription") && form.serviceDescription.length > MAX_DESCRIPTION_CHARACTERS
                ? `Your business description cannot exceed ${MAX_DESCRIPTION_CHARACTERS} characters.`
                : "Please complete the required business information.");

        setError(message);
        setShake(true);

        setTimeout(
          () => setShake(false),
          400
        );

        setTimeout(() => {
          setError("");
          setInvalidFields([]);
        }, 5000);

        return;
      }

      if (
        loading ||
        checkingAccount
      ) {
        return;
      }

      setLoading(true);

      try {
        /* ====================================================================
           CURRENT SESSION
           ==================================================================== */

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user = session?.user;

        if (
          !user ||
          !session?.access_token
        ) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        /* ====================================================================
           PHONE
           ==================================================================== */

        const aiNumber =
          formatInternationalNumber(
            form.aiCountry,
            form.aiNumber
          );

        /*
         * Business WhatsApp number is automatically
         * used as the support number.
         */
        const supportNumber =
          aiNumber;

        /* ====================================================================
           INDUSTRY
           ==================================================================== */

        const finalIndustry =
          form.industry ===
          "Other / Add industry"
            ? form.customIndustry.trim()
            : form.industry;

        /* ====================================================================
           AUTOMATIC AI CONFIGURATION
           --------------------------------------------------------------------
           Not shown to the user.
           ==================================================================== */

        const automaticCapabilities =
          BUSINESS_CAPABILITIES.join(
            ", "
          );

        /* ====================================================================
           API PAYLOAD
           ==================================================================== */

        const apiPayload = {
          userId: user.id,

          /*
           * Keep this internally for the existing
           * onboarding API implementation.
           */
          setupType: "business",

          businessName:
            form.businessName.trim(),

          industry:
            finalIndustry,

          email:
            form.email.trim() ||
            user.email ||
            "",

          location:
            form.location.trim(),

          priceRange:
            finalPrice,

          serviceDescription:
            form.serviceDescription.trim(),

          /*
           * Business WhatsApp.
           */
          aiNumber,

          /*
           * Automatically assigned.
           */
          supportNumber,

          workingDays:
            form.workingDays.join(
              ", "
            ),

          hours:
            finalHours,

          /*
           * Automatically configured.
           */
          capabilities:
            automaticCapabilities,
        };

        /* ====================================================================
           SAVE BUSINESS
           ==================================================================== */

        const apiRes =
          await fetch(
            "/api/business/automation",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${session.access_token}`,
              },
              credentials: "include",
              cache: "no-store",
              body: JSON.stringify(
                apiPayload
              ),
            }
          );

        let apiData = {};

        try {
          apiData =
            await apiRes.json();
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }

        /* ====================================================================
           BUSINESS ALREADY EXISTS
           ==================================================================== */

        if (
          !apiRes.ok ||
          !apiData.success
        ) {
          if (
            apiData?.alreadyExists &&
            apiData?.business_id
          ) {
            const existingBusinessId =
              String(
                apiData.business_id
              ).trim();

            localStorage.setItem(
              "business_id",
              existingBusinessId
            );

            localStorage.setItem(
              "user_id",
              user.id
            );

            if (user.email) {
              localStorage.setItem(
                "user_email",
                user.email
              );
            }

            /*
             * Existing business must never return to onboarding. Verify its
             * stored subscription status and expiry before choosing a route.
             */
            const { data: existingSubscription, error: existingSubscriptionError } =
              await supabase
                .from("businesses")
                .select("business_id,subscription_plan,subscription_status,subscription_expiry")
                .eq("business_id", existingBusinessId)
                .maybeSingle();

            if (existingSubscriptionError) {
              throw new Error(
                "Unable to verify your subscription. Please try again."
              );
            }

            if (hasActiveSubscription(existingSubscription)) {
              router.replace(
                `/channels?businessId=${encodeURIComponent(
                  existingBusinessId
                )}`
              );
            } else {
              router.replace(
                `/subscription?businessId=${encodeURIComponent(
                  existingBusinessId
                )}&returnTo=channels`
              );
            }

            return;
          }

          throw new Error(
            apiData.message ||
              "Failed to save your business setup."
          );
        }

        /* ====================================================================
           BUSINESS ID
           ==================================================================== */

        const businessId =
          String(
            apiData.business_id ||
              ""
          ).trim();

        if (!businessId) {
          throw new Error(
            "Setup was saved, but no business ID was returned."
          );
        }

        /* ====================================================================
           LOCAL BUSINESS CONTEXT
           ==================================================================== */

        localStorage.setItem(
          "business_id",
          businessId
        );

        localStorage.setItem(
          "user_id",
          user.id
        );

        if (user.email) {
          localStorage.setItem(
            "user_email",
            user.email
          );
        }

        /* ====================================================================
           WELCOME EMAIL
           --------------------------------------------------------------------
           Non-blocking.
           ==================================================================== */

        try {
          await fetch(
            "/api/auth/welcome-email",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                user_id:
                  user.id,

                email:
                  user.email ||
                  apiPayload.email ||
                  "",

                full_name:
                  user.user_metadata
                    ?.full_name ||
                  user.user_metadata
                    ?.name ||
                  user.email
                    ?.split("@")[0] ||
                  "",

                business_name:
                  apiPayload.businessName,

                business_id:
                  businessId,
              }),
            }
          );
        } catch (emailError) {
          console.warn(
            "[Sodah] Welcome email failed:",
            emailError
          );
        }

        /* ====================================================================
           NEW BUSINESS
           --------------------------------------------------------------------
           IMPORTANT:
           DO NOT GO DIRECTLY TO CHANNELS.
           
           New business:
             1. Business saved.
             2. Subscription page.
             3. Subscription selected.
             4. Subscription page sends user to workspace.
           ==================================================================== */

        router.replace(
          `/subscription?businessId=${encodeURIComponent(
            businessId
          )}&onboarding=1`
        );
      } catch (err) {
        console.error(
          "[Sodah] Submission failed:",
          err
        );

        setError(
          err?.message ||
            "Failed to save your business setup. Please try again."
        );

        setShake(true);

        setTimeout(
          () => setShake(false),
          400
        );

        setTimeout(
          () => setError(""),
          6000
        );
      } finally {
        setLoading(false);
      }
    };

  /* ==========================================================================
     INITIAL LOADING
     ========================================================================== */

  if (initializing) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030712] px-6 text-white">
        {/* Premium ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-400/[0.12] blur-[140px]" />
          <div className="absolute -right-40 top-[18%] h-[520px] w-[520px] rounded-full bg-cyan-400/[0.10] blur-[150px]" />
          <div className="absolute -bottom-64 left-[28%] h-[560px] w-[560px] rounded-full bg-blue-500/[0.10] blur-[160px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.12),rgba(2,6,23,0.78))]" />
        </div>

        <section className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-white/[0.06] shadow-[0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-xl">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-300" fill="none" aria-hidden="true">
                <path d="M5 18.5 6.3 14A7.5 7.5 0 1 1 9 17.3L5 18.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 9.2c.4 2.2 2 3.8 4.2 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-xl font-semibold tracking-[-0.04em]">sodah<span className="text-emerald-300">.io</span></div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">Business automation</div>
            </div>
          </div>

          <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
            <div className="absolute inset-1 rounded-full border border-emerald-300/10" />
            <div className="premiumLoadingRing" />
            <div className="absolute inset-[19px] rounded-full bg-emerald-300/[0.07] shadow-[0_0_34px_rgba(52,211,153,0.10)]" />
            <svg viewBox="0 0 24 24" className="relative z-10 h-7 w-7 text-emerald-300" fill="none" aria-hidden="true">
              <path d="M5 18.5 6.3 14A7.5 7.5 0 1 1 9 17.3L5 18.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 9.2c.4 2.2 2 3.8 4.2 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>

          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">One moment, please</p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-[28px]">Preparing your workspace</h2>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300/60">Checking your account and getting your business experience ready.</p>

          <div className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="premiumLoadingBar h-full w-2/5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300" />
          </div>
          <p className="mt-4 text-[11px] tracking-wide text-white/30">Secure setup · Sodah.io</p>
        </section>

        <style jsx>{`
          .premiumLoadingRing {
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            border: 2px solid transparent;
            border-top-color: rgba(110, 231, 183, 0.95);
            border-right-color: rgba(45, 212, 191, 0.45);
            animation: sodahSpin 1.15s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
          }
          .premiumLoadingBar {
            animation: sodahProgress 1.8s ease-in-out infinite;
            transform-origin: left center;
          }
          @keyframes sodahSpin { to { transform: rotate(360deg); } }
          @keyframes sodahProgress {
            0% { transform: translateX(-110%) scaleX(0.55); opacity: 0.55; }
            50% { transform: translateX(90%) scaleX(1); opacity: 1; }
            100% { transform: translateX(270%) scaleX(0.55); opacity: 0.55; }
          }
          @media (prefers-reduced-motion: reduce) {
            .premiumLoadingRing, .premiumLoadingBar { animation-duration: 4s; }
          }
        `}</style>
      </main>
    );
  }

  /* ==========================================================================
     MAIN PAGE
     ========================================================================== */

  return (
    <main
      className={`min-h-screen w-full overflow-x-hidden bg-[#020617] text-white ${
        shake ? "shake" : ""
      }`}
    >
      {/* ======================================================================
          BACKGROUND
          ====================================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full bg-emerald-500/[0.08] blur-[150px]" />

        <div className="absolute -right-56 top-1/3 h-[620px] w-[620px] rounded-full bg-cyan-500/[0.07] blur-[170px]" />

        <div className="absolute bottom-[-300px] left-1/3 h-[650px] w-[650px] rounded-full bg-blue-500/[0.06] blur-[180px]" />
      </div>

      {/* ======================================================================
          HEADER
          ====================================================================== */}

      <header className="relative z-10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                alt="WhatsApp"
                className="h-6 w-6"
              />
            </div>

            <div>
              <div className="text-base font-black tracking-tight">
                sodah.io
              </div>

              <div className="text-[10px] text-white/35">
                Business Automation
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            className="text-xs font-semibold text-white/45 transition hover:text-white"
          >
            Already have an account?{" "}
            <span className="text-emerald-300">
              Sign in
            </span>
          </button>
        </div>
      </header>

      {/* ======================================================================
          PAGE CONTENT
          ====================================================================== */}

      <section className="relative z-10 px-4 pb-12 pt-7 sm:px-6">
        <div className="mx-auto max-w-4xl">

          {/* ==================================================================
              WELCOME / TITLE
              ================================================================== */}

          <div className="mx-auto mb-7 max-w-3xl text-center">
            <p className="mb-2 text-sm font-medium text-white/45">
              Hello {loginName || "there"} 👋
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Tell us about your business
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/40">
              Add your business details to
              get started.
            </p>
          </div>

          {/* ==================================================================
              BUSINESS FORM
              ================================================================== */}

          <div className="rounded-[26px] border border-white/10 bg-[#0b1220]/90 shadow-[0_25px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <div className="p-5 sm:p-7 md:p-8">

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* ============================================================
                    BUSINESS NAME
                    ============================================================ */}

                <Field
                  label="Business name"
                  required
                  error={invalidFields.includes(
                    "businessName"
                  )}
                >
                  <input
                    className="premiumInput"
                    placeholder="e.g. Sodah Clinic"
                    value={
                      form.businessName
                    }
                    onChange={(event) =>
                      setField(
                        "businessName",
                        event.target.value
                      )
                    }
                  />
                </Field>

                {/* ============================================================
                    BUSINESS EMAIL
                    ============================================================ */}

                <Field
                  label="Business email"
                  required
                  error={invalidFields.includes(
                    "email"
                  )}
                >
                  <input
                    className="premiumInput"
                    type="email"
                    placeholder="business@example.com"
                    value={form.email}
                    onChange={(event) =>
                      setField(
                        "email",
                        event.target.value
                      )
                    }
                  />
                </Field>

                {/* ============================================================
                    BUSINESS LOCATION
                    ============================================================ */}

                <Field
                  label="Business location"
                  required
                  error={invalidFields.includes(
                    "location"
                  )}
                >
                  <input
                    className="premiumInput"
                    placeholder="Google Maps link or exact address"
                    value={
                      form.location
                    }
                    onChange={(event) =>
                      setField(
                        "location",
                        event.target.value
                      )
                    }
                  />
                </Field>

                {/* ============================================================
                    INDUSTRY
                    ============================================================ */}

                <Field
                  label="Industry"
                  required
                  error={invalidFields.includes(
                    "industry"
                  )}
                >
                  <select
                    className="premiumInput"
                    value={
                      form.industry
                    }
                    onChange={(event) =>
                      setField(
                        "industry",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Choose your industry
                    </option>

                    {industries.map(
                      (industry) => (
                        <option
                          key={industry}
                          value={industry}
                        >
                          {industry}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                {/* ============================================================
                    CUSTOM INDUSTRY
                    ============================================================ */}

                {form.industry ===
                  "Other / Add industry" && (
                  <Field
                    label="Your industry"
                    required
                    error={invalidFields.includes(
                      "customIndustry"
                    )}
                  >
                    <input
                      className="premiumInput"
                      placeholder="Enter your industry"
                      value={
                        form.customIndustry
                      }
                      onChange={(event) =>
                        setField(
                          "customIndustry",
                          event.target.value
                        )
                      }
                    />
                  </Field>
                )}

                {/* ============================================================
                    BUSINESS WHATSAPP
                    ============================================================ */}

                <div className="md:col-span-2">
                  <Field
                    label="Business WhatsApp number"
                    required
                    error={invalidFields.includes(
                      "aiNumber"
                    )}
                  >
                    <PhoneInput
                      countries={
                        countries
                      }
                      valueCountry={
                        form.aiCountry
                      }
                      valueCode={
                        form.aiCode
                      }
                      valueNumber={
                        form.aiNumber
                      }
                      placeholder="WhatsApp number"
                      invalid={invalidFields.includes(
                        "aiNumber"
                      )}
                      onCountryChange={(
                        country
                      ) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            aiCountry:
                              country.id,
                            aiCode:
                              country.code,
                          })
                        )
                      }
                      onNumberChange={(
                        number
                      ) =>
                        setField(
                          "aiNumber",
                          number
                        )
                      }
                    />
                  </Field>
                </div>

                {/* ============================================================
                    WORKING DAYS
                    ============================================================ */}

                <Field
                  label="Working days"
                  required
                  error={invalidFields.includes(
                    "workingDays"
                  )}
                >
                  <div
                    className="relative"
                    ref={daysRef}
                  >
                    <button
                      type="button"
                      className={`premiumInput flex items-center justify-between text-left ${
                        invalidFields.includes(
                          "workingDays"
                        )
                          ? "inputError"
                          : ""
                      }`}
                      onClick={() =>
                        setShowDaysDropdown(
                          (current) =>
                            !current
                        )
                      }
                    >
                      <span className="truncate">
                        {displaySelectedDays()}
                      </span>

                      <span className="text-white/35">
                        ⌄
                      </span>
                    </button>

                    {showDaysDropdown && (
                      <MultiDropdown>
                        {workingDaysList.map(
                          (day) => (
                            <label
                              key={day}
                              className="dropdownItem"
                            >
                              <input
                                type="checkbox"
                                checked={form.workingDays.includes(
                                  day
                                )}
                                onChange={() =>
                                  toggleWorkingDay(
                                    day
                                  )
                                }
                              />

                              <span>
                                {day}
                              </span>
                            </label>
                          )
                        )}

                        <button
                          type="button"
                          className="daysDone"
                          onClick={() =>
                            setShowDaysDropdown(
                              false
                            )
                          }
                        >
                          Done
                        </button>
                      </MultiDropdown>
                    )}
                  </div>
                </Field>

                {/* ============================================================
                    WORKING HOURS
                    ============================================================ */}

                <Field
                  label="Working hours"
                  required
                  error={invalidFields.includes(
                    "hours"
                  )}
                >
                  {form.hours ===
                  "Custom hours" ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="premiumInput"
                        placeholder="e.g. 8:00 AM - 6:00 PM"
                        value={
                          form.customHours
                        }
                        onChange={(event) =>
                          setField(
                            "customHours",
                            event.target.value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="customSmallButton"
                        onClick={() =>
                          setField(
                            "hours",
                            ""
                          )
                        }
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <select
                      className="premiumInput"
                      value={
                        form.hours
                      }
                      onChange={(event) =>
                        setField(
                          "hours",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Choose working hours
                      </option>

                      <option value="24 Hours">
                        24 Hours
                      </option>

                      <option value="8 AM - 4 PM">
                        8 AM - 4 PM
                      </option>

                      <option value="9 AM - 5 PM">
                        9 AM - 5 PM
                      </option>

                      <option value="9 AM - 6 PM">
                        9 AM - 6 PM
                      </option>

                      <option value="10 AM - 7 PM">
                        10 AM - 7 PM
                      </option>

                      <option value="Custom hours">
                        Type custom working hours
                      </option>
                    </select>
                  )}
                </Field>

                {/* ============================================================
                    PRICE RANGE
                    ============================================================ */}

                <Field
                  label="Price range"
                  required
                  error={invalidFields.includes(
                    "priceRange"
                  )}
                >
                  {form.priceRange ===
                  "Custom pricing" ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="premiumInput"
                        placeholder="e.g. AED 250 - AED 1,500"
                        value={
                          form.customPrice
                        }
                        onChange={(event) =>
                          setField(
                            "customPrice",
                            event.target.value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="customSmallButton"
                        onClick={() =>
                          setField(
                            "priceRange",
                            ""
                          )
                        }
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <select
                      className="premiumInput"
                      value={
                        form.priceRange
                      }
                      onChange={(event) =>
                        setField(
                          "priceRange",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Choose price range
                      </option>

                      {priceRanges.map(
                        (range) => (
                          <option
                            key={range}
                            value={range}
                          >
                            {range}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </Field>

                {/* ============================================================
                    BUSINESS DESCRIPTION
                    LAST FIELD
                    ============================================================ */}

                <div className="md:col-span-2">
                  <Field
                    label="What does your business do?"
                    required
                    hint={`${form.serviceDescription.length}/${MAX_DESCRIPTION_CHARACTERS} characters · ${countWords(form.serviceDescription)}/${MIN_DESCRIPTION_WORDS} words minimum`}
                    error={invalidFields.includes(
                      "serviceDescription"
                    )}
                  >
                    <textarea
                      className="premiumInput resize-none !min-h-[130px] !py-4"
                      placeholder="Briefly describe your products, services, packages, what customers can buy or book, and anything Sodah should understand about your business."
                      maxLength={MAX_DESCRIPTION_CHARACTERS}
                      aria-invalid={invalidFields.includes("serviceDescription")}
                      aria-describedby="business-description-guidance"
                      value={
                        form.serviceDescription
                      }
                      onChange={(event) =>
                        setField(
                          "serviceDescription",
                          event.target.value
                        )
                      }
                    />
                    <p
                      id="business-description-guidance"
                      className={`mt-2 text-[10px] leading-5 ${
                        invalidFields.includes("serviceDescription")
                          ? "text-red-300"
                          : "text-white/35"
                      }`}
                    >
                      Include at least 20 words about your products, services, packages, and what customers can buy or book. Maximum 500 characters.
                    </p>
                  </Field>
                </div>
              </div>

              {/* =================================================================
                  SUBMIT
                  ================================================================= */}

              <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={
                    handleSubmit
                  }
                  disabled={
                    loading ||
                    checkingAccount
                  }
                  className="h-[52px] w-full rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 px-7 text-sm font-black text-white shadow-[0_14px_35px_rgba(34,197,94,0.18)] transition hover:from-emerald-300 hover:to-green-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="loader" />
                      Saving...
                    </span>
                  ) : (
                    "Continue →"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          ERROR MESSAGE
          ====================================================================== */}

      {error && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/25 px-5" role="alertdialog" aria-modal="true" aria-live="assertive">
          <div className="max-w-xl rounded-2xl border border-red-400/30 bg-[#111827] px-5 py-4 text-center text-sm font-semibold text-red-300 shadow-2xl backdrop-blur-xl">
            {error}
          </div>
        </div>
      )}

      {/* ======================================================================
          PAGE STYLES
          ====================================================================== */}

      <style jsx>{`
        .premiumInput {
          width: 100%;
          min-height: 50px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.09);
          background: rgba(
            255,
            255,
            255,
            0.035
          );
          color: white;
          outline: none;
          font-size: 13px;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        textarea.premiumInput {
          min-height: 130px;
        }

        .premiumInput::placeholder {
          color: rgba(
            255,
            255,
            255,
            0.25
          );
        }

        .premiumInput:hover {
          border-color: rgba(
            255,
            255,
            255,
            0.15
          );
        }

        .premiumInput:focus {
          border-color: rgba(
            52,
            211,
            153,
            0.62
          );

          background: rgba(
            255,
            255,
            255,
            0.045
          );

          box-shadow:
            0 0 0 3px
            rgba(
              52,
              211,
              153,
              0.07
            );
        }

        select.premiumInput option {
          background: #111827;
          color: white;
        }

        .inputError {
          border-color: rgba(
            239,
            68,
            68,
            0.85
          ) !important;

          box-shadow:
            0 0 0 3px
            rgba(
              239,
              68,
              68,
              0.07
            );
        }

        .customSmallButton {
          min-width: 72px;
          border-radius: 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.09);
          background: rgba(
            255,
            255,
            255,
            0.045
          );
          color: rgba(
            255,
            255,
            255,
            0.7
          );
          font-size: 11px;
          font-weight: 800;
          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        .customSmallButton:hover {
          background: rgba(
            255,
            255,
            255,
            0.08
          );
          color: white;
        }

        .dropdownBox {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          max-height: 280px;
          overflow-y: auto;
          padding: 7px;
          border-radius: 14px;
          background: #111827;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          box-shadow:
            0 20px 50px
            rgba(0, 0, 0, 0.45);
          z-index: 100;
        }

        .dropdownItem {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 10px;
          border-radius: 9px;
          color: rgba(
            255,
            255,
            255,
            0.78
          );
          font-size: 12px;
          cursor: pointer;
        }

        .dropdownItem:hover {
          background: rgba(
            255,
            255,
            255,
            0.06
          );
        }

        .dropdownItem input {
          width: 14px;
          height: 14px;
          accent-color: #22c55e;
        }

        .daysDone {
          width: 100%;
          margin-top: 5px;
          padding: 9px;
          border-radius: 9px;
          background: rgba(
            34,
            197,
            94,
            0.12
          );
          color: #86efac;
          font-size: 11px;
          font-weight: 800;
        }

        .loader {
          width: 15px;
          height: 15px;
          border-radius: 999px;
          border: 2px solid
            rgba(255, 255, 255, 0.3);
          border-top-color: white;
          animation:
            spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }

          20% {
            transform: translateX(-5px);
          }

          40% {
            transform: translateX(5px);
          }

          60% {
            transform: translateX(-3px);
          }

          80% {
            transform: translateX(3px);
          }
        }

        .shake {
          animation: shake 0.4s ease;
        }

        @media (max-width: 640px) {
          .premiumInput {
            min-height: 48px;
          }

          .customSmallButton {
            min-width: 66px;
          }
        }
      `}</style>
    </main>
  );
}

/* ==========================================================================
   FIELD
   ========================================================================== */

function Field({
  label,
  children,
  required = false,
  hint = "",
  error = false,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-xs font-bold text-white/65">
          {label}

          {required && (
            <span className="ml-1 text-emerald-400">
              *
            </span>
          )}
        </label>

        {hint && (
          <span className="text-right text-[10px] text-white/30">
            {hint}
          </span>
        )}
      </div>

      <div
        className={
          error
            ? "inputError"
            : ""
        }
      >
        {children}
      </div>
    </div>
  );
}

/* ==========================================================================
   MULTI SELECT DROPDOWN
   ========================================================================== */

function MultiDropdown({
  children,
}) {
  return (
    <div className="dropdownBox">
      {children}
    </div>
  );
}

/* ==========================================================================
   PHONE INPUT
   ========================================================================== */

function PhoneInput({
  countries,
  valueCountry,
  valueCode,
  valueNumber,
  placeholder,
  onCountryChange,
  onNumberChange,
  invalid = false,
}) {
  const selectedCountry =
    countries.find(
      (country) =>
        country.id ===
        valueCountry
    ) ||
    countries.find(
      (country) =>
        country.code ===
        valueCode
    ) ||
    countries.find(
      (country) =>
        country.id === "AE"
    );

  const selectedId =
    selectedCountry?.id ||
    "AE";

  const handleCountryChange = (
    event
  ) => {
    const country =
      countries.find(
        (item) =>
          item.id ===
          event.target.value
      );

    if (country) {
      onCountryChange(
        country
      );
    }
  };

  const handleNumberChange = (
    event
  ) => {
    onNumberChange(
      event.target.value.replace(
        /\D/g,
        ""
      )
    );
  };

  return (
    <div className="flex w-full gap-2">
      <select
        value={selectedId}
        onChange={
          handleCountryChange
        }
        className={`h-[50px] w-[125px] rounded-xl border bg-white/[0.035] px-2 text-xs font-medium text-white outline-none sm:w-[160px] ${
          invalid
            ? "border-red-500"
            : "border-white/10"
        }`}
        aria-label="Country code"
      >
        {countries.map(
          (country) => (
            <option
              key={country.id}
              value={country.id}
              className="bg-[#111827] text-white"
            >
              {country.flag}{" "}
              {country.code}{" "}
              {country.name}
            </option>
          )
        )}
      </select>

      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={
          valueNumber || ""
        }
        placeholder={
          placeholder
        }
        className={`h-[50px] flex-1 rounded-xl border bg-white/[0.035] px-4 text-white outline-none transition ${
          invalid
            ? "border-red-500"
            : "border-white/10 focus:border-emerald-400/60"
        }`}
        onChange={
          handleNumberChange
        }
      />
    </div>
  );
}