"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MobileAutomationPage() {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [shake, setShake] = useState(false);

  const [showErrorToast, setShowErrorToast] =
    useState(false);

  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    whatsapp: "",
    tone: "Professional",
    aiReplies: true,
    bookings: true,
  });

  const businessTypes = [
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
    "Tech Company",
  ];

  const handleChange = (e) => {

    const { name, value, type, checked } =
      e.target;

    setFormData({
      ...formData,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validateForm = () => {

    const newErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = true;
    }

    if (!formData.businessType.trim()) {
      newErrors.businessType = true;
    }

    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = true;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    const valid = validateForm();

    if (!valid) {

      navigator.vibrate?.([
        200,
        100,
        200,
      ]);

      setShake(true);

      setShowErrorToast(true);

      setTimeout(() => {
        setShake(false);
      }, 500);

      setTimeout(() => {
        setShowErrorToast(false);
      }, 2500);

      return;
    }

    try {

      setLoading(true);

      // CHECK EXISTING WHATSAPP

      const checkResponse =
        await fetch(
          "/api/check-whatsapp",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              whatsapp:
                formData.whatsapp,
            }),
          }
        );

      const checkData =
        await checkResponse.json();

      if (checkData.exists) {

        alert(
          "WhatsApp already connected ✅"
        );

        return;
      }

      // SAVE SETTINGS

      const saveResponse =
        await fetch(
          "/api/save-automation",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              formData
            ),
          }
        );

      const saveData =
        await saveResponse.json();

      if (!saveData.success) {

        alert(
          "Failed to save settings"
        );

        return;
      }

      // REDIRECT TO QR PAGE

      router.push(
        "/mobile/qr-connect"
      );

    } catch (error) {

      console.log(error);

      alert(
        "Something went wrong"
      );

    } finally {

      setLoading(false);
    }
  };

  return (

    <div className="min-h-screen bg-[#0B1120] text-white p-5 flex items-center justify-center">

      {/* ERROR TOAST */}

      {
        showErrorToast && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">

            <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl animate-bounce text-center font-semibold">

              Please fill all required details ❗

            </div>

          </div>
        )
      }

      <div
        className={`w-full max-w-md ${
          shake
            ? "animate-shake"
            : ""
        }`}
      >

        {/* HEADER */}

        <div className="flex items-center gap-3 mb-6">

          <img
            src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
            alt="Sodah.io"
            className="w-14 h-14 rounded-2xl"
          />

          <div>

            <h1 className="text-3xl font-bold">
              Setup Automation
            </h1>

            <p className="text-gray-400 text-sm mt-1">
              Connect your business AI assistant.
            </p>

          </div>

        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* BUSINESS NAME */}

          <div>

            <label className="block mb-2 text-sm font-medium">
              Business Name
            </label>

            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Sodah Restaurant"
              className={`w-full p-4 rounded-2xl bg-[#1E293B] border ${
                errors.businessName
                  ? "border-red-500"
                  : "border-gray-700"
              } focus:outline-none focus:border-green-400 transition`}
            />

          </div>

          {/* BUSINESS TYPE */}

          <div>

            <label className="block mb-2 text-sm font-medium">
              Business Type
            </label>

            <select
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className={`w-full p-4 rounded-2xl bg-[#1E293B] border ${
                errors.businessType
                  ? "border-red-500"
                  : "border-gray-700"
              } focus:outline-none focus:border-green-400 transition`}
            >

              <option value="">
                Select Business Type
              </option>

              {
                businessTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )
              }

            </select>

          </div>

          {/* WHATSAPP */}

          <div>

            <label className="block mb-2 text-sm font-medium">
              WhatsApp Number
            </label>

            <input
              type="text"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="+971 50 123 4567"
              className={`w-full p-4 rounded-2xl bg-[#1E293B] border ${
                errors.whatsapp
                  ? "border-red-500"
                  : "border-gray-700"
              } focus:outline-none focus:border-green-400 transition`}
            />

          </div>

          {/* AI TONE */}

          <div>

            <label className="block mb-2 text-sm font-medium">
              AI Tone
            </label>

            <select
              name="tone"
              value={formData.tone}
              onChange={handleChange}
              className="w-full p-4 rounded-2xl bg-[#1E293B] border border-gray-700 focus:outline-none focus:border-green-400 transition"
            >

              <option>
                Professional
              </option>

              <option>
                Friendly
              </option>

              <option>
                Sales
              </option>

            </select>

          </div>

          {/* AI REPLIES */}

          <div className="flex items-center justify-between bg-[#1E293B] p-4 rounded-2xl">

            <span>
              Enable AI Replies
            </span>

            <input
              type="checkbox"
              name="aiReplies"
              checked={formData.aiReplies}
              onChange={handleChange}
            />

          </div>

          {/* BOOKINGS */}

          <div className="flex items-center justify-between bg-[#1E293B] p-4 rounded-2xl">

            <span>
              Enable Booking Automation
            </span>

            <input
              type="checkbox"
              name="bookings"
              checked={formData.bookings}
              onChange={handleChange}
            />

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-400 hover:bg-green-300 transition text-black font-bold py-4 rounded-2xl"
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