const DEFAULT_TIMEOUT_MS = 15000;

function getProviderUrl() {
  const value =
    process.env.WHATSAPP_QR_PROVIDER_URL?.trim() ||
    "http://localhost:3001";

  return value.replace(/\/+$/, "");
}

function getProviderKey() {
  const value = process.env.WHATSAPP_QR_PROVIDER_API_KEY?.trim();

  if (!value) {
    throw new Error(
      "WHATSAPP_QR_PROVIDER_API_KEY is not configured."
    );
  }

  return value;
}

export async function sendWhatsAppThroughProvider({
  businessId,
  to,
  message,
}) {
  const id = String(businessId || "").trim();
  const phone = String(to || "").replace(/\D/g, "");
  const text = String(message || "").trim();

  if (!id || !phone || !text) {
    throw new Error(
      "businessId, to, and message are required."
    );
  }

  if (phone.length < 7) {
    throw new Error("Invalid WhatsApp recipient number.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${getProviderUrl()}/business/${encodeURIComponent(id)}/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getProviderKey()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: phone,
          message: text,
        }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const raw = await response.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `WhatsApp provider returned HTTP ${response.status}.`
      );
    }

    if (!data?.success) {
      throw new Error(
        data?.message ||
          "WhatsApp provider did not confirm the message."
      );
    }

    return {
      channel_message_id:
        data.channel_message_id || data.messageId || "",
      to: phone,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "WhatsApp provider request timed out."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
