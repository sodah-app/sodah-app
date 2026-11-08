
"use client";

import { useRouter } from "next/navigation";

const SUPPORT_NUMBER = "+971544027954";
const WHATSAPP_URL =
  "https://wa.me/971544027954?text=Hello%20Sodah.io%20System%20Support";

export default function ContactPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl font-black text-white">
              S
            </div>
            <div>
              <h1 className="text-xl font-black">
                Sodah<span className="text-emerald-600">.io</span>
              </h1>
              <p className="text-xs text-slate-500">System Support</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Back
          </button>
        </header>

        {/* Contact panel */}
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-900/5">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-10 text-white sm:px-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
              We're here to help
            </p>

            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Contact System Support
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
              Need help with your Sodah.io account, subscription,
              business workspace, or WhatsApp automation?
              Contact our support team directly on WhatsApp.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-8 w-8"
                      aria-hidden="true"
                    >
                      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .15 5.34.15 11.92c0 2.1.55 4.16 1.6 5.98L0 24l6.25-1.64a11.93 11.93 0 0 0 5.82 1.48h.01C18.66 23.84 24 18.5 24 11.92c0-3.18-1.24-6.17-3.48-8.44ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.87 9.87 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.99 2.9a9.84 9.84 0 0 1 2.9 7c0 5.45-4.44 9.89-9.9 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.48 1.69.61.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                    </svg>
                  </div>

                  <p className="text-sm font-semibold text-slate-500">
                    WhatsApp Support Number
                  </p>

                  <p className="mt-1 text-2xl font-black tracking-tight">
                    {SUPPORT_NUMBER}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Sodah.io System Support
                  </p>
                </div>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  <span>Chat on WhatsApp</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-slate-600">
              <p className="font-bold text-emerald-800">
                How can we help?
              </p>
              <p className="mt-1">
                Contact us for account assistance, subscription and
                payment questions, or technical support.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Sodah.io · System Support
        </footer>
      </div>
    </main>
  );
}
