"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ==========================================================================
   SODAH AUTOMATION / ONBOARDING
   File:
     app/update.js

   IMPORTANT:
   - Existing onboarding tracking is preserved.
   - A new authenticated user is immediately recorded in sodah_onboarding.
   - Existing businesses are checked immediately.
   - Existing users are sent directly to /channels.
   - AI capabilities remain automatic and hidden from the user.
   - Canada and USA both use +1 correctly.
   - The phone selector uses a unique country ID instead of using the
     duplicated +1 value as the React select key/value.
   ========================================================================== */

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

  /*
   * IMPORTANT:
   * Canada and USA both use +1.
   *
   * They MUST have different IDs.
   * Never use the dial code itself as the React select identity.
   */
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

  /*
   * USA has the same +1 dial code as Canada.
   * Its unique ID is US.
   */
  { id: "US", code: "+1", flag: "🇺🇸", name: "United States" },

  { id: "UY", code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { id: "VE", code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { id: "VN", code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { id: "YE", code: "+967", flag: "🇾🇪", name: "Yemen" },
  { id: "ZM", code: "+260", flag: "🇿🇲", name: "Zambia" },
  { id: "ZW", code: "+263", flag: "🇿🇼", name: "Zimbabwe" },
];

/* ==========================================================================
   OPTIONS
   ========================================================================== */

const industries = [
  "Healthcare",
  "Dental Clinic",
  "Retail",
  "Real Estate",
  "E-commerce",
  "Education",
  "Legal Services",
  "Automotive",
  "Beauty Salon",
  "Fitness Gym",
  "Restaurant",
  "Travel Agency",
  "Insurance",
  "Construction",
  "Photography",
  "Hotel",
  "Cleaning Services",
  "Repair Services",
  "Consulting",
];

const priceRanges = [
  "$1 - $50",
  "$50 - $100",
  "$100 - $500",
  "$500 - $1,000",
  "$1,000 - $5,000",
  "$5,000+",
  "Custom Pricing",
];

const workingDaysList = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/*
 * These are intentionally NOT displayed to the user.
 *
 * Business automation capabilities are selected automatically.
 */
const BUSINESS_CAPABILITIES = [
  "Appointment Booking",
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

/*
 * Personal automation capabilities are also selected automatically.
 */
const PERSONAL_CAPABILITIES = [
  "Appointment Booking",
  "Receive Unknown Messages",
  "Auto Reply",
  "Reminder Messages",
  "Personal Assistant",
  "Follow-up Messages",
  "Task Notifications",
  "Event Reminders",
];

/* ==========================================================================
   HELPERS
   ========================================================================== */

function cleanPhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCountryId(value) {
  const id = String(value || "").trim().toUpperCase();

  if (countries.some((country) => country.id === id)) {
    return id;
  }

  return "AE";
}

function countryById(id) {
  return (
    countries.find(
      (country) => country.id === normalizeCountryId(id)
    ) || countries.find((country) => country.id === "AE")
  );
}

function formatInternationalNumber(countryId, number) {
  const country = countryById(countryId);

  const code = country?.code || "+971";
  const localNumber = cleanPhoneNumber(number);

  return `${code}${localNumber}`;
}

/*
 * NANP countries such as Canada and USA both use +1.
 *
 * We therefore validate the local number as a 10-digit number
 * when either CA or US is selected.
 */
function isValidPhoneNumber(countryId, number) {
  const clean = cleanPhoneNumber(number);

  const id = normalizeCountryId(countryId);

  if (id === "CA" || id === "US") {
    return clean.length === 10;
  }

  return clean.length >= 5;
}

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function AutomationPage() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [showDaysDropdown, setShowDaysDropdown] = useState(false);

  const daysRef = useRef(null);

  /* ------------------------------------------------------------------------
     FORM
     ------------------------------------------------------------------------ */

  const [form, setForm] = useState({
    setupType: "business",

    fullName: "",
    personalGoal: "Auto Reply",

    businessName: "",
    industry: "",
    email: "",
    location: "",
    priceRange: "",
    customPrice: "",
    serviceDescription: "",

    /*
     * Country ID is separate from dial code.
     *
     * This fixes Canada/USA because both have +1.
     */
    aiCountry: "AE",
    aiCode: "+971",
    aiNumber: "",

    /*
     * Support number remains available for business automation.
     *
     * If the user leaves it empty, the AI number becomes the support
     * number automatically.
     */
    supportCountry: "AE",
    supportCode: "+971",
    supportNumber: "",

    workingDays: [],
    hours: "",
    customHours: "",

    /*
     * Never displayed in the UI.
     * Automatically populated before submission.
     */
    capabilities: BUSINESS_CAPABILITIES,
  });

  /* ==========================================================================
     THEME
     ========================================================================== */

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "dark") {
        setDarkMode(true);
      }
    } catch (err) {
      console.warn(
        "[Sodah Update] Could not load theme:",
        err
      );
    }
  }, []);

  /* ==========================================================================
     INITIAL AUTHENTICATION + ONBOARDING + EXISTING BUSINESS CHECK
     ========================================================================== */

  useEffect(() => {
    let mounted = true;

    const initializePage = async () => {
      setInitializing(true);
      setCheckingAccount(true);

      try {
        /*
         * ---------------------------------------------------------------
         * 1. GET CURRENT SESSION
         * ---------------------------------------------------------------
         */

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
         * ---------------------------------------------------------------
         * 2. USER DETAILS
         * ---------------------------------------------------------------
         */

        const metadata = user.user_metadata || {};

        const name =
          metadata.full_name ||
          metadata.name ||
          metadata.display_name ||
          metadata.user_name ||
          user.email?.split("@")[0] ||
          "there";

        const email = user.email || "";

        if (!mounted) {
          return;
        }

        setUserName(name);
        setUserEmail(email);

        /*
         * Automatically populate login email.
         */
        setForm((previous) => ({
          ...previous,

          fullName:
            previous.fullName || name,

          email:
            previous.email || email,

          /*
           * Business capabilities are automatic.
           */
          capabilities: BUSINESS_CAPABILITIES,

          /*
           * Personal goal is automatic.
           */
          personalGoal: "Auto Reply",
        }));

        /*
         * ---------------------------------------------------------------
         * 3. IMMEDIATELY TRACK ONBOARDING
         * ---------------------------------------------------------------
         *
         * This MUST happen as soon as the authenticated user enters
         * the page.
         *
         * The existing /api/onboarding/track endpoint:
         *
         * - authenticates the user
         * - checks businesses
         * - creates/updates sodah_onboarding
         * - preserves followup_stage
         * - marks onboarding completed when a business already exists
         *
         * This keeps the existing onboarding lifecycle intact.
         */

        let onboardingData = null;

        try {
          const onboardingResponse = await fetch(
            "/api/onboarding/track",
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",

                Authorization: `Bearer ${session.access_token}`,
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

          if (!onboardingResponse.ok) {
            console.warn(
              "[Sodah Update] Onboarding tracking returned an error:",
              onboardingData?.error ||
                onboardingData?.message ||
                "Unknown error"
            );
          }
        } catch (onboardingError) {
          /*
           * Do not prevent the form from opening if onboarding tracking
           * has a temporary network problem.
           */
          console.warn(
            "[Sodah Update] Onboarding tracking failed:",
            onboardingError
          );
        }

        /*
         * ---------------------------------------------------------------
         * 4. EXISTING BUSINESS CHECK
         * ---------------------------------------------------------------
         *
         * We do an explicit businesses table check as well.
         *
         * This makes the page independent of whether the onboarding
         * endpoint returned the business ID.
         */

        let existingBusiness = null;

        /*
         * FIRST:
         * Search by authenticated Supabase user ID.
         */

        const {
          data: businessByUser,
          error: businessUserError,
        } = await supabase
          .from("businesses")
          .select(
            "id,business_id,user_id,business_name,whatsapp_connected"
          )
          .eq("user_id", user.id)
          .limit(1);

        if (businessUserError) {
          console.warn(
            "[Sodah Update] Business user lookup failed:",
            businessUserError
          );
        } else if (
          Array.isArray(businessByUser) &&
          businessByUser.length > 0
        ) {
          existingBusiness = businessByUser[0];
        }

        /*
         * SECOND:
         * Search by authenticated email if user_id lookup did not
         * return a business.
         *
         * The email comes from Supabase Auth, never from a browser
         * supplied arbitrary value.
         */

        if (!existingBusiness && user.email) {
          const {
            data: businessByEmail,
            error: businessEmailError,
          } = await supabase
            .from("businesses")
            .select(
              "id,business_id,user_id,business_name,whatsapp_connected"
            )
            .eq("email", user.email)
            .limit(1);

          if (businessEmailError) {
            console.warn(
              "[Sodah Update] Business email lookup failed:",
              businessEmailError
            );
          } else if (
            Array.isArray(businessByEmail) &&
            businessByEmail.length > 0
          ) {
            existingBusiness = businessByEmail[0];
          }
        }

        /*
         * ---------------------------------------------------------------
         * 5. ONBOARDING API CAN ALSO RETURN THE BUSINESS
         * ---------------------------------------------------------------
         */

        const onboardingBusinessId =
          onboardingData?.business_id || "";

        if (
          !existingBusiness &&
          onboardingData?.onboarding_completed &&
          onboardingBusinessId
        ) {
          existingBusiness = {
            business_id: onboardingBusinessId,
          };
        }

        /*
         * ---------------------------------------------------------------
         * 6. EXISTING BUSINESS FOUND
         * ---------------------------------------------------------------
         */

        if (
          existingBusiness?.business_id
        ) {
          const businessId =
            String(
              existingBusiness.business_id
            ).trim();

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
          } catch (storageError) {
            console.warn(
              "[Sodah Update] Local storage unavailable:",
              storageError
            );
          }

          /*
           * Existing account goes directly to Channels.
           *
           * No need for the user to fill the setup form again.
           */
          router.replace(
            `/channels?businessId=${encodeURIComponent(
              businessId
            )}`
          );

          return;
        }

        /*
         * ---------------------------------------------------------------
         * 7. NO BUSINESS
         * ---------------------------------------------------------------
         *
         * User remains on this page and can complete onboarding.
         */

        try {
          localStorage.removeItem(
            "business_id"
          );
        } catch {}

        if (mounted) {
          setCheckingAccount(false);
          setInitializing(false);
        }
      } catch (err) {
        console.error(
          "[Sodah Update] Initialization failed:",
          err
        );

        if (!mounted) {
          return;
        }

        /*
         * Only redirect when the authentication itself is missing.
         */
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
     CLOSE DROPDOWNS
     ========================================================================== */

  useEffect(() => {
    const handleClickOutside = (event) => {
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
     ALREADY HAVE AN ACCOUNT
     ========================================================================== */

  const handleAlreadyHaveAccount =
    async () => {
      if (
        checkingAccount ||
        loading
      ) {
        return;
      }

      setCheckingAccount(true);
      setError("");

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

        let business = null;

        /*
         * Check user ID first.
         */
        const {
          data: byUser,
          error: byUserError,
        } = await supabase
          .from("businesses")
          .select(
            "id,business_id,user_id,business_name,whatsapp_connected"
          )
          .eq("user_id", user.id)
          .limit(1);

        if (byUserError) {
          console.warn(
            "[Sodah Update] Existing account user lookup failed:",
            byUserError
          );
        } else if (
          Array.isArray(byUser) &&
          byUser.length > 0
        ) {
          business = byUser[0];
        }

        /*
         * Check email second.
         */
        if (!business && user.email) {
          const {
            data: byEmail,
            error: byEmailError,
          } = await supabase
            .from("businesses")
            .select(
              "id,business_id,user_id,business_name,whatsapp_connected"
            )
            .eq("email", user.email)
            .limit(1);

          if (byEmailError) {
            console.warn(
              "[Sodah Update] Existing account email lookup failed:",
              byEmailError
            );
          } else if (
            Array.isArray(byEmail) &&
            byEmail.length > 0
          ) {
            business = byEmail[0];
          }
        }

        if (business?.business_id) {
          const businessId =
            String(
              business.business_id
            ).trim();

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

          router.replace(
            `/channels?businessId=${encodeURIComponent(
              businessId
            )}`
          );

          return;
        }

        setError(
          "No existing business account was found. Please complete your setup below."
        );
      } catch (err) {
        console.error(
          "[Sodah Update] Existing account check failed:",
          err
        );

        setError(
          "We could not check your existing account right now. Please try again."
        );
      } finally {
        setCheckingAccount(false);
      }
    };

  /* ==========================================================================
     MULTI SELECT
     ========================================================================== */

  const toggleSelection = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,

      [field]:
        previous[field].includes(value)
          ? previous[field].filter(
              (item) => item !== value
            )
          : [
              ...previous[field],
              value,
            ],
    }));
  };

  const displaySelected = (
    items,
    placeholder
  ) => {
    if (
      !items ||
      !items.length
    ) {
      return placeholder;
    }

    return items.join(", ");
  };

  /* ==========================================================================
     SUBMIT
     ========================================================================== */

  const handleSubmit =
    async () => {
      setError("");
      setInvalidFields([]);

      const invalid = [];

      /*
       * Business validation.
       */
      if (
        form.setupType ===
        "business"
      ) {
        if (
          !form.businessName.trim()
        ) {
          invalid.push(
            "businessName"
          );
        }

        if (!form.industry) {
          invalid.push(
            "industry"
          );
        }
      }

      /*
       * Personal validation.
       */
      if (
        form.setupType ===
        "personal"
      ) {
        if (
          !form.fullName.trim()
        ) {
          invalid.push(
            "fullName"
          );
        }
      }

      /*
       * WhatsApp number is required in both modes.
       */
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

      /*
       * Business support number is optional.
       *
       * If supplied, validate it.
       */
      if (
        form.setupType ===
          "business" &&
        form.supportNumber.trim() &&
        !isValidPhoneNumber(
          form.supportCountry,
          form.supportNumber
        )
      ) {
        invalid.push(
          "supportNumber"
        );
      }

      if (invalid.length > 0) {
        setInvalidFields(
          invalid
        );

        if (
          invalid.includes(
            "aiNumber"
          )
        ) {
          const selectedCountry =
            countryById(
              form.aiCountry
            );

          if (
            selectedCountry?.id ===
              "CA" ||
            selectedCountry?.id ===
              "US"
          ) {
            setError(
              "Please enter a valid 10-digit Canada or USA WhatsApp number."
            );
          } else {
            setError(
              "Please enter a valid WhatsApp number."
            );
          }
        } else {
          setError(
            "Please complete the required fields."
          );
        }

        setShake(true);

        setTimeout(
          () => {
            setShake(false);
          },
          400
        );

        setTimeout(
          () => {
            setError("");
            setInvalidFields(
              []
            );
          },
          4000
        );

        return;
      }

      if (
        loading ||
        checkingAccount
      ) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        /*
         * ---------------------------------------------------------------
         * GET AUTHENTICATED USER
         * ---------------------------------------------------------------
         */

        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        /*
         * ---------------------------------------------------------------
         * AUTOMATIC CAPABILITIES
         * ---------------------------------------------------------------
         *
         * The user does not choose capabilities anymore.
         */

        const automaticCapabilities =
          form.setupType ===
          "business"
            ? BUSINESS_CAPABILITIES
            : PERSONAL_CAPABILITIES;

        /*
         * ---------------------------------------------------------------
         * AUTOMATIC PERSONAL GOAL
         * ---------------------------------------------------------------
         */

        const automaticPersonalGoal =
          form.setupType ===
          "personal"
            ? "Auto Reply"
            : "";

        /*
         * ---------------------------------------------------------------
         * NUMBERS
         * ---------------------------------------------------------------
         */

        const aiNumber =
          formatInternationalNumber(
            form.aiCountry,
            form.aiNumber
          );

        /*
         * Business support number:
         *
         * If user enters one, use it.
         *
         * If not, use the same WhatsApp number as the AI/support
         * number so the AI always has a support number.
         */
        const supportNumber =
          form.setupType ===
            "business" &&
          form.supportNumber.trim()
            ? formatInternationalNumber(
                form.supportCountry,
                form.supportNumber
              )
            : aiNumber;

        /*
         * ---------------------------------------------------------------
         * BUILD PAYLOAD
         * ---------------------------------------------------------------
         */

        const apiPayload = {
          userId: user.id,

          setupType:
            form.setupType,

          /*
           * Personal
           */
          fullName:
            form.fullName.trim() ||
            user.user_metadata
              ?.full_name ||
            user.email
              ?.split("@")[0] ||
            "",

          personalGoal:
            automaticPersonalGoal,

          /*
           * Business
           */
          businessName:
            form.setupType ===
            "business"
              ? form.businessName.trim()
              : form.fullName.trim(),

          industry:
            form.setupType ===
            "business"
              ? form.industry
              : "Personal Use",

          email:
            form.email.trim() ||
            user.email ||
            "",

          location:
            form.location.trim(),

          priceRange:
            form.priceRange ===
            "Custom Pricing"
              ? form.customPrice.trim()
              : form.priceRange,

          serviceDescription:
            form.serviceDescription.trim(),

          /*
           * Numbers
           */
          aiNumber,

          supportNumber,

          /*
           * Schedule
           */
          workingDays:
            Array.isArray(
              form.workingDays
            )
              ? form.workingDays.join(
                  ", "
                )
              : "",

          hours:
            form.hours ===
            "Custom Hours"
              ? form.customHours.trim()
              : form.hours,

          /*
           * Automatic AI capabilities.
           *
           * Never depend on what was in the browser state.
           */
          capabilities:
            automaticCapabilities.join(
              ", "
            ),
        };

        console.log(
          "[Sodah Update] Saving automation setup:",
          {
            ...apiPayload,
            aiNumber:
              aiNumber
                ? `${aiNumber.slice(
                    0,
                    -4
                  )}****`
                : "",
            supportNumber:
              supportNumber
                ? `${supportNumber.slice(
                    0,
                    -4
                  )}****`
                : "",
          }
        );

        /*
         * ---------------------------------------------------------------
         * SAVE BUSINESS THROUGH INTERNAL API
         * ---------------------------------------------------------------
         */

        const apiRes =
          await fetch(
            "/api/business/automation",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization: `Bearer ${
                  (
                    await supabase.auth.getSession()
                  )?.data?.session
                    ?.access_token || ""
                }`,
              },

              credentials:
                "include",

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

        /*
         * ---------------------------------------------------------------
         * API ERROR
         * ---------------------------------------------------------------
         */

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

            router.replace(
              `/channels?businessId=${encodeURIComponent(
                existingBusinessId
              )}`
            );

            return;
          }

          throw new Error(
            apiData.message ||
              "Failed to save your business setup."
          );
        }

        /*
         * ---------------------------------------------------------------
         * BUSINESS ID
         * ---------------------------------------------------------------
         */

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

        /*
         * ---------------------------------------------------------------
         * STORE BUSINESS CONTEXT
         * ---------------------------------------------------------------
         */

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

        /*
         * ---------------------------------------------------------------
         * WELCOME EMAIL
         * ---------------------------------------------------------------
         *
         * Preserved from the existing implementation.
         *
         * Failure here must never undo a successful business setup.
         */

        try {
          const emailResponse =
            await fetch(
              "/api/auth/welcome-email",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                credentials:
                  "include",

                body: JSON.stringify(
                  {
                    user_id:
                      user.id,

                    email:
                      user.email ||
                      apiPayload.email ||
                      "",

                    full_name:
                      apiPayload.fullName ||
                      userName ||
                      "",

                    business_name:
                      apiPayload.businessName ||
                      "",

                    business_id:
                      businessId,
                  }
                ),
              }
            );

          if (
            !emailResponse.ok
          ) {
            const emailData =
              await emailResponse
                .json()
                .catch(
                  () => ({})
                );

            console.warn(
              "[Sodah Update] Welcome email was not sent:",
              emailData?.error ||
                emailData?.message ||
                "Unknown error"
            );
          }
        } catch (
          emailError
        ) {
          console.warn(
            "[Sodah Update] Welcome email request failed:",
            emailError
          );
        }

        /*
         * ---------------------------------------------------------------
         * SUCCESS
         * ---------------------------------------------------------------
         */

        setError(
          "Setup saved successfully."
        );

        router.replace(
          `/channels?businessId=${encodeURIComponent(
            businessId
          )}`
        );
      } catch (err) {
        console.error(
          "[Sodah Update] Submission failed:",
          err
        );

        setError(
          err?.message ||
            "Failed to save your setup. Please try again."
        );

        setShake(true);

        setTimeout(
          () => {
            setShake(false);
          },
          400
        );

        setTimeout(
          () => {
            setError("");
          },
          5000
        );
      } finally {
        setLoading(false);
      }
    };

  /* ==========================================================================
     LOADING STATE
     ========================================================================== */

  if (initializing) {
    return (
      <main className="min-h-screen w-full bg-[#020617] text-white flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[120px]" />

          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

          <div className="absolute bottom-[-200px] left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
          <div className="loadingRing" />

          <h2 className="mt-6 text-lg font-semibold text-white">
            Preparing your Sodah workspace
          </h2>

          <p className="mt-2 text-sm text-white/45">
            Checking your account and setup...
          </p>
        </div>

        <style jsx>{`
          .loadingRing {
            width: 42px;
            height: 42px;
            border-radius: 999px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: rgba(
              74,
              222,
              128,
              0.95
            );
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <main
      className={`min-h-screen w-full ${
        darkMode ? "dark" : ""
      } bg-[#020617] text-white overflow-x-hidden`}
    >
      {/* =====================================================================
          PREMIUM BACKGROUND
          ===================================================================== */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[120px]" />

        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="absolute bottom-[-200px] left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      {/* =====================================================================
          HEADER
          ===================================================================== */}

      <header className="relative z-10 w-full px-6 sm:px-10 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/welcome"
              )
            }
            className="flex items-center gap-3 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                alt="WhatsApp"
                className="w-7 h-7"
              />
            </div>

            <div className="text-left">
              <div className="font-bold text-lg tracking-tight">
                sodah.io
              </div>

              <div className="text-xs text-white/45">
                WhatsApp Automation
              </div>
            </div>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-white/45">
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />

            Secure setup
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN
          ===================================================================== */}

      <section className="relative z-10 px-4 sm:px-6 pb-10">
        <div
          className={`max-w-5xl mx-auto transition-all duration-300 ${
            shake
              ? "shake"
              : ""
          }`}
        >
          {/* =================================================================
              GREETING
              ================================================================= */}

          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-white/55 text-sm sm:text-base mb-2">
              Hello{" "}
              {userName ||
                "there"}{" "}
              👋
            </p>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Tell us more about your business
            </h1>

            <p className="mt-3 text-white/50 text-sm sm:text-base max-w-2xl">
              Give us a few details so we can personalize
              your automation experience and get everything
              ready for you.
            </p>
          </div>

          {/* =================================================================
              MAIN CARD
              ================================================================= */}

          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/70 to-transparent" />

            <div className="p-5 sm:p-8 md:p-10">
              {/* =============================================================
                  SETUP TYPE
                  ============================================================= */}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      What are you setting up?
                    </p>

                    <p className="text-xs text-white/40 mt-1">
                      Choose the setup that fits your needs.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* BUSINESS */}

                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          setupType:
                            "business",

                          capabilities:
                            BUSINESS_CAPABILITIES,
                        })
                      )
                    }
                    className={`group relative h-[58px] rounded-2xl border transition-all duration-200 ${
                      form.setupType ===
                      "business"
                        ? "bg-green-500 border-green-400 shadow-[0_12px_30px_rgba(34,197,94,0.22)]"
                        : "bg-white/[0.035] border-white/10 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">
                        🏢
                      </span>

                      <span className="font-semibold text-sm">
                        Business
                      </span>
                    </div>

                    {form.setupType ===
                      "business" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* PERSONAL */}

                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          setupType:
                            "personal",

                          personalGoal:
                            "Auto Reply",

                          capabilities:
                            PERSONAL_CAPABILITIES,
                        })
                      )
                    }
                    className={`group relative h-[58px] rounded-2xl border transition-all duration-200 ${
                      form.setupType ===
                      "personal"
                        ? "bg-indigo-500 border-indigo-400 shadow-[0_12px_30px_rgba(99,102,241,0.22)]"
                        : "bg-white/[0.035] border-white/10 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">
                        👤
                      </span>

                      <span className="font-semibold text-sm">
                        Personal
                      </span>
                    </div>

                    {form.setupType ===
                      "personal" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white">
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* =============================================================
                  BUSINESS
                  ============================================================= */}

              {form.setupType ===
                "business" && (
                <>
                  <SectionTitle
                    number="01"
                    title="Business information"
                    subtitle="Tell us about the business you want to automate."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              businessName:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </Field>

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
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              industry:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      >
                        <option value="">
                          Choose your industry
                        </option>

                        {industries.map(
                          (
                            industry
                          ) => (
                            <option
                              key={
                                industry
                              }
                              value={
                                industry
                              }
                            >
                              {
                                industry
                              }
                            </option>
                          )
                        )}
                      </select>
                    </Field>

                    <Field
                      label="Business email"
                      hint="Your login email is automatically added."
                    >
                      <input
                        className="premiumInput"
                        type="email"
                        value={
                          form.email
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              email:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </Field>

                    <Field label="Business location">
                      <input
                        className="premiumInput"
                        placeholder="e.g. Dubai, UAE"
                        value={
                          form.location
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              location:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </Field>

                    <Field label="Price range">
                      {form.priceRange ===
                      "Custom Pricing" ? (
                        <input
                          type="text"
                          className="premiumInput"
                          placeholder="Enter your custom budget"
                          value={
                            form.customPrice
                          }
                          onChange={(
                            event
                          ) =>
                            setForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                customPrice:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                        />
                      ) : (
                        <select
                          className="premiumInput"
                          value={
                            form.priceRange
                          }
                          onChange={(
                            event
                          ) =>
                            setForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                priceRange:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                        >
                          <option value="">
                            Choose price range
                          </option>

                          {priceRanges.map(
                            (
                              range
                            ) => (
                              <option
                                key={
                                  range
                                }
                                value={
                                  range
                                }
                              >
                                {
                                  range
                                }
                              </option>
                            )
                          )}
                        </select>
                      )}
                    </Field>

                    <Field
                      label="What does your business do?"
                      hint={`${form.serviceDescription.length}/120`}
                    >
                      <textarea
                        className="premiumInput !h-[52px] !py-3 resize-none"
                        placeholder="Briefly describe your products or services..."
                        maxLength={
                          120
                        }
                        value={
                          form.serviceDescription
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              serviceDescription:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </Field>
                  </div>

                  {/* =========================================================
                      CONTACT
                      ========================================================= */}

                  <div className="mt-10">
                    <SectionTitle
                      number="02"
                      title="Contact details"
                      subtitle="Choose the WhatsApp numbers Sodah should work with."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                              (
                                previous
                              ) => ({
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
                            setForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                aiNumber:
                                  number,
                              })
                            )
                          }
                        />
                      </Field>

                      <Field
                        label="Support number"
                        hint="Optional — defaults to the business WhatsApp number"
                        error={invalidFields.includes(
                          "supportNumber"
                        )}
                      >
                        <PhoneInput
                          countries={
                            countries
                          }
                          valueCountry={
                            form.supportCountry
                          }
                          valueCode={
                            form.supportCode
                          }
                          valueNumber={
                            form.supportNumber
                          }
                          placeholder="Support number"
                          invalid={invalidFields.includes(
                            "supportNumber"
                          )}
                          onCountryChange={(
                            country
                          ) =>
                            setForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                supportCountry:
                                  country.id,

                                supportCode:
                                  country.code,
                              })
                            )
                          }
                          onNumberChange={(
                            number
                          ) =>
                            setForm(
                              (
                                previous
                              ) => ({
                                ...previous,

                                supportNumber:
                                  number,
                              })
                            )
                          }
                        />
                      </Field>
                    </div>

                    <div className="mt-4 rounded-2xl border border-green-400/10 bg-green-500/[0.035] px-4 py-3">
                      <p className="text-xs text-white/45 leading-relaxed">
                        Your business WhatsApp number will
                        be used by Sodah for automation and,
                        unless another support number is
                        provided, as the support number for
                        your AI.
                      </p>
                    </div>
                  </div>

                  {/* =========================================================
                      SCHEDULE
                      ========================================================= */}

                  <div className="mt-10">
                    <SectionTitle
                      number="03"
                      title="Business schedule"
                      subtitle="Tell the AI when your business is available."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="Working days">
                        <div
                          className="relative"
                          ref={
                            daysRef
                          }
                        >
                          <button
                            type="button"
                            className="premiumInput text-left flex items-center justify-between"
                            onClick={() => {
                              setShowDaysDropdown(
                                (
                                  current
                                ) =>
                                  !current
                              );
                            }}
                          >
                            <span className="truncate">
                              {displaySelected(
                                form.workingDays,
                                "Choose working days"
                              )}
                            </span>

                            <span className="text-white/40">
                              ▾
                            </span>
                          </button>

                          {showDaysDropdown && (
                            <MultiDropdown>
                              {workingDaysList.map(
                                (
                                  day
                                ) => (
                                  <label
                                    key={
                                      day
                                    }
                                    className="dropdownItem"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={form.workingDays.includes(
                                        day
                                      )}
                                      onChange={() =>
                                        toggleSelection(
                                          "workingDays",
                                          day
                                        )
                                      }
                                    />

                                    <span>
                                      {
                                        day
                                      }
                                    </span>
                                  </label>
                                )
                              )}
                            </MultiDropdown>
                          )}
                        </div>
                      </Field>

                      <Field label="Working hours">
                        {form.hours ===
                        "Custom Hours" ? (
                          <input
                            type="text"
                            className="premiumInput"
                            placeholder="e.g. 8 AM - 8 PM"
                            value={
                              form.customHours
                            }
                            onChange={(
                              event
                            ) =>
                              setForm(
                                (
                                  previous
                                ) => ({
                                  ...previous,

                                  customHours:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                          />
                        ) : (
                          <select
                            className="premiumInput"
                            value={
                              form.hours
                            }
                            onChange={(
                              event
                            ) =>
                              setForm(
                                (
                                  previous
                                ) => ({
                                  ...previous,

                                  hours:
                                    event
                                      .target
                                      .value,
                                })
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

                            <option value="Custom Hours">
                              Custom Hours
                            </option>
                          </select>
                        )}
                      </Field>
                    </div>
                  </div>

                  {/* =========================================================
                      AUTOMATION NOTICE
                      ========================================================= */}

                  <div className="mt-10">
                    <SectionTitle
                      number="04"
                      title="AI automation"
                      subtitle="Sodah automatically configures the AI capabilities for your business."
                    />

                    <div className="rounded-2xl border border-green-400/10 bg-green-500/[0.035] p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-400/20 flex items-center justify-center">
                          <span className="text-lg">
                            ✨
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-white">
                            Automatic AI configuration
                          </p>

                          <p className="text-xs text-white/45 leading-relaxed mt-1">
                            Sodah automatically enables the
                            appropriate automation capabilities
                            for your setup. You do not need to
                            manually select them.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* =============================================================
                  PERSONAL
                  ============================================================= */}

              {form.setupType ===
                "personal" && (
                <div>
                  <SectionTitle
                    number="01"
                    title="Personal automation"
                    subtitle="Set up Sodah for your personal WhatsApp workflow."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field
                      label="Your name"
                      required
                      error={invalidFields.includes(
                        "fullName"
                      )}
                    >
                      <input
                        className="premiumInput"
                        value={
                          form.fullName
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              fullName:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </Field>

                    <Field label="Email">
                      <input
                        className="premiumInput"
                        type="email"
                        value={
                          form.email
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              email:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </Field>

                    <Field
                      label="WhatsApp number"
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
                            (
                              previous
                            ) => ({
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
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              aiNumber:
                                number,
                            })
                          )
                        }
                      />
                    </Field>

                    <Field
                      label="Automation"
                      hint="Automatically configured"
                    >
                      <div className="premiumInput flex items-center">
                        <span className="inline-flex items-center gap-2 text-white/80 text-sm">
                          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
                          Auto Reply
                        </span>
                      </div>
                    </Field>
                  </div>

                  <div className="mt-8 rounded-2xl border border-indigo-400/10 bg-indigo-500/[0.035] p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center">
                        <span className="text-lg">
                          ✨
                        </span>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          Personal AI is configured automatically
                        </p>

                        <p className="text-xs text-white/45 leading-relaxed mt-1">
                          Sodah automatically enables the
                          personal automation capabilities needed
                          for your account. There is no additional
                          configuration required.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  FOOTER / ACTIONS
                  ============================================================= */}

              <div className="mt-10 pt-7 border-t border-white/10">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-white/80">
                      Almost there.
                    </p>

                    <p className="text-xs text-white/40 mt-1">
                      Your setup will be saved securely.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {/* =====================================================
                        ALREADY HAVE ACCOUNT
                        ===================================================== */}

                    <button
                      type="button"
                      onClick={
                        handleAlreadyHaveAccount
                      }
                      disabled={
                        checkingAccount ||
                        loading
                      }
                      className="w-full sm:w-auto min-w-[220px] h-[54px] px-7 rounded-2xl bg-white/[0.045] border border-white/10 text-white/80 font-semibold hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      {checkingAccount ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="loader" />
                          Checking...
                        </span>
                      ) : (
                        "Already have an account"
                      )}
                    </button>

                    {/* =====================================================
                        SAVE & CONTINUE
                        ===================================================== */}

                    <button
                      type="button"
                      onClick={
                        handleSubmit
                      }
                      disabled={
                        loading ||
                        checkingAccount
                      }
                      className="w-full sm:w-auto min-w-[220px] h-[54px] px-7 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-[0_15px_35px_rgba(34,197,94,0.22)] hover:from-green-400 hover:to-emerald-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="loader" />
                          Saving...
                        </span>
                      ) : (
                        "Save & Continue →"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===============================================================
              LOGIN EMAIL
              =============================================================== */}

          {userEmail && (
            <div className="text-center mt-5 text-xs text-white/30">
              Signed in as{" "}
              {userEmail}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          ERROR / SUCCESS MESSAGE
          ===================================================================== */}

      {error && (
        <div className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center px-5">
          <div
            className={`px-6 py-4 rounded-2xl backdrop-blur-xl shadow-2xl border text-sm font-semibold ${
              error.includes(
                "successfully"
              )
                ? "bg-green-500/10 border-green-400/30 text-green-300"
                : "bg-red-500/10 border-red-400/30 text-red-300"
            }`}
          >
            {error}
          </div>
        </div>
      )}

      {/* =====================================================================
          STYLES
          ===================================================================== */}

      <style jsx>{`
        .premiumInput {
          width: 100%;
          height: 52px;
          padding: 0 15px;
          border-radius: 14px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );
          background: rgba(
            255,
            255,
            255,
            0.045
          );
          color: white;
          outline: none;
          font-size: 14px;
          transition: all 0.2s
            ease;
        }

        .premiumInput::placeholder {
          color: rgba(
            255,
            255,
            255,
            0.28
          );
        }

        .premiumInput:hover {
          border-color: rgba(
            255,
            255,
            255,
            0.18
          );

          background: rgba(
            255,
            255,
            255,
            0.06
          );
        }

        .premiumInput:focus {
          border-color: rgba(
            34,
            197,
            94,
            0.65
          );

          background: rgba(
            255,
            255,
            255,
            0.07
          );

          box-shadow:
            0 0 0 4px
            rgba(
              34,
              197,
              94,
              0.08
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
            0.9
          ) !important;

          border-radius: 14px;

          box-shadow:
            0 0 0 4px
            rgba(
              239,
              68,
              68,
              0.08
            );
        }

        .dropdownBox {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(
            100% + 8px
          );

          max-height: 260px;

          overflow-y: auto;

          padding: 8px;

          border-radius: 16px;

          background: #111827;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );

          box-shadow:
            0 25px 60px
            rgba(
              0,
              0,
              0,
              0.5
            );

          z-index: 100;
        }

        .dropdownItem {
          display: flex;

          align-items: center;

          gap: 10px;

          padding: 10px 11px;

          border-radius: 10px;

          color: rgba(
            255,
            255,
            255,
            0.8
          );

          font-size: 13px;

          cursor: pointer;

          transition:
            background 0.15s
            ease;
        }

        .dropdownItem:hover {
          background: rgba(
            255,
            255,
            255,
            0.07
          );
        }

        .dropdownItem input {
          width: 15px;

          height: 15px;

          accent-color: #22c55e;
        }

        .loader {
          width: 16px;
          height: 16px;

          border-radius: 999px;

          border: 2px solid
            rgba(
              255,
              255,
              255,
              0.3
            );

          border-top-color: white;

          animation:
            spin 0.7s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(
              360deg
            );
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(
              0
            );
          }

          20% {
            transform: translateX(
              -6px
            );
          }

          40% {
            transform: translateX(
              6px
            );
          }

          60% {
            transform: translateX(
              -4px
            );
          }

          80% {
            transform: translateX(
              4px
            );
          }
        }

        .shake {
          animation:
            shake 0.4s ease;
        }

        @media (max-width: 640px) {
          .premiumInput {
            height: 50px;
          }
        }
      `}</style>
    </main>
  );
}

/* ==========================================================================
   SECTION TITLE
   ========================================================================== */

function SectionTitle({
  number,
  title,
  subtitle,
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-500/10 border border-green-400/20 text-green-400 text-xs font-bold">
          {number}
        </span>

        <h2 className="text-lg font-bold text-white">
          {title}
        </h2>
      </div>

      <p className="text-xs text-white/35 mt-2 ml-10">
        {subtitle}
      </p>
    </div>
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
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-white/65">
          {label}

          {required && (
            <span className="text-green-400 ml-1">
              *
            </span>
          )}
        </label>

        {hint && (
          <span className="text-[10px] text-white/30">
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
   MULTI DROPDOWN
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
  /*
   * The selected country is identified by its unique ID.
   *
   * This is the important Canada / USA fix:
   *
   * Canada:
   *   id = CA
   *   code = +1
   *
   * USA:
   *   id = US
   *   code = +1
   *
   * Therefore the browser never has to distinguish them by
   * the duplicated +1 value.
   */

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

  const handleCountryChange =
    (event) => {
      const id =
        event.target.value;

      const country =
        countries.find(
          (item) =>
            item.id === id
        );

      if (!country) {
        return;
      }

      onCountryChange(
        country
      );
    };

  const handleNumberChange =
    (event) => {
      /*
       * Only numeric characters are accepted.
       *
       * The country code is kept completely separate from
       * the local number.
       */
      const clean =
        event.target.value.replace(
          /\D/g,
          ""
        );

      onNumberChange(
        clean
      );
    };

  return (
    <div className="flex gap-2 w-full">
      <select
        value={selectedId}
        onChange={
          handleCountryChange
        }
        className={`w-[125px] sm:w-[150px] h-[52px] px-2 rounded-[14px] bg-white/[0.045] text-white text-xs font-medium outline-none border ${
          invalid
            ? "border-red-500"
            : "border-white/10"
        }`}
        aria-label="Country code"
      >
        {countries.map(
          (country) => (
            <option
              key={
                country.id
              }
              value={
                country.id
              }
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
        className={`flex-1 h-[52px] px-4 rounded-[14px] bg-white/[0.045] text-white outline-none border transition ${
          invalid
            ? "border-red-500"
            : "border-white/10 focus:border-green-400/60"
        }`}
        onChange={
          handleNumberChange
        }
      />
    </div>
  );
}