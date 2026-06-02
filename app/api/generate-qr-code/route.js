// Replace ONLY your generateQRCode() function with this version.
// It calls the Evolution API server directly instead of /api/connect.

const generateQRCode = async () => {
  try {
    setLoading(true);
    setError("");
    setQrCode("");
    setSuccess(false);

    // Your Evolution API server
    const EVOLUTION_URL = "http://89.167.127.70:8080";
    const API_KEY = "sodah123";
    const INSTANCE_NAME = "sodah";

    // 1. Create instance (safe even if it already exists)
    await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify({
        instanceName: INSTANCE_NAME,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    // 2. Wait briefly for server to initialize
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3. Request QR code
    const response = await fetch(
      `${EVOLUTION_URL}/instance/connect/${INSTANCE_NAME}`,
      {
        method: "GET",
        headers: {
          apikey: API_KEY,
        },
      }
    );

    // Parse response
    const data = await response.json();
    console.log("QR Response:", data);

    // Extract QR code from all possible response formats
    const qr =
      data?.base64 ||
      data?.qr ||
      data?.qrcode ||
      data?.qrCode ||
      data?.code ||
      data?.data?.base64 ||
      data?.data?.qr ||
      data?.data?.qrcode ||
      data?.data?.qrCode;

    // Validate
    if (!qr) {
      throw new Error(
        data?.message ||
          "QR code not returned from Evolution API."
      );
    }

    // Convert to image source
    const qrImage = qr.startsWith("data:image")
      ? qr
      : `data:image/png;base64,${qr}`;

    // Show QR code
    setQrCode(qrImage);
    setSuccess(true);
  } catch (err) {
    console.error("QR Generation Error:", err);
    setError(
      err.message ||
        "Unable to connect to Evolution API server."
    );
  } finally {
    setLoading(false);
  }
};