import { NextResponse } from "next/server";

const WEBHOOK_EVENTS = [
  "APPLICATION_STARTUP",
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
];

function getWebhookUrl(request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/api/whatsapp/webhook`;
  }

  const url = new URL(request.url);

  return `${url.protocol}//${url.host}/api/whatsapp/webhook`;
}

function getEvolutionConfig() {
  const apiUrl = process.env.EVOLUTION_API_2_URL;
  const apiKey = process.env.EVOLUTION_API_2_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      "Second Evolution API environment variables are missing. Please configure EVOLUTION_API_2_URL and EVOLUTION_API_2_KEY."
    );
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    apiKey,
  };
}

async function createInstance(
  apiUrl,
  apiKey,
  instanceName,
  webhookUrl
) {
  const payload = {
    instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    webhook: webhookUrl,
    webhookByEvents: false,
    events: WEBHOOK_EVENTS,
  };

  console.log("[WHATSAPP] Creating second Evolution instance:", {
    instanceName,
    webhookUrl,
    events: WEBHOOK_EVENTS,
  });

  const response = await fetch(`${apiUrl}/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text();

  console.log(
    "[WHATSAPP] Second Evolution create response:",
    text
  );

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Second Evolution API returned invalid JSON while creating the instance: ${text}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.response?.message?.[0] ||
        `Failed to create WhatsApp instance. Status: ${response.status}`
    );
  }

  return {
    response,
    data,
  };
}

async function configureWebhook(
  apiUrl,
  apiKey,
  instanceName,
  webhookUrl
) {
  const payload = {
    webhook: {
      enabled: true,
      url: webhookUrl,
      events: WEBHOOK_EVENTS,
      byEvents: false,
      base64: true,
    },
  };

  console.log("[WHATSAPP] Configuring second Evolution webhook:", {
    instanceName,
    webhookUrl,
    events: WEBHOOK_EVENTS,
  });

  const response = await fetch(
    `${apiUrl}/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  const text = await response.text();

  console.log(
    "[WHATSAPP] Second Evolution webhook response:",
    text
  );

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text,
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.response?.message?.[0] ||
        `Failed to configure WhatsApp webhook. Status: ${response.status}`
    );
  }

  return data;
}

async function getInstanceConnection(
  apiUrl,
  apiKey,
  instanceName
) {
  const response = await fetch(
    `${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`,
    {
      method: "GET",
      headers: {
        apikey: apiKey,
      },
      cache: "no-store",
    }
  );

  const text = await response.text();

  console.log(
    "[WHATSAPP] Second Evolution connection response:",
    text
  );

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Second Evolution API returned invalid JSON: ${text}`
      );
    }
  }

  return {
    response,
    data,
  };
}

function extractQrCode(data) {
  return (
    data?.base64 ||
    data?.qrcode?.base64 ||
    data?.qrCode ||
    data?.code ||
    ""
  );
}

function extractConnectionState(data) {
  return (
    data?.instance?.state ||
    data?.instance?.connectionStatus ||
    data?.state ||
    data?.status ||
    "unknown"
  );
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams
      .get("businessId")
      ?.trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing businessId.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      apiUrl,
      apiKey,
    } = getEvolutionConfig();

    const webhookUrl = getWebhookUrl(request);

    /*
     * We keep the Sodah business ID as the Evolution
     * instance name so every business gets its own
     * WhatsApp session.
     */
    const instanceName = businessId;

    console.log("[WHATSAPP] Starting second Evolution connection:", {
      businessId,
      instanceName,
      apiUrl,
      webhookUrl,
    });

    /*
     * First check whether this business already has
     * an Evolution instance.
     */
    let {
      response,
      data,
    } = await getInstanceConnection(
      apiUrl,
      apiKey,
      instanceName
    );

    /*
     * Instance does not exist.
     *
     * Create it on Evolution API #2.
     */
    if (response.status === 404) {
      console.log(
        `[WHATSAPP] Instance ${instanceName} does not exist on Evolution API #2. Creating it...`
      );

      const created = await createInstance(
        apiUrl,
        apiKey,
        instanceName,
        webhookUrl
      );

      response = created.response;
      data = created.data;

      /*
       * Make absolutely sure the webhook is configured.
       */
      try {
        await configureWebhook(
          apiUrl,
          apiKey,
          instanceName,
          webhookUrl
        );
      } catch (webhookError) {
        console.error(
          "[WHATSAPP] Webhook configuration warning:",
          webhookError
        );
      }

      /*
       * Evolution normally returns the QR code
       * directly during creation.
       *
       * If it doesn't, give the instance a moment
       * to initialize and request the connection again.
       */
      const initialQrCode = extractQrCode(data);

      if (!initialQrCode) {
        await new Promise((resolve) => {
          setTimeout(resolve, 3000);
        });

        const retry = await getInstanceConnection(
          apiUrl,
          apiKey,
          instanceName
        );

        response = retry.response;
        data = retry.data;
      }
    } else if (response.ok) {
      /*
       * Existing instance.
       *
       * Make sure the webhook is still pointing
       * to the current Sodah application.
       */
      try {
        await configureWebhook(
          apiUrl,
          apiKey,
          instanceName,
          webhookUrl
        );
      } catch (webhookError) {
        console.error(
          "[WHATSAPP] Existing instance webhook warning:",
          webhookError
        );
      }
    }

    /*
     * Evolution API returned an error.
     */
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            data?.response?.message?.[0] ||
            `Evolution API returned status ${response.status}.`,
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    /*
     * Extract the QR code from the different
     * response formats Evolution may return.
     */
    const qrCode = extractQrCode(data);

    /*
     * Determine connection state.
     */
    const state = extractConnectionState(data);

    const connected =
      state === "open" ||
      state === "OPEN" ||
      state === "connected" ||
      state === "CONNECTED";

    console.log("[WHATSAPP] Second Evolution connection result:", {
      businessId,
      instanceName,
      state,
      connected,
      hasQrCode: Boolean(qrCode),
    });

    /*
     * Return the same response structure that
     * the existing Sodah QR page already expects.
     */
    return NextResponse.json({
      success: true,
      connected,
      state,
      qrCode,
      businessId,
      instance: instanceName,
      webhookUrl,
      evolution: "secondary",
      message: connected
        ? "WhatsApp is already connected."
        : qrCode
          ? "Scan this QR code with WhatsApp."
          : "WhatsApp is waiting for a QR code.",
    });
  } catch (error) {
    console.error(
      "[WHATSAPP][CONNECT][EVOLUTION_2] Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}