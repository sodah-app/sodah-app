"use client";
import ResponsiveContainer from "../../components/ui/ResponsiveContainer";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* COUNTRY LIST                                                                */
/* -------------------------------------------------------------------------- */
/*
  KEEP YOUR FULL COUNTRY ARRAY EXACTLY AS YOU ALREADY HAVE IT.
  Paste your complete countries array here.
*/
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

const hourOptions = [
  "24 Hours",
  "8 AM - 4 PM",
  "9 AM - 5 PM",
  "9 AM - 6 PM",
  "10 AM - 7 PM",
  "Custom Hours"
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

export default function AutomationPage() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* STATE                                                                   */
  /* ---------------------------------------------------------------------- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);

  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [showCapabilitiesDropdown, setShowCapabilitiesDropdown] =
    useState(false);

  const [activeStep, setActiveStep] = useState("business");

  const daysRef = useRef(null);
  const capabilitiesRef = useRef(null);

  /* ---------------------------------------------------------------------- */
  /* FORM STATE                                                              */
  /* ---------------------------------------------------------------------- */
  const [form, setForm] = useState({
    // SETUP TYPE
    setupType: "business", // "business" or "personal"

    // PERSONAL
    fullName: "",
    personalGoal: "",

    // BUSINESS
    businessName: "",
    industry: "",
    email: "",
    location: "",
    priceRange: "",
    customPrice: "",

    // PHONE NUMBERS
    aiCode: "+971",
    aiNumber: "",

    supportCode: "+971",
    supportNumber: "",

    // SCHEDULE
    workingDays: [],
    hours: "",

    // CAPABILITIES
    capabilities: []
  });

  /* ---------------------------------------------------------------------- */
  /* CLOSE DROPDOWNS WHEN CLICKING OUTSIDE                                   */
  /* ---------------------------------------------------------------------- */
 /* ---------------------------------------------------------------------- */
/* LOAD DARK MODE                                                         */
/* ---------------------------------------------------------------------- */
useEffect(() => {

  const savedTheme =
    localStorage.getItem("theme");

  if (savedTheme === "dark") {
    setDarkMode(true);
  }

}, []);
 useEffect(() => {
    const handleClickOutside = (e) => {
      if (daysRef.current && !daysRef.current.contains(e.target)) {
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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* SIDEBAR AUTO HIGHLIGHT                                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (form.setupType === "business") {
      if (
        !form.businessName ||
        !form.industry ||
        !form.email ||
        !form.location ||
        !form.priceRange
      ) {
        setActiveStep("business");
        return;
      }
    }

    if (form.setupType === "personal") {
      if (!form.fullName || !form.email || !form.personalGoal) {
        setActiveStep("business");
        return;
      }
    }

    if (!form.aiNumber) {
      setActiveStep("contact");
      return;
    }

    if (!form.workingDays.length || !form.hours) {
      setActiveStep("schedule");
      return;
    }

    if (!form.capabilities.length) {
      setActiveStep("capabilities");
      return;
    }

    setActiveStep("capabilities");
  }, [form]);

  /* ---------------------------------------------------------------------- */
  /* MULTI-SELECT HELPER                                                     */
  /* ---------------------------------------------------------------------- */
  const toggleSelection = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value]
    }));
  };

  /* ---------------------------------------------------------------------- */
  /* DISPLAY SELECTED ITEMS                                                  */
  /* ---------------------------------------------------------------------- */
  const displaySelected = (items, placeholder) => {
    if (!items || !items.length) return placeholder;
    return items.join(", ");
  };

  /* ---------------------------------------------------------------------- */
  /* SUBMIT                                                                  */
  /* ---------------------------------------------------------------------- */
 const handleSubmit = async () => {
  setError("");
  setInvalidFields([]);

  const invalid = [];

  /* -------------------- REQUIRED FIELD VALIDATION -------------------- */
  if (form.setupType === "business") {
    if (!form.businessName.trim()) invalid.push("businessName");
    if (!form.industry) invalid.push("industry");
  }

  if (form.setupType === "personal") {
    if (!form.fullName.trim()) invalid.push("fullName");
    if (!form.personalGoal) invalid.push("personalGoal");
  }

  if (!form.aiNumber.trim()) invalid.push("aiNumber");

  /* -------------------- SHOW VALIDATION ERRORS -------------------- */
  if (invalid.length > 0) {
    setInvalidFields(invalid);
    setError("Please fill in all required fields.");

    setShake(true);
    setTimeout(() => setShake(false), 400);

    setTimeout(() => {
      setError("");
      setInvalidFields([]);
    }, 3000);

    return;
  }

  if (loading) return;
  setLoading(true);

  try {
    /* ================================================================
       STEP 1: SAVE TO YOUR INTERNAL API (SUPABASE)
       This prevents duplicate saves and returns business_id.
    ================================================================= */
    const apiPayload = {
      setupType: form.setupType,

      // Personal fields
      fullName: form.fullName || "",
      personalGoal: form.personalGoal || "",

      // Business fields
      businessName:
        form.setupType === "business"
          ? form.businessName || ""
          : form.fullName || "",

      industry:
        form.setupType === "business"
          ? form.industry || ""
          : "Personal Use",

      email: form.email || "",
      location: form.location || "",
      priceRange:
  form.priceRange === "Custom Pricing"
    ? form.customPrice
    : form.priceRange,
  
      // Numbers
      aiNumber: `${form.aiCode}${form.aiNumber}`,
      supportNumber: form.supportNumber
        ? `${form.supportCode}${form.supportNumber}`
        : `${form.aiCode}${form.aiNumber}`,

      // Schedule
      workingDays: Array.isArray(form.workingDays)
        ? form.workingDays.join(", ")
        : "",

      hours: form.hours || "",

      // Capabilities
      capabilities: Array.isArray(form.capabilities)
        ? form.capabilities.join(", ")
        : ""
    };

    console.log("Saving to Supabase:", apiPayload);

    const apiRes = await fetch("/api/business/automation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(apiPayload)
    });

    const apiData = await apiRes.json();

    if (!apiRes.ok || !apiData.success) {
      throw new Error(apiData.message || "Failed to save setup.");
    }

    /* ================================================================
       STEP 2: IF RECORD ALREADY EXISTS, DO NOT SAVE AGAIN
    ================================================================= */
    if (apiData.alreadyExists) {
      setError("Information already saved. Please connect WhatsApp.");

      // Save business_id locally
      if (apiData.business_id) {
        localStorage.setItem("business_id", apiData.business_id);
      }

      setTimeout(() => {
        router.push("/connect-whatsapp");
      }, 2000);

      return;
    }

    /* ================================================================
       STEP 3: SAVE NEW BUSINESS ID LOCALLY
    ================================================================= */
    const businessId = apiData.business_id;

    if (businessId) {
      localStorage.setItem("business_id", businessId);
    }

    /* ================================================================
       STEP 4: SEND DATA TO EXISTING N8N WEBHOOK
       (Optional, keeps your previous automation workflow)
    ================================================================= */
    try {
      const webhookPayload = {
        businessId: businessId || "",
        setupType: apiPayload.setupType,
        fullName: apiPayload.fullName,
        personalGoal: apiPayload.personalGoal,
        businessName: apiPayload.businessName,
        industry: apiPayload.industry,
        email: apiPayload.email,
        location: apiPayload.location,
        priceRange: apiPayload.priceRange,
        aiNumber: apiPayload.aiNumber,
        supportNumber: apiPayload.supportNumber,
        workingDays: apiPayload.workingDays,
        hours: apiPayload.hours,
        capability: apiPayload.capabilities
      };

      console.log("Sending to n8n:", webhookPayload);

      await fetch("https://solomon-n8n.duckdns.org/webhook/setup-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(webhookPayload)
      });
    } catch (webhookError) {
      // Do not stop the process if n8n fails.
      console.warn("n8n webhook failed:", webhookError);
    }

    /* ================================================================
       STEP 5: SUCCESS MESSAGE
    ================================================================= */
    setError("🚀 AI Setup Saved Successfully");

    /* ================================================================
       STEP 6: REDIRECT TO CONNECT WHATSAPP
    ================================================================= */
    setTimeout(() => {
      router.push("/connect-whatsapp");
    }, 2000);
  } catch (err) {
    console.error("Submission failed:", err);

    setError(err.message || "Failed to save setup. Please try again.");

    setShake(true);
    setTimeout(() => setShake(false), 400);

    setTimeout(() => {
      setError("");
    }, 4000);
  } finally {
    setLoading(false);
  }
};

  /* ---------------------------------------------------------------------- */
  /* PAGE JSX START                                                          */
  /* ---------------------------------------------------------------------- */
return (
  <main
    className={`h-screen w-screen flex overflow-hidden ${
      darkMode
        ? "dark bg-[#020617]"
        : "bg-[#f5f7fa]"
    }`}
  >
      {/* SIDEBAR */}
     <aside className="w-[220px] bg-[#020617] text-white p-4 flex flex-col justify-between h-screen">
        <div>
          {/* LOGO */}
          <div className="flex items-center gap-3 mb-8">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              className="w-10 h-10"
              alt="WhatsApp"
            />
            <div>
              <h1 className="font-bold text-xl">sodah.io</h1>
              <p className="text-xs text-gray-400">
                WhatsApp Automation Setup
              </p>
            </div>
          </div>

          {/* STEPS */}
          <div className="space-y-3">
            <div className={`step ${activeStep === "business" ? "active" : ""}`}>
              ✓ Business Info
            </div>

            <div className={`step ${activeStep === "contact" ? "active" : ""}`}>
              ✓ Contact Details
            </div>

            <div className={`step ${activeStep === "schedule" ? "active" : ""}`}>
              ✓ Schedule
            </div>

            <div
              className={`step ${
                activeStep === "capabilities" ? "active" : ""
              }`}
            >
              ✓ AI Capabilities
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-[#031d18] p-4 rounded-xl text-sm leading-7">
          <p>Build smarter</p>
          <p>Automate better</p>
          <p className="text-green-400 font-semibold">Grow faster ⚡</p>
        </div>
      </aside>

      {/* CONTENT */}<section className="flex-1 flex items-center justify-center px-4 pt-17 pb-3 overflow-hidden">
        <div
 className={`w-full rounded-3xl shadow-xl p-4 space-y-3 scale-[0.92] origin-top transition-all duration-300 ${
    darkMode
      ? "bg-[#111827] text-white"
      : "bg-white text-black"
  } ${
    shake ? "shake" : ""
  }`}
>
          {/* SETUP TYPE */}
          <div>
            <h2 className="text-indigo-600 font-semibold mb-3">Business Automation Setup</h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    setupType: "business"
                  })
                }
                className={`h-[46px] rounded-xl font-semibold border-2 transition text-sm ${
  form.setupType === "business"
    ? "bg-green-600 border-green-600 text-white"
    : darkMode
    ? "bg-[#1f2937] border-[#374151] text-white"
   : darkMode
  ? "bg-[#111827] border-[#374151] text-white"
  : "bg-white border-gray-300 text-gray-700"
}`}
              >
                🏢 Business Use
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    setupType: "personal"
                  })
                }
               className={`h-[46px] rounded-xl font-semibold border-2 transition text-sm ${
  form.setupType === "personal"
    ? "bg-blue-600 border-blue-600 text-white"
    : darkMode
    ? "bg-[#1f2937] border-[#374151] text-white"
    : "bg-white border-gray-300 text-gray-700"
}`}
              >
                👤 Personal Use
              </button>
            </div>
          </div>

          {/* BUSINESS INFORMATION */}
          {form.setupType === "business" && (
            <div>
              <h2 className="text-green-600 font-semibold mb-3">
                Business Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <input
                  className={`input ${
                    invalidFields.includes("businessName")
                      ? "input-error"
                      : ""
                  }`}
                  placeholder="Business Name"
                  value={form.businessName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      businessName: e.target.value
                    })
                  }
                />

                <select
                  className={`input ${
                    invalidFields.includes("industry")
                      ? "input-error"
                      : ""
                  }`}
                  value={form.industry}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      industry: e.target.value
                    })
                  }
                >
                  <option value="">Select Industry</option>
                  {industries.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>

                <input
                  className="input"
                  placeholder="Business Email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value
                    })
                  }
                />

                <input
                  className="input"
                  placeholder="Business Location"
                  value={form.location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location: e.target.value
                    })
                  }
                />

                <div className="col-span-2">
                 {form.priceRange === "Custom Pricing" ? (
  <input
    type="text"
    placeholder="Enter your custom budget"
    className="input"
    value={form.customPrice || ""}
    onChange={(e) =>
      setForm({
        ...form,
        customPrice: e.target.value
      })
    }
  />
) : (
  <select
    className="input"
    value={form.priceRange}
    onChange={(e) =>
      setForm({
        ...form,
        priceRange: e.target.value
      })
    }
  >
    <option value="">Select Price Range</option>

    {priceRanges.map((item) => (
      <option key={item}>{item}</option>
    ))}
  </select>
)}
                </div>
              </div>
            </div>
          )}

          {/* PERSONAL USE */}
          {form.setupType === "personal" && (
            <div>
              <h2 className="text-blue-600 font-semibold mb-3">
                Personal Automation Setup
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <input
                  className={`input ${
                    invalidFields.includes("fullName")
                      ? "input-error"
                      : ""
                  }`}
                  placeholder="Full Name"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fullName: e.target.value
                    })
                  }
                />

                <input
                  className="input"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value
                    })
                  }
                />

                <div className="col-span-2">
                  <select
                    className={`input ${
                      invalidFields.includes("personalGoal")
                        ? "input-error"
                        : ""
                    }`}
                    value={form.personalGoal}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        personalGoal: e.target.value
                      })
                    }
                  >
                    <option value="">Select Personal Goal</option>
                    {personalUseOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CONTACT DETAILS */}
          <div>
            <h2 className="text-blue-600 font-semibold mb-3">
              Contact Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <PhoneInput
                countries={countries}
                valueCode={form.aiCode}
                valueNumber={form.aiNumber}
                placeholder="AI Number"
                invalid={invalidFields.includes("aiNumber")}
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

              <PhoneInput
                countries={countries}
                valueCode={form.supportCode}
                valueNumber={form.supportNumber}
                placeholder="Support Number"
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
            </div>
          </div>

          {/* BUSINESS SCHEDULE */}
          <div>
            <h2 className="text-purple-600 font-semibold mb-3">
              Business Schedule
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* WORKING DAYS */}
              <div className="relative" ref={daysRef}>
                <div
                  className="input cursor-pointer flex items-center"
                  onClick={() => {
                    setShowDaysDropdown(!showDaysDropdown);
                    setShowCapabilitiesDropdown(false);
                  }}
                >
                  <span className="truncate">
                    {displaySelected(
                      form.workingDays,
                      "Select Working Days"
                    )}
                  </span>
                </div>

                {showDaysDropdown && (
                  <div className="dropdownBox">
                    {workingDaysList.map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 py-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.workingDays.includes(day)}
                          onChange={() =>
                            toggleSelection("workingDays", day)
                          }
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* HOURS */}

<div className="space-y-2">

  {form.hours === "Custom Hours" ? (

    <input
      type="text"
      placeholder="Enter custom working hours"
      className="input"
      value={form.customHours || ""}
      onChange={(e) =>
        setForm({
          ...form,
          customHours: e.target.value
        })
      }
    />

  ) : (

    <select
      className="input"
      value={form.hours}
      onChange={(e) =>
        setForm({
          ...form,
          hours: e.target.value
        })
      }
    >
      <option value="">Select Hours</option>

      <option>24 Hours</option>
      <option>8 AM - 4 PM</option>
      <option>9 AM - 5 PM</option>
      <option>9 AM - 6 PM</option>
      <option>10 AM - 7 PM</option>

      <option>Custom Hours</option>
    </select>

  )}

</div>
            </div>
          </div>

          {/* AI CAPABILITIES */}
          <div>
            <h2 className="text-orange-500 font-semibold mb-3">
              AI Capabilities
            </h2>

            <div className="relative" ref={capabilitiesRef}>
              <div
                className="input cursor-pointer flex items-center"
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
                    "Select AI Capabilities"
                  )}
                </span>
              </div>

              {showCapabilitiesDropdown && (
                <div className="dropdownBox">
                  {(
                    form.setupType === "personal"
                      ? personalUseOptions
                      : capabilityList
                  ).map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 py-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.capabilities.includes(item)}
                        onChange={() =>
                          toggleSelection("capabilities", item)
                        }
                      />
                      {item}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            onClick={handleSubmit}
            className={`w-full h-[50px] rounded-xl text-white font-semibold text-base shadow-md transition-all ${
  darkMode
    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500"
    : "bg-green-600 hover:bg-green-700"
}`}
          >
            {loading ? "Checking..." : "🚀 Go Live"}
          </button>
        </div>
      </section>

      {/* CENTER POPUP MESSAGE */}
      {error && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none">
          <div
            className={`px-8 py-4 rounded-2xl shadow-2xl border-2 text-base font-semibold ${
              error.includes("Successfully")
                ? "bg-white text-green-600 border-green-500"
                : "bg-white text-red-600 border-red-500"
            }`}
          >
            {error}
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
       .input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 2px solid #9ca3af;
  border-radius: 12px;
  background: rgba(255,255,255,0.95);
  color: black;
  outline: none;
  font-size: 14px;
  transition: all 0.2s ease;
}

.dark .input {
  background: #1f2937;
  color: white;
  border: 2px solid #374151;
}
        .input-error {
          border: 2px solid #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
        }

        .step {
          padding: 12px 14px;
          border-radius: 12px;
          color: #9ca3af;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .step.active {
  background: linear-gradient(
    135deg,
    #16a34a,
    #22c55e
  );

  color: white;
  font-weight: 700;

  box-shadow:
    0 8px 20px rgba(34,197,94,0.25);
}

       .dropdownBox {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  width: 100%;
  background: white;
  border: 2px solid #9ca3af;
  border-radius: 12px;
  padding: 10px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 999;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.dark .dropdownBox {
  background: #111827;
  border: 2px solid #374151;
  color: white;
}

        @keyframes shake {
          0%, 100% {
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
      `}</style>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* PHONE INPUT COMPONENT                                                       */
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
      {/* COUNTRY SELECT */}
      <select
        value={valueCode}
        onChange={(e) => onCodeChange(e.target.value)}
        className={`w-[150px] h-[46px] px-2 border-2 rounded-xl bg-gray text-sm font-semibold outline-none ${
          invalid ? "border-red-500" : "border-gray-400"
        }`}
      >
        {countries.map((country, index) => (
          <option
            key={`${country.name}-${country.code}-${index}`}
            value={country.code}
          >
            {country.flag} {country.name} ({country.code})
          </option>
        ))}
      </select>

      {/* PHONE NUMBER INPUT */}
      <input
        type="tel"
        inputMode="numeric"
        value={valueNumber}
        placeholder={placeholder}
        className={`w-full h-[46px] px-4 border-2 rounded-xl outline-none ${
          invalid ? "border-red-500" : "border-gray-400"
        }`}
        onChange={(e) =>
          onNumberChange(e.target.value.replace(/\D/g, ""))
        }
      />
</div>
  );
}