"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MobileAutomationPage() {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({

    setupType: "business",

    // BUSINESS
    businessName: "",
    industry: "",
    email: "",
    location: "",

    // PERSONAL
    fullName: "",
    personalGoal: "",

    // CONTACT
    aiNumber: "",
    supportNumber: "",

    // SETTINGS
    workingDays: "Monday-Friday",
    hours: "24 Hours",
    capabilities: "Auto Reply"

  });

  const industries = [
    "Restaurant",
    "Salon",
    "Gym",
    "Real Estate",
    "E-commerce",
    "Hotel",
    "Clinic",
    "Spa",
    "Barbershop",
    "Church",
    "School",
    "Law Firm",
    "Travel Agency",
    "Car Dealership",
    "Marketing Agency",
    "Construction",
    "Logistics",
    "Pharmacy",
    "Supermarket",
    "Tech Company"
  ];

  const personalGoals = [
    "Auto Reply",
    "Appointment Booking",
    "Personal Assistant",
    "Reminder Messages",
    "Receive Unknown Messages",
    "Follow-up Messages",
    "Task Notifications",
    "Event Reminders"
  ];

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (form.setupType === "business") {

      if (
        !form.businessName ||
        !form.industry ||
        !form.aiNumber
      ) {
        alert(
          "Please complete all business details"
        );
        return;
      }

    }

    if (form.setupType === "personal") {

      if (
        !form.fullName ||
        !form.personalGoal ||
        !form.aiNumber
      ) {
        alert(
          "Please complete all personal details"
        );
        return;
      }

    }

    try {

      setLoading(true);

      const payload = {

        setupType:
          form.setupType,

        businessName:
          form.setupType === "business"
            ? form.businessName
            : form.fullName,

        fullName:
          form.fullName,

        personalGoal:
          form.personalGoal,

        industry:
          form.setupType === "business"
            ? form.industry
            : "Personal Use",

        email:
          form.setupType === "business"
            ? form.email
            : "",

        location:
          form.setupType === "business"
            ? form.location
            : "",

        aiNumber:
          form.aiNumber,

        supportNumber:
          form.setupType === "business"
            ? (
                form.supportNumber ||
                form.aiNumber
              )
            : form.aiNumber,

        workingDays:
          form.workingDays,

        hours:
          form.hours,

        capabilities:
          form.capabilities,

        whatsapp_connected:
          false

      };

      console.log(
        "MOBILE PAYLOAD:",
        payload
      );

      const response =
        await fetch(
          "/api/business/automation",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(
              payload
            )
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to save"
        );

      }

      if (data.business_id) {

        localStorage.setItem(
          "business_id",
          data.business_id
        );

      }

      alert(
        "Setup saved successfully 🚀"
      );

      router.push(
        "/mobile/qr-connect"
      );

    } catch (error) {

      console.error(error);

      alert(
        error.message
      );

    } finally {

      setLoading(false);

    }

  };
  return (

    <div className="min-h-screen bg-[#0B1120] text-white p-5">

      <div className="max-w-md mx-auto">

        {/* HEADER */}

        <div className="mb-8">

          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
            alt="Sodah.io"
            className="w-16 h-16 rounded-2xl mb-4"
          />

          <h1 className="text-4xl font-bold mb-2">
            Setup Automation
          </h1>

          <p className="text-gray-400">
            Connect your AI Assistant
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* ACCOUNT TYPE */}

          <select
            name="setupType"
            value={form.setupType}
            onChange={handleChange}
            className="w-full p-4 rounded-xl bg-[#1E293B]"
          >

            <option value="business">
              🏢 Business Use
            </option>

            <option value="personal">
              👤 Personal Use
            </option>

          </select>

          {/* BUSINESS USE */}

          {form.setupType === "business" && (
            <>

              <input
                type="text"
                name="businessName"
                placeholder="Business Name"
                value={form.businessName}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              />

              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              >

                <option value="">
                  Select Industry
                </option>

                {industries.map(
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

              <input
                type="email"
                name="email"
                placeholder="Business Email"
                value={form.email}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              />

              <input
                type="text"
                name="location"
                placeholder="Business Location"
                value={form.location}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              />

              <input
                type="tel"
                name="aiNumber"
                placeholder="AI WhatsApp Number"
                value={form.aiNumber}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              />

              <input
                type="tel"
                name="supportNumber"
                placeholder="Support Number"
                value={form.supportNumber}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              />

            </>
          )}

          {/* PERSONAL USE */}

          {form.setupType === "personal" && (
            <>

              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={form.fullName}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              />

              <select
                name="personalGoal"
                value={form.personalGoal}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              >

                <option value="">
                  Select Personal Goal
                </option>

                {personalGoals.map(
                  (goal) => (
                    <option
                      key={goal}
                      value={goal}
                    >
                      {goal}
                    </option>
                  )
                )}

              </select>

              <input
                type="tel"
                name="aiNumber"
                placeholder="WhatsApp Number"
                value={form.aiNumber}
                onChange={handleChange}
                className="w-full p-4 rounded-xl bg-[#1E293B]"
              />

            </>
          )}
          {/* WORKING DAYS */}

          <select
            name="workingDays"
            value={form.workingDays}
            onChange={handleChange}
            className="w-full p-4 rounded-xl bg-[#1E293B]"
          >
            <option>
              Monday-Friday
            </option>

            <option>
              Monday-Saturday
            </option>

            <option>
              Monday-Sunday
            </option>

            <option>
              24/7
            </option>
          </select>

          {/* HOURS */}

          <select
            name="hours"
            value={form.hours}
            onChange={handleChange}
            className="w-full p-4 rounded-xl bg-[#1E293B]"
          >
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
          </select>

          {/* CAPABILITIES */}

          <select
            name="capabilities"
            value={form.capabilities}
            onChange={handleChange}
            className="w-full p-4 rounded-xl bg-[#1E293B]"
          >

            {form.setupType === "business" ? (
              <>

                <option>
                  Auto Reply
                </option>

                <option>
                  Appointment Booking
                </option>

                <option>
                  Customer Support
                </option>

                <option>
                  Lead Capture
                </option>

                <option>
                  Follow-up Messages
                </option>

                <option>
                  Order Handling
                </option>

                <option>
                  FAQ Answers
                </option>

                <option>
                  Sales Automation
                </option>

              </>
            ) : (
              <>

                <option>
                  Auto Reply
                </option>

                <option>
                  Personal Assistant
                </option>

                <option>
                  Reminder Messages
                </option>

                <option>
                  Appointment Booking
                </option>

                <option>
                  Follow-up Messages
                </option>

                <option>
                  Task Notifications
                </option>

              </>
            )}

          </select>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 transition text-black font-bold py-4 rounded-xl"
          >
            {
              loading
                ? "Saving..."
                : "Save & Connect WhatsApp 🚀"
            }
          </button>

        </form>

      </div>

    </div>

  );

}