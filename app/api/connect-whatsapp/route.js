import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| SODAH WHATSAPP QR PROVIDER
|--------------------------------------------------------------------------
|
| This API route is ONLY a secure bridge between the Sodah frontend
| and the already deployed WhatsApp QR provider.
|
| Frontend
|    ↓
| /api/connect-whatsapp
|    ↓
| sodah-whatsapp-qr-provider.onrender.com
|
|--------------------------------------------------------------------------
*/

const QR_PROVIDER_URL =
  "https://sodah-whatsapp-qr-provider.onrender.com";

/*
|--------------------------------------------------------------------------
| API KEY
|--------------------------------------------------------------------------
|
| Supports either variable name so the deployment does not break if
| the existing environment uses one of these names.
|
*/

const QR_PROVIDER_API_KEY =
  process.env.WHATSAPP_QR_PROVIDER_API_KEY ||
  process.env.PROVIDER_API_KEY ||
  "";

/*
|--------------------------------------------------------------------------
| PROVIDER BASE URL
|--------------------------------------------------------------------------
*/

const PROVIDER_BASE_URL =
  QR_PROVIDER_URL.replace(/\/+$/, "");

/*
|--------------------------------------------------------------------------
| PROVIDER HEADERS
|--------------------------------------------------------------------------
*/

function providerHeaders(includeJson = false) {
  const headers = {
    Accept: "application/json",
  };

  if (QR_PROVIDER_API_KEY) {
    headers.Authorization =
      `Bearer ${QR_PROVIDER_API_KEY}`;
  }

  if (includeJson) {
    headers["Content-Type"] =
      "application/json";
  }

  return headers;
}

/*
|--------------------------------------------------------------------------
| PROVIDER REQUEST
|--------------------------------------------------------------------------
*/

async function providerRequest(
  url,
  options = {},
  label = "Provider request"
) {
  console.log(
    `[WhatsApp Connect API] ${label}`
  );

  console.log(
    `[WhatsApp Connect API] URL:`,
    url
  );

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
    });

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    const rawText =
      await response.text();

    console.log(
      `[WhatsApp Connect API] ${label} HTTP:`,
      response.status
    );

    console.log(
      `[WhatsApp Connect API] ${label} content-type:`,
      contentType
    );

    console.log(
      `[WhatsApp Connect API] ${label} response:`,
      rawText.substring(0, 3000)
    );

    let data = {};

    if (rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch {
        /*
         * Some providers may return a raw string.
         */
        data = {
          raw: rawText,
        };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      rawText,
      contentType,
    };
  } catch (error) {
    console.error(
      `[WhatsApp Connect API] ${label} NETWORK ERROR:`,
      error
    );

    return {
      ok: false,
      status: 0,
      data: {},
      rawText: "",
      contentType: "",
      error,
    };
  }
}

/*
|--------------------------------------------------------------------------
| NORMALIZE PROVIDER DATA
|--------------------------------------------------------------------------
*/

function normalizeProviderData(
  data = {}
) {
  let qrCode = "";

  /*
   * Normal QR property
   */
  if (
    typeof data.qrCode === "string" &&
    data.qrCode.trim()
  ) {
    qrCode =
      data.qrCode.trim();
  }

  /*
   * Legacy QR property
   */
  if (
    !qrCode &&
    typeof data.qr === "string" &&
    data.qr.trim()
  ) {
    qrCode =
      data.qr.trim();
  }

  /*
   * Raw provider response
   */
  if (
    !qrCode &&
    typeof data.raw === "string" &&
    data.raw.trim()
  ) {
    const raw =
      data.raw.trim();

    if (
      raw.startsWith("data:image/") ||
      raw.startsWith("http://") ||
      raw.startsWith("https://")
    ) {
      qrCode = raw;
    }
  }

  let status =
    data.status ||
    data.state ||
    "";

  if (
    status === "qr"
  ) {
    status =
      "qr_pending";
  }

  if (
    !status &&
    qrCode
  ) {
    status =
      "qr_pending";
  }

  if (!status) {
    status =
      "connecting";
  }

  const connected =
    data.connected === true ||
    status === "connected";

  const phoneNumber =
    data.phoneNumber ||
    data.phone ||
    data.number ||
    null;

  return {
    ...data,
    qrCode,
    status,
    connected,
    phoneNumber,
  };
}

/*
|--------------------------------------------------------------------------
| FRONTEND RESPONSE
|--------------------------------------------------------------------------
*/

function frontendResponse({
  businessId,
  sessionId,
  data,
}) {
  const normalized =
    normalizeProviderData(
      data
    );

  if (
    normalized.connected
  ) {
    return NextResponse.json(
      {
        success: true,
        connected: true,
        alreadyConnected: true,
        businessId,
        sessionId,
        status: "connected",
        phoneNumber:
          normalized.phoneNumber,
        qrCode: "",
        message:
          normalized.message ||
          "WhatsApp is already connected.",
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

  return NextResponse.json(
    {
      success: true,
      connected: false,
      alreadyConnected: false,
      businessId,
      sessionId,
      status:
        normalized.status ||
        "qr_pending",
      qrCode:
        normalized.qrCode ||
        "",
      phoneNumber:
        normalized.phoneNumber,
      message:
        normalized.qrCode
          ? "Scan this QR code with WhatsApp."
          : normalized.message ||
            "Waiting for WhatsApp QR code.",
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
|--------------------------------------------------------------------------
| GET EXISTING SESSION
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| GET DOES NOT CREATE A NEW SESSION.
|
| It checks the existing WhatsApp session and retrieves the existing
| QR code if one already exists.
|
|--------------------------------------------------------------------------
*/

async function getExistingSession(
  businessId
) {
  const sessionId =
    String(businessId).trim();

  /*
   * ---------------------------------------------------------------
   * FIRST: STATUS
   * ---------------------------------------------------------------
   */

  const statusUrl =
    `${PROVIDER_BASE_URL}/session/${encodeURIComponent(
      sessionId
    )}/status`;

  const statusResult =
    await providerRequest(
      statusUrl,
      {
        method: "GET",
        headers:
          providerHeaders(),
      },
      "Existing session status"
    );

  /*
   * ---------------------------------------------------------------
   * NETWORK FAILURE
   * ---------------------------------------------------------------
   */

  if (
    statusResult.status === 0
  ) {
    return {
      type: "error",
      status: 503,
      message:
        "Unable to reach the WhatsApp QR provider.",
    };
  }

  /*
   * ---------------------------------------------------------------
   * CONNECTED
   * ---------------------------------------------------------------
   */

  const statusData =
    normalizeProviderData(
      statusResult.data
    );

  if (
    statusData.connected
  ) {
    return {
      type: "success",
      data: statusData,
    };
  }

  /*
   * ---------------------------------------------------------------
   * QR ALREADY IN STATUS
   * ---------------------------------------------------------------
   */

  if (
    statusData.qrCode
  ) {
    return {
      type: "success",
      data: statusData,
    };
  }

  /*
   * ---------------------------------------------------------------
   * NOW ASK PROVIDER DIRECTLY FOR EXISTING QR
   * ---------------------------------------------------------------
   */

  const qrUrl =
    `${PROVIDER_BASE_URL}/session/${encodeURIComponent(
      sessionId
    )}/qr`;

  const qrResult =
    await providerRequest(
      qrUrl,
      {
        method: "GET",
        headers:
          providerHeaders(),
      },
      "Existing session QR"
    );

  /*
   * ---------------------------------------------------------------
   * NETWORK FAILURE
   * ---------------------------------------------------------------
   */

  if (
    qrResult.status === 0
  ) {
    return {
      type: "error",
      status: 503,
      message:
        "Unable to reach the WhatsApp QR provider.",
    };
  }

  /*
   * ---------------------------------------------------------------
   * QR FOUND
   * ---------------------------------------------------------------
   */

  const qrData =
    normalizeProviderData(
      qrResult.data
    );

  if (
    qrData.connected
  ) {
    return {
      type: "success",
      data: qrData,
    };
  }

  if (
    qrData.qrCode
  ) {
    return {
      type: "success",
      data: qrData,
    };
  }

  /*
   * ---------------------------------------------------------------
   * SESSION DOES NOT EXIST / QR NOT READY
   * ---------------------------------------------------------------
   */

  return {
    type: "missing",
  };
}

/*
|--------------------------------------------------------------------------
| CREATE NEW SESSION
|--------------------------------------------------------------------------
*/

async function createNewSession(
  businessId
) {
  const sessionId =
    String(businessId).trim();

  const createUrl =
    `${PROVIDER_BASE_URL}/session/create`;

  const result =
    await providerRequest(
      createUrl,
      {
        method: "POST",
        headers:
          providerHeaders(true),
        body: JSON.stringify({
          sessionId,
          businessId,
        }),
      },
      "Create WhatsApp session"
    );

  /*
   * ---------------------------------------------------------------
   * NETWORK ERROR
   * ---------------------------------------------------------------
   */

  if (
    result.status === 0
  ) {
    return {
      type: "error",
      status: 503,
      message:
        "Unable to reach the WhatsApp QR provider.",
    };
  }

  /*
   * ---------------------------------------------------------------
   * PROVIDER ERROR
   * ---------------------------------------------------------------
   */

  if (!result.ok) {
    const providerData =
      normalizeProviderData(
        result.data
      );

    console.error(
      "[WhatsApp Connect API] Provider create failed:",
      {
        status:
          result.status,
        data:
          result.data,
        raw:
          result.rawText,
      }
    );

    return {
      type: "error",
      status: 502,
      message:
        providerData.message ||
        providerData.error ||
        `WhatsApp provider returned HTTP ${result.status}.`,
      providerStatus:
        result.status,
    };
  }

  /*
   * ---------------------------------------------------------------
   * SUCCESS
   * ---------------------------------------------------------------
   */

  return {
    type: "success",
    data:
      normalizeProviderData(
        result.data
      ),
  };
}

/*
|--------------------------------------------------------------------------
| HANDLE CONNECTION
|--------------------------------------------------------------------------
*/

async function handleConnect(
  request
) {
  try {
    const requestUrl =
      new URL(
        request.url
      );

    const businessId =
      requestUrl.searchParams.get(
        "businessId"
      );

    console.log(
      "================================================="
    );

    console.log(
      "[WhatsApp Connect API] REQUEST"
    );

    console.log(
      "[WhatsApp Connect API] Method:",
      request.method
    );

    console.log(
      "[WhatsApp Connect API] Business ID:",
      businessId
    );

    console.log(
      "[WhatsApp Connect API] Provider:",
      PROVIDER_BASE_URL
    );

    console.log(
      "[WhatsApp Connect API] Provider API key configured:",
      Boolean(
        QR_PROVIDER_API_KEY
      )
    );

    console.log(
      "================================================="
    );

    /*
    |--------------------------------------------------------------------------
    | VALIDATE BUSINESS ID
    |--------------------------------------------------------------------------
    */

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
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

    /*
    |--------------------------------------------------------------------------
    | SESSION ID
    |--------------------------------------------------------------------------
    */

    const sessionId =
      String(
        businessId
      ).trim();

    /*
    |--------------------------------------------------------------------------
    | STEP 1
    |--------------------------------------------------------------------------
    |
    | ALWAYS LOOK FOR THE EXISTING SESSION FIRST.
    |
    */

    const existing =
      await getExistingSession(
        businessId
      );

    /*
    |--------------------------------------------------------------------------
    | EXISTING SESSION FOUND
    |--------------------------------------------------------------------------
    */

    if (
      existing.type ===
      "success"
    ) {
      console.log(
        "[WhatsApp Connect API] Existing session found."
      );

      return frontendResponse({
        businessId,
        sessionId,
        data:
          existing.data,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PROVIDER NETWORK ERROR
    |--------------------------------------------------------------------------
    */

    if (
      existing.type ===
      "error"
    ) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          businessId,
          sessionId,
          message:
            existing.message,
        },
        {
          status:
            existing.status ||
            503,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 2
    |--------------------------------------------------------------------------
    |
    | No existing session/QR was found.
    |
    | Only NOW do we create the WhatsApp session.
    |
    */

    console.log(
      "[WhatsApp Connect API] No existing QR/session found."
    );

    console.log(
      "[WhatsApp Connect API] Creating session."
    );

    const created =
      await createNewSession(
        businessId
      );

    /*
    |--------------------------------------------------------------------------
    | CREATE ERROR
    |--------------------------------------------------------------------------
    */

    if (
      created.type ===
      "error"
    ) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          businessId,
          sessionId,
          providerStatus:
            created.providerStatus ||
            null,
          message:
            created.message,
        },
        {
          status:
            created.status ||
            502,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SESSION CREATED
    |--------------------------------------------------------------------------
    */

    const createdData =
      created.data;

    /*
    |--------------------------------------------------------------------------
    | CREATED SESSION ALREADY CONNECTED
    |--------------------------------------------------------------------------
    */

    if (
      createdData.connected
    ) {
      return frontendResponse({
        businessId,
        sessionId,
        data:
          createdData,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATED SESSION ALREADY HAS QR
    |--------------------------------------------------------------------------
    */

    if (
      createdData.qrCode
    ) {
      console.log(
        "[WhatsApp Connect API] New QR generated."
      );

      return frontendResponse({
        businessId,
        sessionId,
        data:
          createdData,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE RETURNED WITHOUT QR
    |--------------------------------------------------------------------------
    |
    | Ask the provider one more time for the QR.
    |
    */

    const finalQrUrl =
      `${PROVIDER_BASE_URL}/session/${encodeURIComponent(
        sessionId
      )}/qr`;

    const finalQrResult =
      await providerRequest(
        finalQrUrl,
        {
          method: "GET",
          headers:
            providerHeaders(),
        },
        "Final QR lookup"
      );

    if (
      finalQrResult.status ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          businessId,
          sessionId,
          message:
            "Unable to retrieve the WhatsApp QR code.",
        },
        {
          status: 503,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const finalQrData =
      normalizeProviderData(
        finalQrResult.data
      );

    if (
      finalQrData.connected
    ) {
      return frontendResponse({
        businessId,
        sessionId,
        data:
          finalQrData,
      });
    }

    if (
      finalQrData.qrCode
    ) {
      return frontendResponse({
        businessId,
        sessionId,
        data:
          finalQrData,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | QR NOT READY YET
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,
        connected: false,
        businessId,
        sessionId,
        status:
          finalQrData.status ||
          "qr_pending",
        qrCode: "",
        phoneNumber:
          finalQrData.phoneNumber ||
          null,
        message:
          finalQrData.message ||
          "WhatsApp session started. Waiting for QR code.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[WhatsApp Connect API] FATAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to connect to WhatsApp.",
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

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| Starts/retrieves the WhatsApp session.
|
|--------------------------------------------------------------------------
*/

export async function POST(
  request
) {
  return handleConnect(
    request
  );
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Retrieves the EXISTING session/QR.
|
|--------------------------------------------------------------------------
*/

export async function GET(
  request
) {
  return handleConnect(
    request
  );
}

/*
|--------------------------------------------------------------------------
| OPTIONS
|--------------------------------------------------------------------------
*/

export async function OPTIONS() {
  return new NextResponse(
    null,
    {
      status: 204,
      headers: {
        Allow:
          "GET, POST, OPTIONS",
        "Cache-Control":
          "no-store",
      },
    }
  );
}