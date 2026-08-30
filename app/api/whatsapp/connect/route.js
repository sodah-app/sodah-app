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
  /*
   * Evolution must send WhatsApp events directly
   * to the Sodah application.
   *
   * n8n is no longer used here.
   */
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    return `${appUrl.replace(
      /\/$/,
      ""
    )}/api/whatsapp/webhook`;
  }

  const url =
    new URL(request.url);

  return `${url.protocol}//${url.host}/api/whatsapp/webhook`;
}

async function createInstance(
  apiUrl,
  apiKey,
  instanceName
) {
  const response =
    await fetch(
      `${apiUrl}/instance/create`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          apikey:
            apiKey,
        },

        body: JSON.stringify({
          instanceName,

          integration:
            "WHATSAPP-BAILEYS",
        }),
      }
    );

  const text =
    await response.text();

  console.log(
    "[WHATSAPP] Create instance response:",
    text
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create WhatsApp instance: ${text}`
    );
  }

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Evolution returned invalid JSON while creating instance: ${text}`
    );
  }
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

      url:
        webhookUrl,

      events:
        WEBHOOK_EVENTS,
    },
  };

  console.log(
    "[WHATSAPP] Configuring webhook:",
    {
      instanceName,
      webhookUrl,
      events:
        WEBHOOK_EVENTS,
    }
  );

  const response =
    await fetch(
      `${apiUrl}/webhook/set/${encodeURIComponent(
        instanceName
      )}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          apikey:
            apiKey,
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  const text =
    await response.text();

  console.log(
    "[WHATSAPP] Configure webhook response:",
    text
  );

  if (!response.ok) {
    throw new Error(
      `Failed to configure WhatsApp webhook: ${text}`
    );
  }

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

async function getQrCode(
  apiUrl,
  apiKey,
  instanceName
) {
  const response =
    await fetch(
      `${apiUrl}/instance/connect/${encodeURIComponent(
        instanceName
      )}`,
      {
        method: "GET",

        headers: {
          apikey:
            apiKey,
        },

        cache:
          "no-store",
      }
    );

  const text =
    await response.text();

  console.log(
    "[WHATSAPP] Evolution raw response:",
    text
  );

  let data = {};

  if (text) {
    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `Evolution returned invalid JSON: ${text}`
      );
    }
  }

  return {
    response,
    data,
  };
}

export async function POST(request) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const businessId =
      searchParams
        .get("businessId")
        ?.trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Missing businessId.",
        },
        {
          status: 400,
        }
      );
    }

    const apiUrl =
      process.env.EVOLUTION_API_URL;

    const apiKey =
      process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Evolution API environment variables are missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * The Evolution instance name is the
     * Sodah business_id.
     *
     * Example:
     *
     * BIZ-1785669021522
     */
    const instanceName =
      businessId;

    /*
     * Evolution now points directly to
     * the Sodah webhook.
     */
    const webhookUrl =
      getWebhookUrl(request);

    console.log(
      "[WHATSAPP] Sodah webhook:",
      webhookUrl
    );

    /*
     * Get the existing Evolution instance.
     */
    let {
      response,
      data,
    } =
      await getQrCode(
        apiUrl,
        apiKey,
        instanceName
      );

    /*
     * Create the instance if it doesn't exist.
     */
    if (
      response.status === 404
    ) {
      console.log(
        `[WHATSAPP] Instance ${instanceName} not found. Creating...`
      );

      await createInstance(
        apiUrl,
        apiKey,
        instanceName
      );

      await configureWebhook(
        apiUrl,
        apiKey,
        instanceName,
        webhookUrl
      );

      /*
       * Give Evolution time to initialize.
       */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            3000
          )
      );

      const retry =
        await getQrCode(
          apiUrl,
          apiKey,
          instanceName
        );

      response =
        retry.response;

      data =
        retry.data;
    } else {
      /*
       * Existing instance:
       * always make sure the webhook
       * points to Sodah.
       */
      await configureWebhook(
        apiUrl,
        apiKey,
        instanceName,
        webhookUrl
      );
    }

    /*
     * Evolution API error.
     */
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,

          message:
            data?.message ||
            data?.response
              ?.message?.[0] ||
            `Evolution API returned ${response.status}`,

          details:
            data,
        },
        {
          status:
            response.status,
        }
      );
    }

    /*
     * Extract QR code.
     */
    const qrCode =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.qrcode?.code ||
      data?.qrCode ||
      data?.code ||
      "";

    /*
     * Determine connection state.
     */
    const state =
      data?.instance?.state ||
      data?.state ||
      "unknown";

    const connected =
      state === "open";

    console.log(
      "[WHATSAPP] Connection result:",
      {
        businessId,
        instanceName,
        connected,
        state,
        hasQrCode:
          Boolean(qrCode),
      }
    );

    return NextResponse.json({
      success: true,

      connected,

      state,

      qrCode,

      businessId,

      instance:
        instanceName,

      webhookUrl,

      message:
        connected
          ? "WhatsApp is already connected."
          : qrCode
            ? "Scan this QR code with WhatsApp."
            : "No QR code returned.",
    });
  } catch (error) {
    console.error(
      "[WHATSAPP][CONNECT] Error:",
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