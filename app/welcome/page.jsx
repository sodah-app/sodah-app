"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* -------------------------------------------------------------------------- */
/* COUNTRY LIST                                                               */
/* -------------------------------------------------------------------------- */

const countries = [
  { code: "+93", flag: "🇦🇫", name: "Afghanistan" },
  { code: "+355", flag: "🇦🇱", name: "Albania" },
  { code: "+213", flag: "🇩🇿", name: "Algeria" },
  { code: "+376", flag: "🇦🇩", name: "Andorra" },
  { code: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+374", flag: "🇦🇲", name: "Armenia" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+994", flag: "🇦🇿", name: "Azerbaijan" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+375", flag: "🇧🇾", name: "Belarus" },
  { code: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "+229", flag: "🇧🇯", name: "Benin" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+387", flag: "🇧🇦", name: "Bosnia and Herzegovina" },
  { code: "+267", flag: "🇧🇼", name: "Botswana" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "+855", flag: "🇰🇭", name: "Cambodia" },
  { code: "+237", flag: "🇨🇲", name: "Cameroon" },
  { code: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "+238", flag: "🇨🇻", name: "Cape Verde" },
  { code: "+236", flag: "🇨🇫", name: "Central African Republic" },
  { code: "+235", flag: "🇹🇩", name: "Chad" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+269", flag: "🇰🇲", name: "Comoros" },
  { code: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "+243", flag: "🇨🇩", name: "Congo (DRC)" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "+53", flag: "🇨🇺", name: "Cuba" },
  { code: "+357", flag: "🇨🇾", name: "Cyprus" },
  { code: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "+253", flag: "🇩🇯", name: "Djibouti" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+372", flag: "🇪🇪", name: "Estonia" },
  { code: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+30", flag: "🇬🇷", name: "Greece" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "+354", flag: "🇮🇸", name: "Iceland" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+98", flag: "🇮🇷", name: "Iran" },
  { code: "+964", flag: "🇮🇶", name: "Iraq" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+961", flag: "🇱🇧", name: "Lebanon" },
  { code: "+218", flag: "🇱🇾", name: "Libya" },
  { code: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+356", flag: "🇲🇹", name: "Malta" },
  { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+507", flag: "🇵🇦", name: "Panama" },
  { code: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+221", flag: "🇸🇳", name: "Senegal" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+963", flag: "🇸🇾", name: "Syria" },
  { code: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "+216", flag: "🇹🇳", name: "Tunisia" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+380", flag: "🇺🇦", name: "Ukraine" },
  { code: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "+967", flag: "🇾🇪", name: "Yemen" },
  { code: "+260", flag: "🇿🇲", name: "Zambia" },
  { code: "+263", flag: "🇿🇼", name: "Zimbabwe" }
];

/* -------------------------------------------------------------------------- */
/* OPTIONS                                                                    */
/* -------------------------------------------------------------------------- */

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
  "Consulting"
];

const personalUseOptions = [
  "Appointment Booking",
  "Receive Unknown Messages",
  "Auto Reply",
  "Reminder Messages",
  "Personal Assistant",
  "Follow-up Messages",
  "Task Notifications",
  "Event Reminders"
];

const priceRanges = [
  "$1 - $50",
  "$50 - $100",
  "$100 - $500",
  "$500 - $1,000",
  "$1,000 - $5,000",
  "$5,000+",
  "Custom Pricing"
];

const workingDaysList = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const capabilityList = [
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
  "Sales Automation"
];

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AutomationPage() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);

  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [showCapabilitiesDropdown, setShowCapabilitiesDropdown] =
    useState(false);

  const daysRef = useRef(null);
  const capabilitiesRef = useRef(null);

  /* ---------------------------------------------------------------------- */
  /* FORM                                                                    */
  /* ---------------------------------------------------------------------- */

  const [form, setForm] = useState({
    setupType: "business",

    fullName: "",
    personalGoal: "",

    businessName: "",
    industry: "",
    email: "",
    location: "",
    priceRange: "",
    customPrice: "",
    serviceDescription: "",

    aiCode: "+971",
    aiNumber: "",

    supportCode: "+971",
    supportNumber: "",

    workingDays: [],
    hours: "",
    customHours: "",

    capabilities: []
  });

  /* ---------------------------------------------------------------------- */
  /* THEME                                                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "dark") {
        setDarkMode(true);
      }
    } catch (err) {
      console.warn("Could not load theme:", err);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* LOAD AUTHENTICATED USER                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Authentication error:", authError);
        }

        if (!user) {
          router.push("/login");
          return;
        }

        const metadata = user.user_metadata || {};

        const name =
          metadata.full_name ||
          metadata.name ||
          metadata.display_name ||
          metadata.user_name ||
          user.email?.split("@")[0] ||
          "there";

        const email = user.email || "";

        setUserName(name);
        setUserEmail(email);

        setForm((prev) => ({
          ...prev,
          fullName: name,
          email
        }));
      } catch (err) {
        console.error(
          "Failed to load authenticated user:",
          err
        );
      }
    };

    loadUser();
  }, [router]);

  /* ---------------------------------------------------------------------- */
  /* CLOSE DROPDOWNS                                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        daysRef.current &&
        !daysRef.current.contains(e.target)
      ) {
        setShowDaysDropdown(false);
      }

      if (
        capabilitiesRef.current &&
        !capabilitiesRef.current.contains(e.target)
      ) {
        setShowCapabilitiesDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* MULTI SELECT                                                            */
  /* ---------------------------------------------------------------------- */

  const toggleSelection = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value]
    }));
  };

  const displaySelected = (items, placeholder) => {
    if (!items || !items.length) {
      return placeholder;
    }

    return items.join(", ");
  };

  /* ---------------------------------------------------------------------- */
  /* ALREADY HAVE AN ACCOUNT                                                 */
  /* ---------------------------------------------------------------------- */

  const handleAlreadyHaveAccount = async () => {
    if (checkingAccount || loading) {
      return;
    }

    setCheckingAccount(true);
    setError("");

    try {
      /* ------------------------------------------------------------------ */
      /* GET CURRENT AUTH USER                                               */
      /* ------------------------------------------------------------------ */

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        alert(
          "Please log in first. We could not find your account."
        );

        router.push("/login");
        return;
      }

      let business = null;

      /* ------------------------------------------------------------------ */
      /* FIRST CHECK: USER ID                                               */
      /* ------------------------------------------------------------------ */

      const {
        data: businessesByUserId,
        error: userIdError
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (userIdError) {
        console.error(
          "Business user_id lookup failed:",
          userIdError
        );
      } else if (
        businessesByUserId &&
        businessesByUserId.length > 0
      ) {
        business = businessesByUserId[0];
      }

      /* ------------------------------------------------------------------ */
      /* SECOND CHECK: EMAIL                                                */
      /* ------------------------------------------------------------------ */

      if (!business && user.email) {
        const {
          data: businessesByEmail,
          error: emailError
        } = await supabase
          .from("businesses")
          .select("id")
          .eq("email", user.email)
          .limit(1);

        if (emailError) {
          console.error(
            "Business email lookup failed:",
            emailError
          );
        } else if (
          businessesByEmail &&
          businessesByEmail.length > 0
        ) {
          business = businessesByEmail[0];
        }
      }

      /* ------------------------------------------------------------------ */
      /* EXISTING ACCOUNT FOUND                                             */
      /* ------------------------------------------------------------------ */

      if (business?.id) {
        localStorage.setItem(
          "business_id",
          business.id
        );

        router.push(
          `/channels?businessId=${encodeURIComponent(
            business.id
          )}`
        );

        return;
      }

      /* ------------------------------------------------------------------ */
      /* NO BUSINESS FOUND                                                   */
      /* ------------------------------------------------------------------ */

      alert(
        "We couldn't find an existing business account for this login. Please tell us about your business and continue with the setup below."
      );
    } catch (err) {
      console.error(
        "Failed to check existing business account:",
        err
      );

      alert(
        "We couldn't check your existing account right now. Please try again."
      );
    } finally {
      setCheckingAccount(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* SUBMIT                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleSubmit = async () => {
    setError("");
    setInvalidFields([]);

    const invalid = [];

    if (form.setupType === "business") {
      if (!form.businessName.trim()) {
        invalid.push("businessName");
      }

      if (!form.industry) {
        invalid.push("industry");
      }
    }

    if (form.setupType === "personal") {
      if (!form.fullName.trim()) {
        invalid.push("fullName");
      }

      if (!form.personalGoal) {
        invalid.push("personalGoal");
      }
    }

    if (!form.aiNumber.trim()) {
      invalid.push("aiNumber");
    }

    if (invalid.length > 0) {
      setInvalidFields(invalid);
      setError("Please complete the required fields.");

      setShake(true);

      setTimeout(() => {
        setShake(false);
      }, 400);

      setTimeout(() => {
        setError("");
        setInvalidFields([]);
      }, 3000);

      return;
    }

    if (loading || checkingAccount) {
      return;
    }

    setLoading(true);

    try {
      /* ------------------------------------------------------------------ */
      /* GET AUTHENTICATED USER                                              */
      /* ------------------------------------------------------------------ */

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      /* ------------------------------------------------------------------ */
      /* BUILD PAYLOAD                                                       */
      /* ------------------------------------------------------------------ */

      const apiPayload = {
        userId: user.id,

        setupType: form.setupType,

        /* Personal */
        fullName: form.fullName || userName || "",
        personalGoal: form.personalGoal || "",

        /* Business */
        businessName:
          form.setupType === "business"
            ? form.businessName.trim()
            : form.fullName.trim(),

        industry:
          form.setupType === "business"
            ? form.industry
            : "Personal Use",

        email: form.email || user.email || "",
        location: form.location || "",

        priceRange:
          form.priceRange === "Custom Pricing"
            ? form.customPrice
            : form.priceRange,

        serviceDescription:
          form.serviceDescription || "",

        /* Numbers */
        aiNumber: `${form.aiCode}${form.aiNumber}`,

        supportNumber: form.supportNumber
          ? `${form.supportCode}${form.supportNumber}`
          : `${form.aiCode}${form.aiNumber}`,

        /* Schedule */
        workingDays: Array.isArray(form.workingDays)
          ? form.workingDays.join(", ")
          : "",

        hours:
          form.hours === "Custom Hours"
            ? form.customHours
            : form.hours,

        /* Capabilities */
        capabilities: Array.isArray(form.capabilities)
          ? form.capabilities.join(", ")
          : ""
      };

      console.log(
        "Saving automation setup:",
        apiPayload
      );

      /* ------------------------------------------------------------------ */
      /* SAVE THROUGH INTERNAL API                                          */
      /* ------------------------------------------------------------------ */

      const apiRes = await fetch(
        "/api/business/automation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(apiPayload)
        }
      );

      let apiData = {};

      try {
        apiData = await apiRes.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!apiRes.ok || !apiData.success) {
        throw new Error(
          apiData.message ||
            "Failed to save your business setup."
        );
      }

      /* ------------------------------------------------------------------ */
      /* GET BUSINESS ID                                                     */
      /* ------------------------------------------------------------------ */

      const businessId = apiData.business_id;

      if (!businessId) {
        throw new Error(
          "Setup was saved, but no business ID was returned."
        );
      }

      /* ------------------------------------------------------------------ */
      /* SAVE BUSINESS ID LOCALLY                                            */
      /* ------------------------------------------------------------------ */

      localStorage.setItem(
        "business_id",
        businessId
      );

      console.log(
        "Business ID saved:",
        businessId
      );

      /* ------------------------------------------------------------------ */
      /* SEND TO N8N                                                         */
      /* ------------------------------------------------------------------ */

      const webhookPayload = {
        businessId,

        setupType: apiPayload.setupType,

        fullName: apiPayload.fullName,
        personalGoal: apiPayload.personalGoal,

        businessName: apiPayload.businessName,
        industry: apiPayload.industry,

        email: apiPayload.email,
        location: apiPayload.location,

        priceRange: apiPayload.priceRange,
        serviceDescription:
          apiPayload.serviceDescription,

        aiNumber: apiPayload.aiNumber,
        supportNumber: apiPayload.supportNumber,

        workingDays: apiPayload.workingDays,
        hours: apiPayload.hours,

        capability: apiPayload.capabilities
      };

      /* ------------------------------------------------------------------ */
      /* N8N IS SUPPLEMENTARY                                               */
      /* ------------------------------------------------------------------ */

      try {
        await fetch(
          "https://solomon-n8n.duckdns.org/webhook/setup-ai",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(webhookPayload)
          }
        );
      } catch (webhookError) {
        console.warn(
          "n8n setup webhook failed. Continuing anyway:",
          webhookError
        );
      }

      /* ------------------------------------------------------------------ */
      /* SUCCESS                                                             */
      /* ------------------------------------------------------------------ */

      setError("Setup saved successfully.");

      router.push(
        `/channels?businessId=${encodeURIComponent(
          businessId
        )}`
      );
    } catch (err) {
      console.error(
        "Submission failed:",
        err
      );

      setError(
        err?.message ||
          "Failed to save your setup. Please try again."
      );

      setShake(true);

      setTimeout(() => {
        setShake(false);
      }, 400);

      setTimeout(() => {
        setError("");
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <main
      className={`min-h-screen w-full ${
        darkMode ? "dark" : ""
      } bg-[#020617] text-white overflow-x-hidden`}
    >
      {/* PREMIUM BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[120px]" />

        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="absolute bottom-[-200px] left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      {/* TOP BRAND */}
      <header className="relative z-10 w-full px-6 sm:px-10 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/welcome")}
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

      {/* MAIN CONTENT */}
      <section className="relative z-10 px-4 sm:px-6 pb-10">
        <div
          className={`max-w-5xl mx-auto transition-all duration-300 ${
            shake ? "shake" : ""
          }`}
        >
          {/* GREETING */}
          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-white/55 text-sm sm:text-base mb-2">
              Hello {userName || "there"} 👋
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

          {/* MAIN CARD */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            {/* CARD TOP GLOW */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/70 to-transparent" />

            <div className="p-5 sm:p-8 md:p-10">
              {/* SETUP TYPE */}
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
                      setForm((prev) => ({
                        ...prev,
                        setupType: "business"
                      }))
                    }
                    className={`group relative h-[58px] rounded-2xl border transition-all duration-200 ${
                      form.setupType === "business"
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

                    {form.setupType === "business" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* PERSONAL */}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        setupType: "personal"
                      }))
                    }
                    className={`group relative h-[58px] rounded-2xl border transition-all duration-200 ${
                      form.setupType === "personal"
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

                    {form.setupType === "personal" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white">
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* BUSINESS */}
              {form.setupType === "business" && (
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
                        value={form.businessName}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            businessName: e.target.value
                          })
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
                        value={form.industry}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            industry: e.target.value
                          })
                        }
                      >
                        <option value="">
                          Choose your industry
                        </option>

                        {industries.map((item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      label="Business email"
                      hint="Your login email is automatically added."
                    >
                      <input
                        className="premiumInput"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            email: e.target.value
                          })
                        }
                      />
                    </Field>

                    <Field label="Business location">
                      <input
                        className="premiumInput"
                        placeholder="e.g. Dubai, UAE"
                        value={form.location}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            location: e.target.value
                          })
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
                          value={form.customPrice}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              customPrice: e.target.value
                            })
                          }
                        />
                      ) : (
                        <select
                          className="premiumInput"
                          value={form.priceRange}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              priceRange: e.target.value
                            })
                          }
                        >
                          <option value="">
                            Choose price range
                          </option>

                          {priceRanges.map(
                            (item) => (
                              <option
                                key={item}
                                value={item}
                              >
                                {item}
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
                        maxLength={120}
                        value={
                          form.serviceDescription
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            serviceDescription:
                              e.target.value
                          })
                        }
                      />
                    </Field>
                  </div>

                  {/* CONTACT */}
                  <div className="mt-10">
                    <SectionTitle
                      number="02"
                      title="Contact details"
                      subtitle="Choose the WhatsApp numbers Sodah should work with."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field
                        label="AI WhatsApp number"
                        required
                        error={invalidFields.includes(
                          "aiNumber"
                        )}
                      >
                        <PhoneInput
                          countries={countries}
                          valueCode={form.aiCode}
                          valueNumber={form.aiNumber}
                          placeholder="WhatsApp number"
                          invalid={invalidFields.includes(
                            "aiNumber"
                          )}
                          onCodeChange={(code) =>
                            setForm({
                              ...form,
                              aiCode: code
                            })
                          }
                          onNumberChange={(number) =>
                            setForm({
                              ...form,
                              aiNumber: number
                            })
                          }
                        />
                      </Field>

                      <Field
                        label="Support number"
                        hint="Optional"
                      >
                        <PhoneInput
                          countries={countries}
                          valueCode={form.supportCode}
                          valueNumber={
                            form.supportNumber
                          }
                          placeholder="Support number"
                          onCodeChange={(code) =>
                            setForm({
                              ...form,
                              supportCode: code
                            })
                          }
                          onNumberChange={(number) =>
                            setForm({
                              ...form,
                              supportNumber: number
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  {/* SCHEDULE */}
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
                          ref={daysRef}
                        >
                          <button
                            type="button"
                            className="premiumInput text-left flex items-center justify-between"
                            onClick={() => {
                              setShowDaysDropdown(
                                !showDaysDropdown
                              );

                              setShowCapabilitiesDropdown(
                                false
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
                                        toggleSelection(
                                          "workingDays",
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
                            onChange={(e) =>
                              setForm({
                                ...form,
                                customHours:
                                  e.target.value
                              })
                            }
                          />
                        ) : (
                          <select
                            className="premiumInput"
                            value={form.hours}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                hours: e.target.value
                              })
                            }
                          >
                            <option value="">
                              Choose working hours
                            </option>

                            <option>
                              24 Hours
                            </option>

                            <option>
                              8 AM - 4 PM
                            </option>

                            <option>
                              9 AM - 5 PM
                            </option>

                            <option>
                              9 AM - 6 PM
                            </option>

                            <option>
                              10 AM - 7 PM
                            </option>

                            <option>
                              Custom Hours
                            </option>
                          </select>
                        )}
                      </Field>
                    </div>
                  </div>

                  {/* AI CAPABILITIES */}
                  <div className="mt-10">
                    <SectionTitle
                      number="04"
                      title="AI capabilities"
                      subtitle="Select what you want your automation to handle."
                    />

                    <div
                      className="relative"
                      ref={capabilitiesRef}
                    >
                      <button
                        type="button"
                        className="premiumInput text-left flex items-center justify-between"
                        onClick={() => {
                          setShowCapabilitiesDropdown(
                            !showCapabilitiesDropdown
                          );

                          setShowDaysDropdown(false);
                        }}
                      >
                        <span className="truncate">
                          {displaySelected(
                            form.capabilities,
                            "Choose AI capabilities"
                          )}
                        </span>

                        <span className="text-white/40">
                          ▾
                        </span>
                      </button>

                      {showCapabilitiesDropdown && (
                        <MultiDropdown>
                          {capabilityList.map(
                            (item) => (
                              <label
                                key={item}
                                className="dropdownItem"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.capabilities.includes(
                                    item
                                  )}
                                  onChange={() =>
                                    toggleSelection(
                                      "capabilities",
                                      item
                                    )
                                  }
                                />

                                <span>
                                  {item}
                                </span>
                              </label>
                            )
                          )}
                        </MultiDropdown>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* PERSONAL */}
              {form.setupType === "personal" && (
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
                        value={form.fullName}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            fullName: e.target.value
                          })
                        }
                      />
                    </Field>

                    <Field label="Email">
                      <input
                        className="premiumInput"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            email: e.target.value
                          })
                        }
                      />
                    </Field>

                    <Field
                      label="What would you like Sodah to do?"
                      required
                      error={invalidFields.includes(
                        "personalGoal"
                      )}
                    >
                      <select
                        className="premiumInput"
                        value={form.personalGoal}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            personalGoal:
                              e.target.value
                          })
                        }
                      >
                        <option value="">
                          Choose a goal
                        </option>

                        {personalUseOptions.map(
                          (item) => (
                            <option
                              key={item}
                              value={item}
                            >
                              {item}
                            </option>
                          )
                        )}
                      </select>
                    </Field>

                    <Field
                      label="WhatsApp number"
                      required
                      error={invalidFields.includes(
                        "aiNumber"
                      )}
                    >
                      <PhoneInput
                        countries={countries}
                        valueCode={form.aiCode}
                        valueNumber={form.aiNumber}
                        placeholder="WhatsApp number"
                        invalid={invalidFields.includes(
                          "aiNumber"
                        )}
                        onCodeChange={(code) =>
                          setForm({
                            ...form,
                            aiCode: code
                          })
                        }
                        onNumberChange={(number) =>
                          setForm({
                            ...form,
                            aiNumber: number
                          })
                        }
                      />
                    </Field>
                  </div>

                  <div className="mt-8">
                    <Field label="Personal automation capabilities">
                      <div
                        className="relative"
                        ref={capabilitiesRef}
                      >
                        <button
                          type="button"
                          className="premiumInput text-left flex items-center justify-between"
                          onClick={() => {
                            setShowCapabilitiesDropdown(
                              !showCapabilitiesDropdown
                            );

                            setShowDaysDropdown(false);
                          }}
                        >
                          <span className="truncate">
                            {displaySelected(
                              form.capabilities,
                              "Choose capabilities"
                            )}
                          </span>

                          <span className="text-white/40">
                            ▾
                          </span>
                        </button>

                        {showCapabilitiesDropdown && (
                          <MultiDropdown>
                            {personalUseOptions.map(
                              (item) => (
                                <label
                                  key={item}
                                  className="dropdownItem"
                                >
                                  <input
                                    type="checkbox"
                                    checked={form.capabilities.includes(
                                      item
                                    )}
                                    onChange={() =>
                                      toggleSelection(
                                        "capabilities",
                                        item
                                      )
                                    }
                                  />

                                  <span>
                                    {item}
                                  </span>
                                </label>
                              )
                            )}
                          </MultiDropdown>
                        )}
                      </div>
                    </Field>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------------- */}
              {/* FOOTER / ACTION BUTTONS                                         */}
              {/* ---------------------------------------------------------------- */}

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
                    {/* -------------------------------------------------------- */}
                    {/* ALREADY HAVE AN ACCOUNT                                  */}
                    {/* -------------------------------------------------------- */}

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

                    {/* -------------------------------------------------------- */}
                    {/* SAVE & CONTINUE                                          */}
                    {/* -------------------------------------------------------- */}

                    <button
                      type="button"
                      onClick={handleSubmit}
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

          {/* LOGIN EMAIL */}
          {userEmail && (
            <div className="text-center mt-5 text-xs text-white/30">
              Signed in as {userEmail}
            </div>
          )}
        </div>
      </section>

      {/* ERROR / SUCCESS */}
      {error && (
        <div className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center px-5">
          <div
            className={`px-6 py-4 rounded-2xl backdrop-blur-xl shadow-2xl border text-sm font-semibold ${
              error.includes("successfully")
                ? "bg-green-500/10 border-green-400/30 text-green-300"
                : "bg-red-500/10 border-red-400/30 text-red-300"
            }`}
          >
            {error}
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
        .premiumInput {
          width: 100%;
          height: 52px;
          padding: 0 15px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.045);
          color: white;
          outline: none;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .premiumInput::placeholder {
          color: rgba(255, 255, 255, 0.28);
        }

        .premiumInput:hover {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
        }

        .premiumInput:focus {
          border-color: rgba(34, 197, 94, 0.65);
          background: rgba(255, 255, 255, 0.07);
          box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.08);
        }

        select.premiumInput option {
          background: #111827;
          color: white;
        }

        .inputError {
          border-color: rgba(239, 68, 68, 0.9) !important;
          box-shadow:
            0 0 0 4px rgba(239, 68, 68, 0.08);
        }

        .dropdownBox {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 8px);
          max-height: 260px;
          overflow-y: auto;
          padding: 8px;
          border-radius: 16px;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 25px 60px rgba(0, 0, 0, 0.5);
          z-index: 100;
        }

        .dropdownItem {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 11px;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          cursor: pointer;
          transition:
            background 0.15s ease;
        }

        .dropdownItem:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .dropdownItem input {
          width: 15px;
          height: 15px;
          accent-color: #22c55e;
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }

          20% {
            transform: translateX(-6px);
          }

          40% {
            transform: translateX(6px);
          }

          60% {
            transform: translateX(-4px);
          }

          80% {
            transform: translateX(4px);
          }
        }

        .shake {
          animation: shake 0.4s ease;
        }

        .loader {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
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

/* -------------------------------------------------------------------------- */
/* SECTION TITLE                                                              */
/* -------------------------------------------------------------------------- */

function SectionTitle({
  number,
  title,
  subtitle
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

/* -------------------------------------------------------------------------- */
/* FIELD                                                                      */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
  required = false,
  hint = "",
  error = false
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

      <div className={error ? "inputError" : ""}>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MULTI DROPDOWN                                                             */
/* -------------------------------------------------------------------------- */

function MultiDropdown({ children }) {
  return (
    <div className="dropdownBox">
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PHONE INPUT                                                                */
/* -------------------------------------------------------------------------- */

function PhoneInput({
  countries,
  valueCode,
  valueNumber,
  placeholder,
  onCodeChange,
  onNumberChange,
  invalid = false
}) {
  return (
    <div className="flex gap-2 w-full">
      <select
        value={valueCode}
        onChange={(e) =>
          onCodeChange(e.target.value)
        }
        className={`w-[125px] sm:w-[150px] h-[52px] px-2 rounded-[14px] bg-white/[0.045] text-white text-xs font-medium outline-none border ${
          invalid
            ? "border-red-500"
            : "border-white/10"
        }`}
      >
        {countries.map((country, index) => (
          <option
            key={`${country.name}-${country.code}-${index}`}
            value={country.code}
            className="bg-[#111827] text-white"
          >
            {country.flag} {country.code}
          </option>
        ))}
      </select>

      <input
        type="tel"
        inputMode="numeric"
        value={valueNumber}
        placeholder={placeholder}
        className={`flex-1 h-[52px] px-4 rounded-[14px] bg-white/[0.045] text-white outline-none border transition ${
          invalid
            ? "border-red-500"
            : "border-white/10 focus:border-green-400/60"
        }`}
        onChange={(e) =>
          onNumberChange(
            e.target.value.replace(/\D/g, "")
          )
        }
      />
    </div>
  );
}