import { NextResponse } from "next/server";

export async function POST(req) {

  try {

    const body = await req.json();

    const { businessId } = body;

    if (!businessId) {

      return NextResponse.json(
        {
          success: false,
          message: "Missing business ID"
        },
        { status: 400 }
      );
    }

    /* -------------------------------------------------- */
    /* EVOLUTION API SETTINGS                             */
    /* -------------------------------------------------- */

    const EVOLUTION_URL =
      process.env.EVOLUTION_API_URL;

    const EVOLUTION_KEY =
      process.env.EVOLUTION_API_KEY;

    /* -------------------------------------------------- */
    /* CREATE INSTANCE NAME                               */
    /* -------------------------------------------------- */

    const instanceName =
      `sodah_${businessId}`;

    /* -------------------------------------------------- */
    /* CREATE INSTANCE IF NOT EXISTS                      */
    /* -------------------------------------------------- */

    try {

      await fetch(
        `${EVOLUTION_URL}/instance/create`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            apikey: EVOLUTION_KEY
          },

          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          })
        }
      );

    } catch (e) {

      console.log(
        "Instance may already exist"
      );
    }

    /* -------------------------------------------------- */
    /* FETCH QR CODE                                      */
    /* -------------------------------------------------- */

    const qrResponse = await fetch(
      `${EVOLUTION_URL}/instance/connect/${instanceName}`,
      {
        method: "GET",

        headers: {
          apikey: EVOLUTION_KEY
        }
      }
    );

    const qrData =
      await qrResponse.json();

    console.log("QR DATA:", qrData);

    /* -------------------------------------------------- */
    /* GET QR IMAGE                                       */
    /* -------------------------------------------------- */

    const qr =
      qrData?.base64 ||
      qrData?.qrcode?.base64 ||
      qrData?.code ||
      "";

    if (!qr) {

      return NextResponse.json(
        {
          success: false,
          message:
            "QR code not generated"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qr: qr.startsWith("data:image")
        ? qr
        : `data:image/png;base64,${qr}`
    });

  } catch (error) {

    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to generate QR"
      },
      { status: 500 }
    );
  }
}