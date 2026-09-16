"use client";

export default function Sidebar({
  recentCampaigns,
  openCampaign,
}) {
  return (
    <aside className="w-[280px] border-r border-white/10 bg-[#08111f] flex flex-col">

      <div className="p-7">

        <h1 className="text-3xl font-bold text-white">
          Sodah
        </h1>

        <p className="text-gray-400 mt-2 text-sm">
          AI Growth Platform
        </p>

      </div>

      <div className="flex-1 overflow-y-auto px-5">

        <h2 className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-5">

          Recent Campaigns

        </h2>

        <div className="space-y-3">

          {recentCampaigns.length === 0 && (

            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">

              <p className="text-gray-500 text-sm">

                No campaigns yet

              </p>

            </div>

          )}

          {recentCampaigns.map((campaign) => (

            <button
              key={campaign.id}
              onClick={() => openCampaign(campaign)}
              className="
                w-full
                rounded-2xl
                bg-white/5
                hover:bg-white/10
                border
                border-white/5
                transition
                p-5
                text-left
              "
            >

              <h3 className="font-semibold text-white truncate">

                {campaign.business_name || "Untitled Campaign"}

              </h3>

              <p className="text-xs text-gray-400 mt-2">

                {campaign.status}

              </p>

            </button>

          ))}

        </div>

      </div>

    </aside>
  );
}