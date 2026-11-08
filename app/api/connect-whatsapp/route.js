import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QR_PROVIDER_URL =
  process.env.WHATSAPP_QR_PROVIDER_URL ||
  "https://sodah-whatsapp-qr-provider.onrender.com";

const QR_PROVIDER_API_KEY =
  process.env.WHATSAPP_QR_PROVIDER_API_KEY || "";

const PROVIDER_BASE_URL =
  QR_PROVIDER_URL.replace(/\/+$/, "");

/*
 * This is sent from the newly connected WhatsApp account
 * to its own connected WhatsApp chat.
 */
const TEST_MESSAGE = `Your business is connected to Sodah.io.

AI auto-reply, appointment, reminder and follow-up start.

Thanks for choosing Sodah.io.`;

/* ============================================================
   PROVIDER HEADERS
   ============================================================ */

function providerHeaders(includeJson = false) {
  return {
    Accept: "application/json",

    ...(QR_PROVIDER_API_KEY
      ? {
          Authorization: `Bearer ${QR_PROVIDER_API_KEY}`,
        }
      : {}),

    ...(includeJson
      ? {
          "Content-Type": "application/json",
        }
      : {}),
  };
}

/* ============================================================
   PHONE HELPERS
   ============================================================ */

function normalizePhone(value) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "")
    .replace(/\D/g, "");
}

/* ============================================================
   PROVIDER RESPONSE
   ============================================================ */

async function readProviderResponse(response, label) {
  const contentType =
    response.headers.get("content-type") || "";

  const rawText = await response.text();

  let data = {};

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {};
    }
  }

  console.log(
    `[WhatsApp Connect API] ${label}:`,
    response.status,
    data
  );

  return {
    ok: response.ok,
    status: response.status,
    data,
    rawText,
    contentType,
  };
}

/* ============================================================
   PROVIDER FETCH
   ============================================================ */

async function providerFetch(
  url,
  options = {},
  label = "Provider request"
) {
  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
    });

    return await readProviderResponse(
      response,
      label
    );
  } catch (error) {
    console.error(
      `[WhatsApp Connect API] ${label} failed:`,
      error
    );

    return {
      ok: false,
      status: 0,
      data: {},
      rawText: "",
      contentType: "",
    };
  }
}

/* ============================================================
   NORMALIZE PROVIDER DATA
   ============================================================ */

function normalizeProviderData(data = {}) {
  const qrCode =
    typeof data.qrCode === "string" &&
    data.qrCode.trim()
      ? data.qrCode
      : typeof data.qr === "string" &&
        data.qr.trim()
      ? data.qr
      : "";

  const phoneNumber =
    data.phoneNumber ||
    data.phone ||
    data.number ||
    null;

  const status =
    String(
      data.status ||
        (qrCode
          ? "qr_pending"
          : "connecting")
    ).toLowerCase();

  return {
    ...data,

    status,

    qrCode,

    phoneNumber,

    connected:
      data.connected === true ||
      status === "connected",

    alreadyConnected:
      data.alreadyConnected === true ||
      status === "already_connected",
  };
}

/* ============================================================
   SUPABASE ADMIN CLIENT
   ============================================================ */

function getAdminSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service-role configuration is missing."
    );
  }

  return createSupabaseClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* ============================================================
   FINALIZE CONNECTED BUSINESS
   ============================================================ */

/*
 * Called only after the real WhatsApp provider reports:
 *
 *     connected
 *
 * This function:
 *
 * 1. Finds the Sodah business.
 * 2. Gets the connected WhatsApp number.
 * 3. Marks the business as connected.
 * 4. Saves ai_number.
 * 5. Sends the one-time Sodah test message.
 *
 * IMPORTANT:
 *
 * The test message is sent through:
 *
 *     /session/:sessionId/send
 *
 * which uses the EXISTING Baileys session.
 *
 * No new session.
 * No new QR.
 */
async function finalizeConnectedBusiness({
  businessId,
  providerData,
}) {
  const admin =
    getAdminSupabase();

  /*
   * Number returned by the WhatsApp provider.
   */
  const providerPhone =
    normalizePhone(
      providerData?.phoneNumber ||
        providerData?.phone ||
        providerData?.number ||
        ""
    );

  /*
   * Load the Sodah business.
   */
  const {
    data: business,
    error: businessError,
  } = await admin
    .from("businesses")
    .select(
      [
        "business_id",
        "business_name",
        "ai_number",
        "whatsapp_connected",
      ].join(",")
    )
    .eq(
      "business_id",
      businessId
    )
    .maybeSingle();

  if (businessError) {
    console.error(
      "[WhatsApp Connect API] Business lookup after connection failed:",
      businessError
    );

    return {
      testMessageSent: false,

      testMessageError:
        "Unable to load the connected business.",

      businessName: null,

      phoneNumber:
        providerPhone || null,
    };
  }

  if (!business) {
    return {
      testMessageSent: false,

      testMessageError:
        "The connected business could not be found.",

      businessName: null,

      phoneNumber:
        providerPhone || null,
    };
  }

  /*
   * Prefer the number returned by Baileys/provider.
   *
   * Fall back to the existing ai_number if necessary.
   */
  const connectedPhone =
    providerPhone ||
    normalizePhone(
      business.ai_number
    );

  /*
   * ----------------------------------------------------------
   * IMPORTANT ONE-TIME LOCK
   * ----------------------------------------------------------
   *
   * The frontend polls every 1.5 seconds.
   *
   * Without this atomic update, several GET requests could
   * all see "connected" and send the test message repeatedly.
   *
   * We therefore change:
   *
   *     whatsapp_connected = false
   *
   * to:
   *
   *     whatsapp_connected = true
   *
   * in one database operation.
   *
   * Only the request that successfully claims that update
   * is allowed to send the test message.
   */
  const {
    data: claimedBusiness,
    error: claimError,
  } = await admin
    .from("businesses")
    .update({
      whatsapp_connected: true,

      ...(connectedPhone
        ? {
            ai_number:
              connectedPhone,
          }
        : {}),
    })
    .eq(
      "business_id",
      businessId
    )
    .eq(
      "whatsapp_connected",
      false
    )
    .select(
      [
        "business_id",
        "business_name",
        "ai_number",
        "whatsapp_connected",
      ].join(",")
    )
    .maybeSingle();

  if (claimError) {
    console.error(
      "[WhatsApp Connect API] Business connection update failed:",
      claimError
    );

    return {
      testMessageSent: false,

      testMessageError:
        "WhatsApp connected, but the Sodah business could not be updated.",

      businessName:
        business.business_name ||
        null,

      phoneNumber:
        connectedPhone || null,
    };
  }

  /*
   * No row was claimed.
   *
   * This means another request already changed the business
   * to connected.
   *
   * DO NOT send another test message.
   */
  if (!claimedBusiness) {
    return {
      testMessageSent: false,

      testMessageAlreadySent: true,

      businessName:
        business.business_name ||
        null,

      phoneNumber:
        connectedPhone ||
        normalizePhone(
          business.ai_number
        ) ||
        null,
    };
  }

  /*
   * We need a phone number to send the test message.
   */
  if (!connectedPhone) {
    console.error(
      "[WhatsApp Connect API] Connected but no WhatsApp number was returned."
    );

    return {
      testMessageSent: false,

      testMessageError:
        "WhatsApp connected, but the connected phone number was not returned by the provider.",

      businessName:
        claimedBusiness.business_name ||
        business.business_name ||
        null,

      phoneNumber: null,
    };
  }

  /*
   * ----------------------------------------------------------
   * SEND TEST MESSAGE
   * ----------------------------------------------------------
   *
   * Send through the existing connected Baileys session.
   *
   * The provider endpoint:
   *
   *     POST /session/:sessionId/send
   *
   * must use the existing:
   *
   *     session.socket
   *
   * and must NOT create another QR/session.
   *
   * The message is sent to the connected WhatsApp account's
   * own chat.
   */
  const sendUrl =
    `${PROVIDER_BASE_URL}/session/${encodeURIComponent(
      businessId
    )}/send`;

  console.log(
    "[WhatsApp Connect API] Sending Sodah connection test message:",
    {
      businessId,
      phoneNumber:
        connectedPhone,
    }
  );

  const sendResult =
    await providerFetch(
      sendUrl,
      {
        method: "POST",

        headers:
          providerHeaders(true),

        body: JSON.stringify({
          to: connectedPhone,

          message:
            TEST_MESSAGE,
        }),
      },

      "Connected test message"
    );

  if (!sendResult.ok) {
    console.error(
      "[WhatsApp Connect API] Test message failed:",
      {
        status:
          sendResult.status,

        data:
          sendResult.data,
      }
    );

    return {
      testMessageSent: false,

      testMessageError:
        sendResult.data?.message ||
        sendResult.data?.error ||
        `Connected, but the test message could not be sent (${sendResult.status || "provider error"}).`,

      businessName:
        claimedBusiness.business_name ||
        business.business_name ||
        null,

      phoneNumber:
        connectedPhone,
    };
  }

  /*
   * Provider may return HTTP 200 while explicitly saying
   * success=false.
   */
  if (
    sendResult.data?.success === false
  ) {
    return {
      testMessageSent: false,

      testMessageError:
        sendResult.data?.message ||
        sendResult.data?.error ||
        "Connected, but the test message was rejected by the WhatsApp provider.",

      businessName:
        claimedBusiness.business_name ||
        business.business_name ||
        null,

      phoneNumber:
        connectedPhone,
    };
  }

  console.log(
    "[WhatsApp Connect API] Business connected and test message sent:",
    {
      businessId,
      phoneNumber:
        connectedPhone,
    }
  );

  return {
    testMessageSent: true,

    testMessageAlreadySent: false,

    businessName:
      claimedBusiness.business_name ||
      business.business_name ||
      null,

    phoneNumber:
      connectedPhone,
  };
}

/* ============================================================
   RESPONSE FOR PROVIDER
   ============================================================ */

async function responseForProvider(
  businessId,
  sessionId,
  providerResult
) {
  const data =
    normalizeProviderData(
      providerResult.data
    );

  /*
   * ----------------------------------------------------------
   * BUSINESS DOES NOT EXIST
   * ----------------------------------------------------------
   */

  if (
    providerResult.status === 404 ||
    data.code ===
      "BUSINESS_NOT_FOUND" ||
    data.status ===
      "business_not_found"
  ) {
    return NextResponse.json(
      {
        success: false,

        connected: false,

        alreadyConnected: false,

        businessId,

        sessionId,

        status:
          "business_not_found",

        code:
          "BUSINESS_NOT_FOUND",

        qrCode: "",

        phoneNumber:
          data.phoneNumber,

        businessName:
          data.businessName ||
          null,

        message:
          data.message ||
          "This business does not exist in Sodah.io.",
      },
      {
        status: 404,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  /*
   * ----------------------------------------------------------
   * NUMBER ALREADY CONNECTED TO ANOTHER BUSINESS
   * ----------------------------------------------------------
   */

  if (
    data.code ===
      "WHATSAPP_NUMBER_ALREADY_CONNECTED" ||
    data.status ===
      "number_already_connected"
  ) {
    return NextResponse.json(
      {
        success: false,

        connected: false,

        alreadyConnected: false,

        businessId,

        sessionId,

        status:
          "number_already_connected",

        code:
          "WHATSAPP_NUMBER_ALREADY_CONNECTED",

        qrCode: "",

        phoneNumber:
          data.phoneNumber,

        message:
          data.message ||
          "This WhatsApp number is already connected to another Sodah.io business.",
      },
      {
        status: 409,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  /*
   * ----------------------------------------------------------
   * WHATSAPP CONNECTED
   * ----------------------------------------------------------
   *
   * This is where we now:
   *
   * 1. Update businesses.whatsapp_connected.
   * 2. Save ai_number.
   * 3. Send the test message.
   */
  if (
    data.connected === true ||
    data.alreadyConnected === true ||
    data.status ===
      "already_connected"
  ) {
    const finalized =
      await finalizeConnectedBusiness({
        businessId,

        providerData:
          data,
      });

    return NextResponse.json(
      {
        success: true,

        connected: true,

        alreadyConnected:
          data.alreadyConnected ===
            true ||
          data.status ===
            "already_connected",

        businessId,

        sessionId,

        status: "connected",

        qrCode: "",

        phoneNumber:
          finalized.phoneNumber ||
          data.phoneNumber ||
          null,

        businessName:
          finalized.businessName ||
          data.businessName ||
          null,

        testMessageSent:
          finalized.testMessageSent ===
          true,

        testMessageAlreadySent:
          finalized.testMessageAlreadySent ===
          true,

        testMessageError:
          finalized.testMessageError ||
          null,

        message:
          finalized.testMessageSent
            ? "Your business is connected to Sodah.io. The test message was sent."
            : finalized.testMessageAlreadySent
            ? "WhatsApp is connected to Sodah.io."
            : finalized.testMessageError
            ? "WhatsApp is connected, but the test message could not be sent."
            : data.message ||
              "WhatsApp is connected to Sodah.io.",
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  /*
   * ----------------------------------------------------------
   * SODAH ACTIVATION
   * ----------------------------------------------------------
   */

  if (
    data.status ===
      "connecting_to_sodah" ||
    data.status ===
      "activating_ai" ||
    data.status ===
      "activating"
  ) {
    return NextResponse.json(
      {
        success: true,

        connected: false,

        alreadyConnected: false,

        businessId,

        sessionId,

        status:
          "connecting_to_sodah",

        qrCode: "",

        phoneNumber:
          data.phoneNumber,

        businessName:
          data.businessName ||
          null,

        message:
          data.message ||
          "Connecting your business to Sodah.io AI...",
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  /*
   * ----------------------------------------------------------
   * QR CODE
   * ----------------------------------------------------------
   */

  if (data.qrCode) {
    return NextResponse.json(
      {
        success: true,

        connected: false,

        alreadyConnected: false,

        businessId,

        sessionId,

        status:
          data.status ||
          "qr_pending",

        qrCode:
          data.qrCode,

        phoneNumber:
          data.phoneNumber,

        businessName:
          data.businessName ||
          null,

        message:
          data.message ||
          "Scan this QR code with WhatsApp.",
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  /*
   * ----------------------------------------------------------
   * DEFAULT / STARTING
   * ----------------------------------------------------------
   */

  return NextResponse.json(
    {
      success:
        providerResult.ok ||
        providerResult.status ===
          202,

      connected: false,

      alreadyConnected: false,

      businessId,

      sessionId,

      status:
        data.status ||
        "connecting",

      qrCode: "",

      phoneNumber:
        data.phoneNumber,

      businessName:
        data.businessName ||
        null,

      message:
        data.message ||
        "WhatsApp is starting.",
    },
    {
      status:
        providerResult.status ===
          202
          ? 202
          : providerResult.ok
          ? 200
          : 502,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

/* ============================================================
   GET PROVIDER STATUS
   ============================================================ */

async function getProviderStatus(
  sessionId
) {
  return providerFetch(
    `${PROVIDER_BASE_URL}/session/${encodeURIComponent(
      sessionId
    )}/status`,
    {
      method: "GET",

      headers:
        providerHeaders(),
    },

    "Provider status"
  );
}

/* ============================================================
   CREATE PROVIDER SESSION
   ============================================================ */

async function createProviderSession({
  sessionId,
  businessId,
}) {
  return providerFetch(
    `${PROVIDER_BASE_URL}/session/create`,
    {
      method: "POST",

      headers:
        providerHeaders(true),

      body: JSON.stringify({
        sessionId,

        businessId,
      }),
    },

    "Provider create"
  );
}

/* ============================================================
   GET — CHECK ONLY
   ============================================================ */

export async function GET(request) {
  try {
    const url =
      new URL(request.url);

    const businessId =
      String(
        url.searchParams.get(
          "businessId"
        ) || ""
      ).trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,

          connected: false,

          status: "error",

          message:
            "Business ID is required.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const sessionId =
      businessId;

    const result =
      await getProviderStatus(
        sessionId
      );

    /*
     * --------------------------------------------------------
     * NO SESSION
     * --------------------------------------------------------
     *
     * GET NEVER creates a session.
     */
    if (
      result.status === 404
    ) {
      return NextResponse.json(
        {
          success: true,

          connected: false,

          alreadyConnected: false,

          businessId,

          sessionId,

          status: "not_found",

          qrCode: "",

          message:
            "No WhatsApp session exists yet.",
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    return await responseForProvider(
      businessId,

      sessionId,

      result
    );
  } catch (error) {
    console.error(
      "[WhatsApp Connect API] GET failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        connected: false,

        status: "error",

        message:
          error instanceof Error
            ? error.message
            : "Unable to check WhatsApp connection.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}

/* ============================================================
   POST — CREATE / REUSE
   ============================================================ */

export async function POST(request) {
  try {
    const body =
      await request
        .json()
        .catch(() => ({}));

    const businessId =
      String(
        body?.businessId ||
          body?.business_id ||
          ""
      ).trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,

          connected: false,

          status: "error",

          message:
            "Business ID is required.",
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const sessionId =
      businessId;

    /*
     * --------------------------------------------------------
     * CHECK CURRENT SESSION FIRST
     * --------------------------------------------------------
     *
     * This prevents another QR from being generated if the
     * session is already connected or already has a QR.
     */
    const current =
      await getProviderStatus(
        sessionId
      );

    if (
      current.ok
    ) {
      const currentData =
        normalizeProviderData(
          current.data
        );

      /*
       * Already connected.
       */
      if (
        currentData.connected ||
        currentData.alreadyConnected ||
        currentData.status ===
          "already_connected"
      ) {
        return await responseForProvider(
          businessId,

          sessionId,

          current
        );
      }

      /*
       * Existing QR.
       */
      if (
        currentData.qrCode
      ) {
        return await responseForProvider(
          businessId,

          sessionId,

          current
        );
      }

      /*
       * Existing session is starting.
       */
      if (
        currentData.status ===
          "connecting_to_sodah" ||
        currentData.status ===
          "activating_ai" ||
        currentData.status ===
          "connecting" ||
        currentData.status ===
          "reconnecting"
      ) {
        return await responseForProvider(
          businessId,

          sessionId,

          current
        );
      }
    }

    /*
     * --------------------------------------------------------
     * CREATE / REUSE SESSION
     * --------------------------------------------------------
     *
     * The real WhatsApp provider is responsible for:
     *
     * - validating the business
     * - checking whether the number is already connected
     * - creating the Baileys session
     * - generating QR when needed
     */
    const created =
      await createProviderSession({
        sessionId,

        businessId,
      });

    return await responseForProvider(
      businessId,

      sessionId,

      created
    );
  } catch (error) {
    console.error(
      "[WhatsApp Connect API] POST failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        connected: false,

        status: "error",

        message:
          error instanceof Error
            ? error.message
            : "Unable to start WhatsApp connection.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}

/* ============================================================
   OPTIONS
   ============================================================ */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,

    headers: {
      Allow:
        "GET, POST, OPTIONS",

      "Cache-Control":
        "no-store",
    },
  });
}