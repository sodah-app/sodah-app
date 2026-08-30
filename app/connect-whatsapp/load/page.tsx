 "use client"; 

import Link from "next/link"; 
import { useRouter } from "next/navigation"; 

const WHATSAPP_LOGO = "https://cdn.simpleicons.org/whatsapp/25D366"; 

export default function ConnectWhatsAppIntroPage() { 
  const router = useRouter(); 

  return ( 
    <main className="min-h-screen bg-[#05070b] text-white"> 
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8"> 
        <header className="flex items-center justify-between"> 
          <Link 
            href="/channels" 
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80" 
          > 
            ← Back 
          </Link> 
          <div className="text-sm font-black"> 
            Sodah<span className="text-cyan-400">.io</span> 
          </div> 
        </header> 

        <section className="flex flex-1 flex-col items-center justify-center py-12 text-center"> 
          <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_30px_rgba(37,211,102,0.12)]"> 
            <img 
              src={WHATSAPP_LOGO} 
              alt="WhatsApp" 
              className="h-11 w-11 object-contain" 
            /> 
          </div> 

          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-emerald-300"> 
            WhatsApp Connection 
          </p> 

          <h1 className="text-3xl font-black leading-tight"> 
            Connect your WhatsApp 
          </h1> 

          <p className="mt-4 text-sm leading-6 text-white/60"> 
            You are about to connect your WhatsApp to Sodah.io automation. 
            Open WhatsApp on your phone and get ready to scan the QR code. 
          </p> 

          <div className="mt-8 w-full rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left"> 
            {[ 
              ["1", "Open WhatsApp", "Open WhatsApp on the phone you want to connect."], 
              ["2", "Get ready to scan", "Open Linked Devices and get ready to scan the QR code."], 
              ["3", "Scan the QR code", "Continue to the secure connection screen when you are ready."], 
            ].map(([number, title, text], index) => ( 
              <div key={number}> 
                <div className="flex gap-4"> 
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-black text-cyan-300"> 
                    {number} 
                  </div> 
                  <div> 
                    <h2 className="text-sm font-black">{title}</h2> 
                    <p className="mt-1 text-xs leading-5 text-white/50">{text}</p> 
                  </div> 
                </div> 
                {index < 2 && ( 
                  <div className="my-4 ml-4 h-5 border-l border-dashed border-white/10" /> 
                )} 
              </div> 
            ))} 
          </div> 

          <button 
            type="button" 
            onClick={() => router.push("/connect-whatsapp")} 
            className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-5 py-4 text-sm font-black text-[#041014] shadow-[0_0_35px_rgba(34,211,238,0.18)] active:scale-[0.98]" 
          > 
            Ready to scan QR code 
          </button> 

          <p className="mt-4 text-[11px] text-white/35"> 
            The QR code will appear on the next screen. 
          </p> 
        </section> 
      </div> 
    </main> 
  ); 
} 
