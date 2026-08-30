"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const detectRestrictedBrowser = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = navigator.userAgent.toLowerCase();

  return (
    ua.includes("instagram") ||
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("whatsapp") ||
    ua.includes("tiktok") ||
    ua.includes("messenger") ||
    ua.includes("telegram") ||
    ua.includes("linkedin")
  );
};

export default function AuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shake, setShake] = useState(false);
  const [hideGoogle, setHideGoogle] = useState(false);
  const [maintenanceSeconds, setMaintenanceSeconds] = useState(60 * 60);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  const bgImages = [
    "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
  ];

  const [activeBg, setActiveBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBg(
        (previous) =>
          (previous + 1) % bgImages.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setHideGoogle(detectRestrictedBrowser());
  }, []);

  /*
   * ============================================================
   * MAINTENANCE COUNTDOWN
   * ============================================================
   */

  useEffect(() => {
    const interval = setInterval(() => {
      setMaintenanceSeconds((previous) =>
        previous > 0 ? previous - 1 : 0
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatMaintenanceTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  /*
   * ============================================================
   * MESSAGES
   * ============================================================
   */

  const triggerError = (message) => {
    setSuccess("");
    setError(message);
    setShake(true);

    setTimeout(() => {
      setShake(false);
    }, 500);

    setTimeout(() => {
      setError("");
    }, 4000);
  };

  const triggerSuccess = (message) => {
    setError("");
    setSuccess(message);

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  /*
   * ============================================================
   * FORM
   * ============================================================
   */

  const handleChange = (event) => {
    setError("");
    setSuccess("");

    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  /*
   * ============================================================
   * FIND BUSINESS
   * ============================================================
   */

  const findUserBusiness = async (userId) => {
    if (!userId) {
      throw new Error(
        "Unable to determine logged-in user."
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("business_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "[Auth] Business lookup error:",
        error
      );

      throw new Error(
        "Unable to check your business information."
      );
    }

    return data;
  };

  /*
   * ============================================================
   * SAFE NEXT URL
   * ============================================================
   */

  const getSafeNextPath = () => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const next = params.get("next");

    if (!next) {
      return null;
    }

    /*
     * Only allow internal application paths.
     *
     * Allowed:
     * /welcome
     * /channels
     * /settings
     *
     * Blocked:
     * https://example.com
     * //example.com
     * /login
     */

    if (
      !next.startsWith("/") ||
      next.startsWith("//") ||
      next === "/login"
    ) {
      return null;
    }

    return next;
  };

  /*
   * ============================================================
   * VERIFY SUPABASE SESSION
   * ============================================================
   */

  const verifyBrowserSession = async () => {
    const {
      data,
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        "[Auth] Session verification error:",
        error
      );

      return null;
    }

    return data?.session || null;
  };

  /*
   * ============================================================
   * WAIT FOR AUTH STATE
   * ============================================================
   *
   * Gives the Supabase client time to persist the
   * authenticated session before the browser navigates.
   */

  const waitForAuthenticatedSession =
    async (expectedUserId) => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const session =
          await verifyBrowserSession();

        if (
          session?.user?.id ===
          expectedUserId
        ) {
          return session;
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
      }

      return null;
    };

  /*
   * ============================================================
   * ROUTE AFTER LOGIN
   * ============================================================
   */

  const routeAfterLogin = async (user) => {
    /*
     * First respect ?next=
     *
     * Example:
     *
     * /login?next=/welcome
     *
     * becomes:
     *
     * /welcome
     */

    const nextPath = getSafeNextPath();

    if (nextPath) {
      console.log(
        "[Auth] Requested destination:",
        nextPath
      );

      window.location.replace(nextPath);

      return;
    }

    /*
     * No explicit destination.
     *
     * Determine whether this is an existing business
     * or a new user.
     */

    const business =
      await findUserBusiness(user.id);

    if (business?.business_id) {
      console.log(
        "[Auth] Existing business:",
        business.business_id
      );

      localStorage.setItem(
        "business_id",
        business.business_id
      );

      /*
       * Send authenticated users through Welcome.
       *
       * This gives your subscription/onboarding logic
       * one consistent entry point.
       */

      window.location.replace("/welcome");

      return;
    }

    /*
     * New user.
     */

    console.log(
      "[Auth] New user -> /welcome"
    );

    localStorage.removeItem(
      "business_id"
    );

    window.location.replace("/welcome");
  };

  /*
   * ============================================================
   * GOOGLE LOGIN
   * ============================================================
   */

  const handleGoogleLogin = async () => {
    try {
      if (hideGoogle) {
        triggerError(
          "Open Sodah.io in Safari or Chrome to use Google Sign-In."
        );

        return;
      }

      setLoading(true);

      /*
       * Clear any stale authentication state.
       */

      await supabase.auth.signOut();

      const nextPath =
        getSafeNextPath() || "/welcome";

      const redirectTo =
        `${window.location.origin}${nextPath}`;

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithOAuth({
          provider: "google",

          options: {
            redirectTo,

            skipBrowserRedirect: true,

            queryParams: {
              prompt: "select_account",
              access_type: "offline",
            },
          },
        });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href =
          data.url;
      }
    } catch (error) {
      console.error(
        "[Google Login]",
        error
      );

      triggerError(
        error?.message ||
          "Google login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * EMAIL LOGIN / REGISTRATION
   * ============================================================
   */

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      /*
       * --------------------------------------------------------
       * VALIDATION
       * --------------------------------------------------------
       */

      if (
        !form.email.trim() ||
        !form.password
      ) {
        triggerError(
          "Please fill in your email and password."
        );

        return;
      }

      if (!isLogin) {
        if (
          !form.fullName.trim() ||
          !form.phone.trim()
        ) {
          triggerError(
            "Please complete all fields."
          );

          return;
        }
      }

      /*
       * ========================================================
       * LOGIN
       * ========================================================
       */

      if (isLogin) {
        console.log(
          "[Auth] Starting email login..."
        );

        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });

        if (error) {
          console.error(
            "[Auth] Login failed:",
            error
          );

          triggerError(
            error.message
          );

          return;
        }

        const user = data?.user;
        const session = data?.session;

        /*
         * Supabase must return a user.
         */

        if (!user) {
          console.error(
            "[Auth] No user returned after login."
          );

          triggerError(
            "Login succeeded but no user was returned."
          );

          return;
        }

        /*
         * Supabase must also return a session.
         */

        if (!session) {
          console.error(
            "[Auth] No session returned after login."
          );

          triggerError(
            "Login succeeded but your authentication session could not be created."
          );

          return;
        }

        console.log(
          "[Auth] Supabase login successful:",
          user.id
        );

        /*
         * ------------------------------------------------------
         * WAIT FOR SESSION PERSISTENCE
         * ------------------------------------------------------
         */

        const verifiedSession =
          await waitForAuthenticatedSession(
            user.id
          );

        if (!verifiedSession) {
          console.error(
            "[Auth] Session verification failed after login."
          );

          triggerError(
            "Login succeeded, but your session could not be established. Please try again."
          );

          return;
        }

        console.log(
          "[Auth] Session verified:",
          verifiedSession.user.id
        );

        /*
         * ------------------------------------------------------
         * LOCAL USER DATA
         * ------------------------------------------------------
         */

        localStorage.setItem(
          "user_id",
          user.id
        );

        localStorage.setItem(
          "user_email",
          user.email || ""
        );

        triggerSuccess(
          "Login successful!"
        );

        /*
         * ------------------------------------------------------
         * ALLOW SUPABASE AUTH STATE TO FINISH
         * ------------------------------------------------------
         */

        await new Promise((resolve) => {
          setTimeout(resolve, 150);
        });

        /*
         * ------------------------------------------------------
         * ROUTE
         * ------------------------------------------------------
         */

        await routeAfterLogin(user);

        return;
      }

      /*
       * ========================================================
       * REGISTRATION
       * ========================================================
       */

      console.log(
        "[Auth] Creating account..."
      );

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,

          options: {
            data: {
              full_name:
                form.fullName.trim(),

              phone:
                form.phone.trim(),
            },
          },
        });

      if (error) {
        console.error(
          "[Auth] Registration failed:",
          error
        );

        triggerError(
          error.message
        );

        return;
      }

      const user = data?.user;

      if (!user) {
        triggerError(
          "Account was created but no user was returned."
        );

        return;
      }

      /*
       * If email confirmation is enabled, Supabase may
       * intentionally return no session.
       */

      if (!data.session) {
        triggerSuccess(
          "Account created. Please check your email to verify your account."
        );

        setForm({
          fullName: "",
          phone: "",
          email: "",
          password: "",
        });

        return;
      }

      /*
       * Verify new account session.
       */

      const verifiedSession =
        await waitForAuthenticatedSession(
          user.id
        );

      if (!verifiedSession) {
        triggerError(
          "Your account was created, but the login session could not be established."
        );

        return;
      }

      /*
       * Store local information.
       */

      localStorage.setItem(
        "user_id",
        user.id
      );

      localStorage.setItem(
        "user_email",
        user.email ||
          form.email.trim()
      );

      localStorage.removeItem(
        "business_id"
      );

      triggerSuccess(
        "Account created successfully!"
      );

      setForm({
        fullName: "",
        phone: "",
        email: "",
        password: "",
      });

      /*
       * New users go to Welcome.
       */

      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });

      window.location.replace(
        "/welcome"
      );
    } catch (error) {
      console.error(
        "[Auth] Unexpected authentication error:",
        error
      );

      triggerError(
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 py-10">

      {/* BACKGROUND */}

      <div className="absolute inset-0">
        {bgImages.map(
          (img, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ${
                activeBg === index
                  ? "opacity-100 scale-110"
                  : "opacity-0 scale-100"
              }`}
              style={{
                backgroundImage:
                  `url(${img})`,
              }}
            />
          )
        )}

        <div className="absolute inset-0 bg-[#03130f]/88 backdrop-blur-sm" />
      </div>

      {/* GREEN GLOWS */}

      <div className="absolute top-0 left-0 w-[250px] sm:w-[350px] md:w-[400px] h-[250px] sm:h-[350px] md:h-[400px] bg-green-500/20 rounded-full blur-[120px]" />

      <div className="absolute bottom-0 right-0 w-[250px] sm:w-[350px] md:w-[400px] h-[250px] sm:h-[350px] md:h-[400px] bg-emerald-400/20 rounded-full blur-[120px]" />

      {/* TOASTS */}

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-xl">
        {error && (
          <div className="bg-red-500/95 text-white px-5 py-3 rounded-2xl shadow-2xl animate-slide text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/95 text-white px-5 py-3 rounded-2xl shadow-2xl animate-slide text-center">
            {success}
          </div>
        )}
      </div>

      {/* CARD */}

      <div
        className={`relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl ${
          shake
            ? "animate-shake"
            : ""
        }`}
      >
        <div className="bg-black/40 border border-white/10 backdrop-blur-2xl rounded-[32px] p-5 sm:p-6 md:p-8 lg:p-10 shadow-[0_0_80px_rgba(34,197,94,0.15)]">

          {/* SYSTEM MAINTENANCE */}

          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-center shadow-[0_0_30px_rgba(245,158,11,0.08)]">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                System Maintenance
              </p>
            </div>

            <p className="mt-2 text-sm font-semibold text-white">
              Our system is currently under maintenance.
            </p>

            <p className="mt-1 text-xs leading-5 text-white/55">
              Our features are temporarily unavailable while we complete maintenance.
              We are sorry for the inconvenience and will get back to you shortly.
            </p>

            <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-black/20 px-4 py-2">
              <span className="font-mono text-lg font-black tracking-wider text-amber-200">
                {formatMaintenanceTime(maintenanceSeconds)}
              </span>
            </div>

            <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/35">
              Estimated return
            </p>
          </div>

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

          {!hideGoogle && (
            <button
              type="button"
              onClick={
                handleGoogleLogin
              }
              disabled={loading}
              className="w-full bg-white text-black py-3 sm:py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:scale-[1.02] transition-all duration-300 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img
                src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                className="w-5 h-5"
                alt="Google"
              />

              Continue with Google
            </button>
          )}

          {hideGoogle && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center mb-5">
              <p className="text-yellow-300 text-sm">
                Google Sign-In isn't
                available in this app
                browser. Please continue
                with Email, or open
                Sodah.io in Safari or
                Chrome.
              </p>
            </div>
          )}

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
                disabled={loading}
                autoComplete="name"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white mb-3 outline-none focus:border-green-400 text-sm sm:text-base disabled:opacity-50"
              />

              <input
                type="text"
                name="phone"
                placeholder="+1 234 567 8901"
                value={
                  form.phone
                }
                onChange={
                  handleChange
                }
                disabled={loading}
                autoComplete="tel"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white mb-3 outline-none focus:border-green-400 text-sm sm:text-base disabled:opacity-50"
              />
            </>
          )}

          {/* EMAIL */}

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={
              form.email
            }
            onChange={
              handleChange
            }
            disabled={loading}
            autoComplete="email"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white mb-3 outline-none focus:border-green-400 text-sm sm:text-base disabled:opacity-50"
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
              disabled={loading}
              autoComplete={
                isLogin
                  ? "current-password"
                  : "new-password"
              }
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white outline-none focus:border-green-400 text-sm sm:text-base disabled:opacity-50"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (previous) =>
                    !previous
                )
              }
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg disabled:opacity-50"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword
                ? "🙈"
                : "👁️"}
            </button>
          </div>

          {/* SUBMIT */}

          <button
            type="button"
            onClick={
              handleSubmit
            }
            disabled={loading}
            className="mx-auto block w-[92%] bg-gradient-to-r from-green-400 to-emerald-600 text-black py-2.5 sm:py-3 rounded-xl font-bold hover:scale-[1.01] transition-all duration-300 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
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

            <button
              type="button"
              onClick={() =>
                setIsLogin(
                  (previous) =>
                    !previous
                )
              }
              disabled={loading}
              className="text-green-400 ml-2 cursor-pointer font-semibold bg-transparent border-0 disabled:opacity-50"
            >
              {isLogin
                ? "Sign up"
                : "Log in"}
            </button>
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