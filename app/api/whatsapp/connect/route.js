import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| SODAH WHATSAPP CONNECT API
|--------------------------------------------------------------------------
|
| Frontend endpoint:
|
|   /api/whatsapp/connect?businessId=YOUR_BUSINESS_ID
|
| This route:
|
|   1. Creates/gets the WhatsApp provider session
|   2. Checks whether WhatsApp is already connected
|   3. Retrieves the QR code
|   4. Waits for QR generation when necessary
|   5. Returns a clean JSON response to the frontend
|
|--------------------------------------------------------------------------
*/

const QR_PROVIDER_URL =
  process.env.WHATSAPP_QR_PROVIDER_URL ||
  "http://localhost:3001";

const QR_PROVIDER_API_KEY =
  process.env.WHATSAPP_QR_PROVIDER_API_KEY ||
  "sodah-local-test-key-2026";

const WAIT_BETWEEN_CHECKS_MS = 1000;
const MAX_QR_CHECKS = 15;

/*
|--------------------------------------------------------------------------
| Provider headers
|--------------------------------------------------------------------------
*/

function providerHeaders(includeJson = false) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${QR_PROVIDER_API_KEY}`,
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

/*
|--------------------------------------------------------------------------
| Safe provider response parser
|--------------------------------------------------------------------------
*/

async function readProviderResponse(response, label) {
  const contentType =
    response.headers.get("content-type") || "";

  const rawText = await response.text();

  console.log(
    `[Sodah WhatsApp] ${label} HTTP:`,
    response.status
  );

  console.log(
    `[Sodah WhatsApp] ${label} content-type:`,
    contentType
  );

  console.log(
    `[Sodah WhatsApp] ${label} response:`,
    rawText.substring(0, 2000)
  );

  let data = {};

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch (error) {
      if (!response.ok) {
        throw new Error(
          `${label} returned HTTP ${response.status}: ${rawText.substring(
            0,
            500
          )}`
        );
      }

      throw new Error(
        `${label} returned invalid JSON.`
      );
    }
  }

  if (!response.ok) {
    const providerMessage =
      data?.error ||
      data?.message ||
      data?.details ||
      "";

    throw new Error(
      providerMessage ||
        `${label} returned HTTP ${response.status}.`
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Standard connected response
|--------------------------------------------------------------------------
*/

function connectedResponse({
  businessId,
  sessionId,
  data = {},
}) {
  return NextResponse.json(
    {
      success: true,
      connected: true,
      alreadyConnected: true,

      businessId,
      sessionId,

      status:
        data.status ||
        "connected",

      phoneNumber:
        data.phoneNumber ||
        data.phone ||
        null,

      qrCode: "",

      message:
        data.message ||
        "WhatsApp is already connected.",
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
|--------------------------------------------------------------------------
| Standard QR response
|--------------------------------------------------------------------------
*/

function qrResponse({
  businessId,
  sessionId,
  data = {},
}) {
  return NextResponse.json(
    {
      success: true,
      connected: false,

      businessId,
      sessionId,

      status:
        data.status ||
        "qr_ready",

      qrCode:
        data.qrCode ||
        data.qr ||
        "",

      phoneNumber:
        data.phoneNumber ||
        data.phone ||
        null,

      message:
        data.message ||
        "Scan this QR code with WhatsApp.",
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
|--------------------------------------------------------------------------
| Standard pending response
|--------------------------------------------------------------------------
*/

function pendingResponse({
  businessId,
  sessionId,
  data = {},
}) {
  return NextResponse.json(
    {
      success: false,
      connected: false,

      businessId,
      sessionId,

      status:
        data.status ||
        "qr_pending",

      qrCode: "",

      phoneNumber:
        data.phoneNumber ||
        data.phone ||
        null,

      message:
        data.message ||
        "WhatsApp QR code is still being generated.",
    },
    {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| We intentionally support GET as well.
|
| This prevents a frontend GET request from producing HTTP 405.
|
|--------------------------------------------------------------------------
*/

export async function GET(request) {
  return connectWhatsApp(request);
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  return connectWhatsApp(request);
}

/*
|--------------------------------------------------------------------------
| OPTIONS
|--------------------------------------------------------------------------
|
| Browser/preflight support.
|
|--------------------------------------------------------------------------
*/

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,

    headers: {
      Allow: "GET, POST, OPTIONS",

      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type, Authorization",

      "Access-Control-Allow-Origin":
        "*",
    },
  });
}

/*
|--------------------------------------------------------------------------
| MAIN CONNECT FUNCTION
|--------------------------------------------------------------------------
*/

async function connectWhatsApp(request) {
  try {
    /*
    |--------------------------------------------------------------------------
    | Read business ID
    |--------------------------------------------------------------------------
    */

    const url = new URL(request.url);

    const businessId =
      url.searchParams.get("businessId");

    console.log(
      "=================================================="
    );

    console.log(
      "[Sodah WhatsApp] CONNECT REQUEST"
    );

    console.log(
      "[Sodah WhatsApp] Method:",
      request.method
    );

    console.log(
      "[Sodah WhatsApp] Business ID:",
      businessId
    );

    console.log(
      "[Sodah WhatsApp] Provider:",
      QR_PROVIDER_URL
    );

    console.log(
      "=================================================="
    );

    /*
    |--------------------------------------------------------------------------
    | Validate business ID
    |--------------------------------------------------------------------------
    */

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          error: "Business ID is required.",
          message: "Business ID is required.",
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
    |--------------------------------------------------------------------------
    | Session ID
    |--------------------------------------------------------------------------
    |
    | One WhatsApp session per Sodah business.
    |
    */

    const sessionId = businessId;

    /*
    |--------------------------------------------------------------------------
    | STEP 1
    |
    | CREATE / GET SESSION
    |--------------------------------------------------------------------------
    */

    const createUrl =
      `${QR_PROVIDER_URL.replace(/\/+$/, "")}/session/create`;

    console.log(
      "[Sodah WhatsApp] Creating session:"
    );

    console.log(
      createUrl
    );

    const createResponse =
      await fetch(createUrl, {
        method: "POST",

        headers:
          providerHeaders(true),

        body: JSON.stringify({
          sessionId,
          businessId,
        }),

        cache: "no-store",
      });

    const createData =
      await readProviderResponse(
        createResponse,
        "Provider session/create"
      );

    console.log(
      "[Sodah WhatsApp] Session result:",
      {
        httpStatus:
          createResponse.status,

        status:
          createData.status,

        connected:
          createData.connected,

        hasQr:
          !!(
            createData.qrCode ||
            createData.qr
          ),
      }
    );

    /*
    |--------------------------------------------------------------------------
    | STEP 2
    |
    | PROVIDER APPLICATION ERROR
    |--------------------------------------------------------------------------
    */

    if (
      createData.success === false &&
      createData.connected !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          connected: false,

          businessId,
          sessionId,

          status:
            createData.status ||
            "error",

          message:
            createData.message ||
            createData.error ||
            "Unable to create WhatsApp session.",
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
    |--------------------------------------------------------------------------
    | STEP 3
    |
    | ALREADY CONNECTED
    |--------------------------------------------------------------------------
    */

    if (
      createData.connected === true ||
      createData.status === "connected"
    ) {
      console.log(
        "[Sodah WhatsApp] WhatsApp already connected."
      );

      return connectedResponse({
        businessId,
        sessionId,
        data: createData,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 4
    |
    | CREATE ENDPOINT ALREADY RETURNED QR
    |--------------------------------------------------------------------------
    */

    const directQr =
      createData.qrCode ||
      createData.qr ||
      "";

    if (
      typeof directQr === "string" &&
      directQr.trim()
    ) {
      console.log(
        "[Sodah WhatsApp] QR returned directly from session/create."
      );

      return qrResponse({
        businessId,
        sessionId,
        data: {
          ...createData,
          qrCode: directQr,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 5
    |
    | WAIT FOR PROVIDER TO GENERATE QR
    |--------------------------------------------------------------------------
    */

    let lastProviderData = {
      status:
        createData.status ||
        "starting",

      message:
        createData.message ||
        "Starting WhatsApp session.",
    };

    for (
      let attempt = 1;
      attempt <= MAX_QR_CHECKS;
      attempt++
    ) {
      console.log(
        `[Sodah WhatsApp] QR check ${attempt}/${MAX_QR_CHECKS}`
      );

      /*
      |--------------------------------------------------------------------------
      | Wait
      |--------------------------------------------------------------------------
      */

      await new Promise((resolve) => {
        setTimeout(
          resolve,
          WAIT_BETWEEN_CHECKS_MS
        );
      });

      /*
      |--------------------------------------------------------------------------
      | STEP 5A
      |
      | Check session status
      |--------------------------------------------------------------------------
      */

      const statusUrl =
        `${QR_PROVIDER_URL.replace(/\/+$/, "")}/session/${encodeURIComponent(
          sessionId
        )}/status`;

      console.log(
        "[Sodah WhatsApp] Checking status:",
        statusUrl
      );

      const statusResponse =
        await fetch(statusUrl, {
          method: "GET",

          headers:
            providerHeaders(),

          cache: "no-store",
        });

      /*
      |--------------------------------------------------------------------------
      | Status endpoint may temporarily return 404 while the provider
      | is initializing. Do NOT immediately destroy the connection flow.
      |--------------------------------------------------------------------------
      */

      if (
        statusResponse.status === 404
      ) {
        console.warn(
          "[Sodah WhatsApp] Provider status endpoint returned 404. Continuing."
        );

        lastProviderData = {
          status: "starting",
          message:
            "WhatsApp session is still starting.",
        };
      } else {
        const statusData =
          await readProviderResponse(
            statusResponse,
            "Provider session/status"
          );

        console.log(
          "[Sodah WhatsApp] Status result:",
          {
            httpStatus:
              statusResponse.status,

            status:
              statusData.status,

            connected:
              statusData.connected,

            hasQr:
              !!(
                statusData.qrCode ||
                statusData.qr
              ),
          }
        );

        /*
        |--------------------------------------------------------------------------
        | Connected
        |--------------------------------------------------------------------------
        */

        if (
          statusData.connected === true ||
          statusData.status === "connected"
        ) {
          return connectedResponse({
            businessId,
            sessionId,
            data: statusData,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | QR available from status endpoint
        |--------------------------------------------------------------------------
        */

        const statusQr =
          statusData.qrCode ||
          statusData.qr ||
          "";

        if (
          typeof statusQr === "string" &&
          statusQr.trim()
        ) {
          console.log(
            "[Sodah WhatsApp] QR received from status endpoint."
          );

          return qrResponse({
            businessId,
            sessionId,
            data: {
              ...statusData,
              qrCode: statusQr,
            },
          });
        }

        lastProviderData =
          statusData;
      }

      /*
      |--------------------------------------------------------------------------
      | STEP 5B
      |
      | Ask dedicated QR endpoint
      |--------------------------------------------------------------------------
      */

      const qrUrl =
        `${QR_PROVIDER_URL.replace(/\/+$/, "")}/session/${encodeURIComponent(
          sessionId
        )}/qr`;

      console.log(
        "[Sodah WhatsApp] Checking QR:",
        qrUrl
      );

      const qrProviderResponse =
        await fetch(qrUrl, {
          method: "GET",

          headers:
            providerHeaders(),

          cache: "no-store",
        });

      /*
      |--------------------------------------------------------------------------
      | QR endpoint can return 404 while QR has not been generated yet.
      |--------------------------------------------------------------------------
      */

      if (
        qrProviderResponse.status === 404
      ) {
        console.warn(
          "[Sodah WhatsApp] QR endpoint returned 404. QR may not be ready yet."
        );

        lastProviderData = {
          ...lastProviderData,

          status:
            lastProviderData.status ||
            "qr_pending",

          message:
            "Waiting for WhatsApp QR code.",
        };

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | Parse QR response
      |--------------------------------------------------------------------------
      */

      const qrData =
        await readProviderResponse(
          qrProviderResponse,
          "Provider session/qr"
        );

      console.log(
        "[Sodah WhatsApp] QR result:",
        {
          httpStatus:
            qrProviderResponse.status,

          status:
            qrData.status,

          connected:
            qrData.connected,

          hasQr:
            !!(
              qrData.qrCode ||
              qrData.qr
            ),
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Connected
      |--------------------------------------------------------------------------
      */

      if (
        qrData.connected === true ||
        qrData.status === "connected"
      ) {
        return connectedResponse({
          businessId,
          sessionId,
          data: qrData,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | QR available
      |--------------------------------------------------------------------------
      */

      const qr =
        qrData.qrCode ||
        qrData.qr ||
        "";

      if (
        typeof qr === "string" &&
        qr.trim()
      ) {
        console.log(
          "[Sodah WhatsApp] SUCCESS - QR CODE READY."
        );

        return qrResponse({
          businessId,
          sessionId,
          data: {
            ...qrData,
            qrCode: qr,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Still waiting
      |--------------------------------------------------------------------------
      */

      lastProviderData =
        qrData;
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 6
    |
    | QR STILL NOT READY
    |--------------------------------------------------------------------------
    */

    console.warn(
      "[Sodah WhatsApp] QR not ready after polling:",
      lastProviderData
    );

    return pendingResponse({
      businessId,
      sessionId,
      data: lastProviderData,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | FINAL ERROR HANDLER
    |--------------------------------------------------------------------------
    */

    console.error(
      "=================================================="
    );

    console.error(
      "[Sodah WhatsApp] CONNECT ERROR"
    );

    console.error(
      error
    );

    console.error(
      "=================================================="
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to connect to WhatsApp.",

        message:
          error instanceof Error
            ? error.message
            : "Unable to connect to WhatsApp.",
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