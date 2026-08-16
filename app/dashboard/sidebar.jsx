"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardSidebar({
  activePage,
  setActivePage,
}) {
  const router = useRouter();

  return (
    <div
      className="
        w-60
        bg-gradient-to-b
        from-[#0f172a]
        to-[#1e293b]
        text-white
        p-4
        flex
        flex-col
      "
    >
      <h2 className="font-bold text-lg mb-6">
        Sodah.io
      </h2>

      {/* MAIN MENU */}

      <SidebarItem
        title="Dashboard"
        active={activePage === "Dashboard"}
        onClick={() =>
          setActivePage("Dashboard")
        }
      />

      <SidebarItem
        title="Bookings"
        active={activePage === "Bookings"}
        onClick={() =>
          setActivePage("Bookings")
        }
      />

      <SidebarItem
        title="Customers"
        active={activePage === "Customers"}
        onClick={() =>
          setActivePage("Customers")
        }
      />

      <SidebarItem
        title="New Leads"
        active={activePage === "New Leads"}
        onClick={() =>
          setActivePage("New Leads")
        }
      />

      <SidebarItem
        title="Hot Leads"
        active={activePage === "Hot Leads"}
        onClick={() =>
          setActivePage("Hot Leads")
        }
      />

      <SidebarItem
        title="Calendar"
        active={activePage === "Calendar"}
        onClick={() =>
          setActivePage("Calendar")
        }
      />

      <SidebarItem
        title="Reports"
        active={activePage === "Reports"}
        onClick={() =>
          setActivePage("Reports")
        }
      />

      <SidebarItem
        title="Settings"
        active={activePage === "Settings"}
        onClick={() =>
          setActivePage("Settings")
        }
      />

      {/* ==========================
          AI TOOLS
      ========================== */}

      <div className="mt-8 border-t border-white/10 pt-5">

        <div
          className="
            text-xs
            text-gray-400
            mb-3
            font-bold
            tracking-widest
          "
        >
          AI TOOLS
        </div>

        <div
  onClick={() =>
    router.push("/dashboard/business-ai")
  }
  className="
    mb-3
    px-3
    py-3
    rounded-lg
    cursor-pointer
    text-sm
    font-semibold
    text-center
    bg-gradient-to-r
    from-purple-500
    to-blue-500
    hover:scale-105
    transition-all
    shadow-lg
  "
>
  🤖 Business Update AI
</div>

<div
  onClick={() =>
    router.push("/analytics")
  }
  className="
    px-3
    py-3
    rounded-lg
    cursor-pointer
    text-sm
    font-semibold
    text-center
    bg-gradient-to-r
    from-green-500
    to-emerald-500
    hover:scale-105
    transition-all
    shadow-lg
  "
>
  📊 Analytics
</div>
      </div>

      {/* FOOTER */}

      <div className="mt-auto">

     

        <div
          className="
            text-red-400
            cursor-pointer
            hover:text-red-300
          "
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        >
          Logout
        </div>

      </div>
    </div>
  );
}

function SidebarItem({
  title,
  active,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`
        px-3
        py-2
        rounded-md
        cursor-pointer
        text-sm
        mb-1
        transition-all
        ${
          active
            ? "bg-green-500 text-white shadow-lg"
            : "hover:bg-white/10"
        }
      `}
    >
      {title}
    </div>
  );
}