import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    let supabase = await createServerClient();
    let {data,error:authError} = await supabase.auth.getUser();

    if (authError || !data?.user) {
      const authorization = request.headers.get("authorization") || "";
      const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (token && url && anonKey) {
        supabase = createSupabaseClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const tokenResult = await supabase.auth.getUser(token);
        data = tokenResult.data;
        authError = tokenResult.error;
      }
    }

    if (authError || !data?.user)
      return NextResponse.json({success:false,message:"Authentication required."},{status:401});

    const {invoice} = await request.json();
    if (!invoice)
      return NextResponse.json({success:false,message:"Invoice is required."},{status:400});

    const amount = Number(invoice.amount || 0);
    const due = new Date(`${invoice.due_date}T23:59:59`);
    const daysOverdue = Math.max(0,Math.floor((Date.now()-due.getTime())/86400000));

    const fallback =
      `Hi ${invoice.customer_name || "there"},\n\n` +
      `This is a friendly reminder regarding invoice ${invoice.invoice_number || ""} ` +
      `for ${invoice.currency || "AED"} ${amount.toLocaleString()}. ` +
      (daysOverdue > 0 ? `The invoice is currently ${daysOverdue} day(s) overdue. ` : `The payment is now due. `) +
      `Please let us know if payment has already been arranged.\n\nThank you.`;

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({success:true,ai:false,reply:fallback,
        analysis:daysOverdue > 0 ? `Invoice is ${daysOverdue} day(s) overdue.` : "Invoice is not overdue."});
    }

    const prompt =
      `Create a concise professional payment reminder. ` +
      `Customer: ${invoice.customer_name}. Invoice: ${invoice.invoice_number}. ` +
      `Amount: ${invoice.currency || "AED"} ${amount.toLocaleString()}. ` +
      `Due date: ${invoice.due_date}. Days overdue: ${daysOverdue}. ` +
      `Return only the message. Do not invent payment links, bank details, fees, discounts, legal threats, or facts.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages:[
          {role:"system",content:"You are SODAH Cashflow's professional accounts-receivable assistant."},
          {role:"user",content:prompt}
        ],
        temperature:.3,
        max_tokens:300
      })
    });

    const provider = await response.json();

    if (!response.ok) {
      console.error("[Cashflow AI] OpenAI:",provider);
      return NextResponse.json({success:true,ai:false,reply:fallback,
        analysis:provider?.error?.message || "AI unavailable; local reminder used."});
    }

    const reply = provider?.choices?.[0]?.message?.content?.trim();
    if (!reply)
      return NextResponse.json({success:true,ai:false,reply:fallback,analysis:"AI returned no message; local reminder used."});

    return NextResponse.json({success:true,ai:true,reply,
      analysis:daysOverdue > 0 ? `Invoice is ${daysOverdue} day(s) overdue.` : "Invoice is not overdue."});
  } catch (error) {
    console.error("[Cashflow AI]:",error);
    return NextResponse.json({success:false,message:error?.message || "Unable to generate reminder."},{status:500});
  }
}
