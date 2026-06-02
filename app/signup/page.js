"use client";
import ResponsiveContainer from "../../components/ui/ResponsiveContainer";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function AuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [shake, setShake] =
    useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  // BACKGROUND IMAGES
  const bgImages = [
    "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1600&auto=format&fit=crop",

    "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1600&auto=format&fit=crop",

    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
  ];

  const [activeBg, setActiveBg] =
    useState(0);

  // BACKGROUND SLIDER
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBg(
        (prev) =>
          (prev + 1) %
          bgImages.length
      );
    }, 5000);

    return () =>
      clearInterval(interval);
  }, []);

  // ERROR ALERT
  const triggerError = (message) => {
    setSuccess("");

    setError(message);

    setShake(true);

    setTimeout(() => {
      setShake(false);
    }, 500);

    setTimeout(() => {
      setError("");
    }, 3000);
  };

  // SUCCESS ALERT
  const triggerSuccess = (
    message
  ) => {
    setError("");

    setSuccess(message);

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  // HANDLE INPUT
  const handleChange = (e) => {
    setError("");

    setSuccess("");

    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  // GOOGLE LOGIN
  const handleGoogleLogin =
    async () => {
      try {
        setLoading(true);

        await signIn(
          "google",
          {
            callbackUrl:
              "/welcome",
          }
        );
      } catch (error) {
        console.log(error);

        triggerError(
          "Google login failed."
        );
      } finally {
        setLoading(false);
      }
    };

  // LOGIN / REGISTER
  const handleSubmit =
    async () => {
      try {
        setLoading(true);

        // VALIDATION
        if (
          !form.email ||
          !form.password
        ) {
          triggerError(
            "Please fill in your details."
          );

          return;
        }

        if (!isLogin) {
          if (
            !form.fullName ||
            !form.phone
          ) {
            triggerError(
              "Please complete all fields."
            );

            return;
          }
        }

        // LOGIN
        if (isLogin) {
          const response =
            await fetch(
              "/api/auth/login",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify(
                  {
                    email:
                      form.email,

                    password:
                      form.password,
                  }
                ),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            triggerError(
              data.message ||
                "User not found."
            );

            return;
          }

          localStorage.setItem(
            "sodah-user",
            JSON.stringify(
              data.user
            )
          );

          triggerSuccess(
            "Login successful!"
          );

          setTimeout(() => {
            router.push(
              "/welcome"
            );
          }, 1200);
        }

        // REGISTER
        else {
          const response =
            await fetch(
              "/api/auth/register",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify(
                  {
                    fullName:
                      form.fullName,

                    phone:
                      form.phone,

                    email:
                      form.email,

                    password:
                      form.password,
                  }
                ),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            triggerError(
              data.message ||
                "Registration failed."
            );

            return;
          }

          triggerSuccess(
            "Account created successfully!"
          );

          // RESET FORM
          setForm({
            fullName: "",
            phone: "",
            email: "",
            password: "",
          });

          // SWITCH TO LOGIN
          setTimeout(() => {
            setIsLogin(true);
          }, 1200);
        }
      } catch (error) {
        console.log(error);

        triggerError(
          "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 py-10">

      {/* BACKGROUND */}
      <div className="absolute inset-0">
        {bgImages.map(
          (img, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ${
                activeBg ===
                index
                  ? "opacity-100 scale-110"
                  : "opacity-0 scale-100"
              }`}
              style={{
                backgroundImage: `url(${img})`,
              }}
            />
          )
        )}

        <div className="absolute inset-0 bg-[#03130f]/88 backdrop-blur-sm" />
      </div>

      {/* GLOW */}
      <div className="absolute top-0 left-0 w-[250px] sm:w-[350px] md:w-[400px] h-[250px] sm:h-[350px] md:h-[400px] bg-green-500/20 rounded-full blur-[120px]" />

      <div className="absolute bottom-0 right-0 w-[250px] sm:w-[350px] md:w-[400px] h-[250px] sm:h-[350px] md:h-[400px] bg-emerald-400/20 rounded-full blur-[120px]" />

      {/* TOASTS */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 space-y-3">

        {error && (
          <div className="bg-red-500/90 text-white px-5 py-3 rounded-2xl shadow-2xl animate-slide">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/90 text-white px-5 py-3 rounded-2xl shadow-2xl animate-slide">
            {success}
          </div>
        )}
      </div>

      {/* CARD */}
      <div
        className={`relative z-10 w-full transition-all duration-300
        max-w-sm
        sm:max-w-md
        md:max-w-lg
        lg:max-w-2xl
        xl:max-w-2xl ${
          shake
            ? "animate-shake"
            : ""
        }`}
      >

        <div className="bg-black/35 border border-white/10 backdrop-blur-2xl rounded-[32px] p-5 sm:p-6 md:p-8 lg:p-10 shadow-[0_0_80px_rgba(34,197,94,0.15)]">

          {/* LOGO */}
          <div className="text-center mb-6">

            <img
              src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
              alt="Sodah"
              className="w-20 h-20 object-cover mx-auto rounded-2xl mb-5 border border-white/10 shadow-xl"
            />

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
              {isLogin
                ? "Welcome Back 👋"
                : "Create Account 🚀"}
            </h1>

            <p className="text-gray-400 mt-3 text-sm sm:text-base md:text-lg">
              AI-powered automation
              for your business.
            </p>
          </div>

          {/* GOOGLE */}
          <button
            onClick={
              handleGoogleLogin
            }
            disabled={loading}
            className="w-full bg-white text-black py-3 sm:py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:scale-[1.02] transition-all duration-300 text-sm sm:text-base"
          >
            <img
              src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
              className="w-5 h-5"
            />

            Continue with Google
          </button>

          {/* DIVIDER */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />

            <span className="text-gray-400 text-sm">
              or continue with email
            </span>

            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* SIGNUP */}
          {!isLogin && (
            <>
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={
                  form.fullName
                }
                onChange={
                  handleChange
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white mb-3 outline-none focus:border-green-400 text-sm sm:text-base"
              />

              <input
                type="text"
                name="phone"
                placeholder="+1 234 567 8901"
                value={form.phone}
                onChange={
                  handleChange
                }
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white mb-3 outline-none focus:border-green-400 text-sm sm:text-base"
              />
            </>
          )}

          {/* EMAIL */}
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white mb-3 outline-none focus:border-green-400 text-sm sm:text-base"
          />

          {/* PASSWORD */}
          <div className="relative mb-5">

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password"
              placeholder="Password"
              value={
                form.password
              }
              onChange={
                handleChange
              }
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white outline-none focus:border-green-400 text-sm sm:text-base"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            >
              {showPassword
                ? "🙈"
                : "👁️"}
            </button>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-600 text-black py-3.5 sm:py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 text-sm sm:text-base md:text-lg"
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Log In"
              : "Create Account"}
          </button>

          {/* TOGGLE */}
          <p className="text-center text-gray-400 mt-5 text-sm sm:text-base">
            {isLogin
              ? "Don’t have an account?"
              : "Already have an account?"}

            <span
              onClick={() =>
                setIsLogin(
                  !isLogin
                )
              }
              className="text-green-400 ml-2 cursor-pointer font-semibold"
            >
              {isLogin
                ? "Sign up"
                : "Log in"}
            </span>
          </p>
        </div>
      </div>

      {/* ANIMATIONS */}
      <style jsx>{`
        @keyframes shake {
          0% {
            transform: translateX(0);
          }

          20% {
            transform: translateX(-10px);
          }

          40% {
            transform: translateX(10px);
          }

          60% {
            transform: translateX(-8px);
          }

          80% {
            transform: translateX(8px);
          }

          100% {
            transform: translateX(0);
          }
        }

        .animate-shake {
          animation: shake 0.4s ease;
        }

        @keyframes slide {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide {
          animation: slide 0.3s ease;
        }
      `}</style>
    </main>
  );
}