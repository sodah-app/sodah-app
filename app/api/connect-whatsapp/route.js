import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QR_PROVIDER_URL =
  process.env.WHATSAPP_QR_PROVIDER_URL ||
  "https://sodah-whatsapp-qr-provider.onrender.com";

const QR_PROVIDER_API_KEY =
  process.env.WHATSAPP_QR_PROVIDER_API_KEY ||
  process.env.PROVIDER_API_KEY ||
  "";

const PROVIDER_TIMEOUT = 20000;
const QR_WAIT_ATTEMPTS = 20;
const QR_WAIT_INTERVAL = 1000;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function providerHeaders() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  /*
   * Your current QR provider does not require an API key.
   * We only send one if you have configured it in Render/Vercel.
   */
  if (QR_PROVIDER_API_KEY) {
    headers.Authorization = `Bearer ${QR_PROVIDER_API_KEY}`;
    headers["X-API-Key"] = QR_PROVIDER_API_KEY;
  }

  return headers;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, PROVIDER_TIMEOUT);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readProviderResponse(response) {
  const contentType =
    response.headers.get("content-type") || "";

  const rawText = await response.text();

  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    contentType,
    rawText,
    data,
  };
}

function normalizeSessionId(value) {
  if (!value) return "";

  return String(value).trim();
}

/*
|--------------------------------------------------------------------------
| GET PROVIDER SESSION STATUS
|--------------------------------------------------------------------------
|
| Actual provider endpoint:
|
| GET /session/:sessionId
|
|--------------------------------------------------------------------------
*/

async function getSessionStatus(sessionId) {
  const url =
    `${QR_PROVIDER_URL}/session/` +
    encodeURIComponent(sessionId);

  console.log(
    "[WhatsApp Connect API] Checking provider session:",
    url
  );

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: providerHeaders(),
  });

  const result = await readProviderResponse(response);

  console.log(
    "[WhatsApp Connect API] Session status HTTP:",
    result.status
  );

  console.log(
    "[WhatsApp Connect API] Session status response:",
    result.rawText
  );

  return result;
}

/*
|--------------------------------------------------------------------------
| GET PROVIDER QR
|--------------------------------------------------------------------------
|
| Actual provider endpoint:
|
| GET /qr/:sessionId
|
|--------------------------------------------------------------------------
*/

async function getSessionQR(sessionId) {
  const url =
    `${QR_PROVIDER_URL}/qr/` +
    encodeURIComponent(sessionId);

  console.log(
    "[WhatsApp Connect API] Checking provider QR:",
    url
  );

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: providerHeaders(),
  });

  const result = await readProviderResponse(response);

  console.log(
    "[WhatsApp Connect API] QR HTTP:",
    result.status
  );

  console.log(
    "[WhatsApp Connect API] QR response:",
    result.rawText
  );

  return result;
}

/*
|--------------------------------------------------------------------------
| CREATE PROVIDER SESSION
|--------------------------------------------------------------------------
|
| Actual provider endpoint:
|
| POST /session
|
| Body:
| {
|   sessionId: "BIZ-..."
| }
|
|--------------------------------------------------------------------------
*/

async function createSession(sessionId) {
  const url = `${QR_PROVIDER_URL}/session`;

  console.log(
    "[WhatsApp Connect API] Creating provider session:",
    url
  );

  console.log(
    "[WhatsApp Connect API] Session ID:",
    sessionId
  );

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: providerHeaders(),
    body: JSON.stringify({
      sessionId,
    }),
  });

  const result = await readProviderResponse(response);

  console.log(
    "[WhatsApp Connect API] Provider /session HTTP:",
    result.status
  );

  console.log(
    "[WhatsApp Connect API] Provider /session response:",
    result.rawText
  );

  return result;
}

/*
|--------------------------------------------------------------------------
| FIND QR
|--------------------------------------------------------------------------
*/

function extractQR(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  return (
    data.qrCode ||
    data.qr ||
    data.qrDataUrl ||
    data.qr_data_url ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| WAIT FOR QR
|--------------------------------------------------------------------------
|
| The provider creates the Baileys session asynchronously.
| Therefore POST /session can return before the QR is generated.
|
|--------------------------------------------------------------------------
*/

async function waitForQR(sessionId) {
  for (let attempt = 1; attempt <= QR_WAIT_ATTEMPTS; attempt++) {
    console.log(
      `[WhatsApp Connect API] Waiting for QR ${attempt}/${QR_WAIT_ATTEMPTS}`
    );

    /*
     * First check session status.
     */
    let statusResult;

    try {
      statusResult = await getSessionStatus(sessionId);
    } catch (error) {
      console.error(
        "[WhatsApp Connect API] Status request failed:",
        error
      );
    }

    const statusData = statusResult?.data;

    const providerStatus =
      statusData?.status || "unknown";

    /*
     * If already connected, there is no QR to show.
     */
    if (
      providerStatus === "connected"
    ) {
      return {
        success: true,
        connected: true,
        status: "connected",
        sessionId,
        qrCode: null,
        phone: statusData?.phone || null,
      };
    }

    /*
     * Now ask the actual provider QR endpoint.
     */
    try {
      const qrResult = await getSessionQR(sessionId);

      if (qrResult.ok && qrResult.data) {
        const qr = extractQR(qrResult.data);

        if (qr) {
          console.log(
            "[WhatsApp Connect API] QR successfully received."
          );

          return {
            success: true,
            connected: false,
            status:
              qrResult.data.status ||
              providerStatus ||
              "qr",
            sessionId,
            qrCode: qr,
            qr: qr,
            phone:
              qrResult.data.phone ||
              statusData?.phone ||
              null,
          };
        }

        /*
         * The provider may tell us that the session exists
         * but the QR has not been generated yet.
         */
        if (
          qrResult.data.status === "connected"
        ) {
          return {
            success: true,
            connected: true,
            status: "connected",
            sessionId,
            qrCode: null,
            phone:
              qrResult.data.phone ||
              statusData?.phone ||
              null,
          };
        }
      }
    } catch (error) {
      console.error(
        "[WhatsApp Connect API] QR request failed:",
        error
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, QR_WAIT_INTERVAL)
    );
  }

  return {
    success: false,
    connected: false,
    status: "timeout",
    sessionId,
    qrCode: null,
    error:
      "WhatsApp provider created the session but no QR code became available.",
  };
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| GET does NOT create a new session.
|
| It checks the existing business session and returns:
|
| - connected
| - QR
| - connecting
| - not_found
|
|--------------------------------------------------------------------------
*/

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const businessId = normalizeSessionId(
    searchParams.get("businessId") ||
    searchParams.get("sessionId") ||
    searchParams.get("session_id")
  );

  console.log(
    "[WhatsApp Connect API] GET request:",
    businessId
  );

  if (!businessId) {
    return NextResponse.json(
      {
        success: false,
        error: "businessId is required",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    /*
     * Check whether the existing provider session exists.
     */
    const statusResult =
      await getSessionStatus(businessId);

    /*
     * Provider says session does not exist.
     */
    if (
      statusResult.status === 404 ||
      statusResult.data?.status === "not_found"
    ) {
      return NextResponse.json(
        {
          success: true,
          connected: false,
          status: "not_found",
          sessionId: businessId,
          businessId,
          qrCode: null,
          qr: null,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!statusResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            statusResult.data?.error ||
            `WhatsApp provider returned HTTP ${statusResult.status}`,
          providerStatus: statusResult.status,
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const statusData = statusResult.data || {};

    /*
     * Already connected.
     */
    if (statusData.status === "connected") {
      return NextResponse.json(
        {
          success: true,
          connected: true,
          status: "connected",
          sessionId: businessId,
          businessId,
          qrCode: null,
          qr: null,
          phone: statusData.phone || null,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * Session exists. Retrieve its current QR.
     */
    const qrResult =
      await getSessionQR(businessId);

    if (qrResult.ok && qrResult.data) {
      const qr = extractQR(qrResult.data);

      if (qr) {
        return NextResponse.json(
          {
            success: true,
            connected: false,
            status:
              qrResult.data.status ||
              statusData.status ||
              "qr",
            sessionId: businessId,
            businessId,
            qrCode: qr,
            qr: qr,
            phone:
              qrResult.data.phone ||
              statusData.phone ||
              null,
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );
      }
    }

    /*
     * Session exists but QR isn't ready yet.
     */
    return NextResponse.json(
      {
        success: true,
        connected: false,
        status:
          statusData.status ||
          "connecting",
        sessionId: businessId,
        businessId,
        qrCode: null,
        qr: null,
        phone: statusData.phone || null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[WhatsApp Connect API] GET fatal error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.name === "AbortError"
            ? "WhatsApp provider request timed out."
            : error.message ||
              "Unable to contact WhatsApp provider.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| POST:
|
| 1. Checks existing session.
| 2. If it exists, reuses it.
| 3. If it does not exist, creates it.
| 4. Waits for the QR.
|
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const businessId = normalizeSessionId(
      body?.businessId ||
      body?.sessionId ||
      body?.session_id
    );

    console.log(
      "[WhatsApp Connect API] POST request:",
      businessId
    );

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "businessId is required",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * STEP 1
     *
     * Check if the session already exists.
     *
     * This is important because we do NOT want to create
     * another WhatsApp session every time the page loads.
     */
    let existingSession = null;

    try {
      existingSession =
        await getSessionStatus(businessId);
    } catch (error) {
      console.error(
        "[WhatsApp Connect API] Existing session check failed:",
        error
      );
    }

    /*
     * Existing session found.
     */
    if (
      existingSession?.ok &&
      existingSession?.data &&
      existingSession.data.status !== "not_found"
    ) {
      console.log(
        "[WhatsApp Connect API] Existing session found. Reusing it."
      );

      /*
       * If already connected, return immediately.
       */
      if (
        existingSession.data.status === "connected"
      ) {
        return NextResponse.json(
          {
            success: true,
            connected: true,
            status: "connected",
            sessionId: businessId,
            businessId,
            qrCode: null,
            qr: null,
            phone:
              existingSession.data.phone ||
              null,
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );
      }

      /*
       * Existing session is not connected.
       *
       * Try to retrieve its existing QR first.
       */
      const existingQR =
        await getSessionQR(businessId);

      if (
        existingQR.ok &&
        existingQR.data
      ) {
        const qr =
          extractQR(existingQR.data);

        if (qr) {
          return NextResponse.json(
            {
              success: true,
              connected: false,
              status:
                existingQR.data.status ||
                existingSession.data.status ||
                "qr",
              sessionId: businessId,
              businessId,
              qrCode: qr,
              qr: qr,
              phone:
                existingQR.data.phone ||
                existingSession.data.phone ||
                null,
            },
            {
              status: 200,
              headers: {
                "Cache-Control": "no-store",
              },
            }
          );
        }
      }

      /*
       * Existing session is still starting.
       * Wait for its QR.
       */
      const existingQRResult =
        await waitForQR(businessId);

      return NextResponse.json(
        {
          ...existingQRResult,
          businessId,
        },
        {
          status: existingQRResult.success
            ? 200
            : 504,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * STEP 2
     *
     * No existing session.
     *
     * Create one using the ACTUAL provider endpoint:
     *
     * POST /session
     */
    const createResult =
      await createSession(businessId);

    if (!createResult.ok) {
      console.error(
        "[WhatsApp Connect API] Provider session creation failed."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            createResult.data?.error ||
            `WhatsApp provider returned HTTP ${createResult.status}`,
          providerStatus:
            createResult.status,
          providerResponse:
            createResult.rawText,
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * Provider may already have QR in the creation response.
     */
    const immediateQR =
      extractQR(createResult.data);

    if (immediateQR) {
      return NextResponse.json(
        {
          success: true,
          connected:
            createResult.data?.status ===
            "connected",
          status:
            createResult.data?.status ||
            "qr",
          sessionId: businessId,
          businessId,
          qrCode: immediateQR,
          qr: immediateQR,
          phone:
            createResult.data?.phone ||
            null,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * Provider session created successfully,
     * but QR generation happens asynchronously.
     */
    const qrResult =
      await waitForQR(businessId);

    return NextResponse.json(
      {
        ...qrResult,
        businessId,
      },
      {
        status: qrResult.success
          ? 200
          : 504,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[WhatsApp Connect API] POST fatal error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.name === "AbortError"
            ? "WhatsApp provider request timed out."
            : error.message ||
              "Unable to connect to WhatsApp provider.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| OPTIONS
|--------------------------------------------------------------------------
*/

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}