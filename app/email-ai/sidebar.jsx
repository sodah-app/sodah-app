"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  LayoutDashboard,
  Send,
  FileText,
  Users,
  BarChart3,
  Plug,
  Settings,
  Crown,
  ChevronRight,
} from "lucide-react";

export default function EmailSidebar() {
  const pathname =
    usePathname();

  const items = [
    {
      name: "Email AI",
      href:
        "/dashboard/email-ai",
      icon: Mail,
    },
    {
      name: "Dashboard",
      href:
        "/dashboard",
      icon:
        LayoutDashboard,
    },
    {
      name: "Campaigns",
      href:
        "/dashboard/email-ai/campaigns",
      icon: Send,
    },
    {
      name: "Templates",
      href:
        "/dashboard/email-ai/templates",
      icon:
        FileText,
    },
    {
      name: "Leads",
      href:
        "/dashboard/email-ai/leads",
      icon: Users,
    },
    {
      name: "Analytics",
      href:
        "/dashboard/email-ai/analytics",
      icon:
        BarChart3,
    },
    {
      name: "Integrations",
      href:
        "/dashboard/email-ai/integrations",
      icon: Plug,
    },
    {
      name: "Settings",
      href:
        "/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      className="
      w-[260px]
      h-screen
      bg-[#050816]
      border-r
      border-white/10
      flex
      flex-col
      p-5
      shrink-0
      "
    >
      {/* Logo */}

      <div className="mb-10">

        <Link
          href="/dashboard"
          className="
          flex
          items-center
          gap-3
          "
        >
          <div
            className="
            w-12
            h-12
            rounded-2xl
            bg-gradient-to-br
            from-blue-500
            to-purple-600
            flex
            items-center
            justify-center
            text-2xl
            font-bold
            "
          >
            S
          </div>

          <div>

            <h1 className="text-3xl font-bold">
              Sodah
            </h1>

          </div>
        </Link>
      </div>

      {/* MENU */}

      <div className="space-y-2">

        {items.map(
          (item) => {
            const Icon =
              item.icon;

            const active =
              pathname ===
              item.href;

            return (
              <Link
                key={
                  item.name
                }
                href={
                  item.href
                }
                className={`
                h-14
                rounded-2xl
                px-4
                flex
                items-center
                gap-4
                transition-all
                ${
                  active
                    ? `
                    bg-gradient-to-r
                    from-purple-500/20
                    to-blue-500/20
                    border
                    border-purple-500/30
                    text-white
                    `
                    : `
                    text-gray-400
                    hover:text-white
                    hover:bg-white/5
                    `
                }
                `}
              >
                <Icon
                  size={20}
                />

                <span className="font-medium">
                  {
                    item.name
                  }
                </span>
              </Link>
            );
          }
        )}
      </div>

      {/* UPGRADE */}

      <div className="mt-auto">

        <div
          className="
          rounded-[30px]
          border
          border-white/10
          bg-white/[0.03]
          p-5
          backdrop-blur-xl
          "
        >
          <div
            className="
            w-12
            h-12
            rounded-2xl
            bg-yellow-500/20
            flex
            items-center
            justify-center
            mb-4
            "
          >
            <Crown
              className="
              text-yellow-400
              "
            />
          </div>

          <h3 className="text-lg font-bold">
            Upgrade to Pro
          </h3>

          <p
            className="
            text-gray-400
            text-sm
            mt-3
            "
          >
            Unlock advanced
            automation and
            unlimited campaigns.
          </p>

          <button
            className="
            mt-5
            h-12
            rounded-2xl
            w-full
            bg-gradient-to-r
            from-blue-500
            to-purple-600
            flex
            items-center
            justify-center
            gap-2
            "
          >
            Upgrade Now

            <ChevronRight
              size={18}
            />
          </button>
        </div>

        {/* USER */}

        <div
          className="
          mt-5
          rounded-[26px]
          border
          border-white/10
          bg-white/[0.03]
          p-4
          flex
          items-center
          justify-between
          "
        >
          <div className="flex gap-3 items-center">

            <div
              className="
              w-12
              h-12
              rounded-full
              bg-gradient-to-br
              from-purple-500
              to-blue-500
              flex
              items-center
              justify-center
              font-bold
              "
            >
              N
            </div>

            <div>

              <p className="font-semibold">
                Nana
              </p>

              <p className="text-xs text-gray-400">
                nana@example.com
              </p>

            </div>

          </div>
        </div>
      </div>
    </aside>
  );
}