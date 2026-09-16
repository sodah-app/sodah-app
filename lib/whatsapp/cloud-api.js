const GRAPH_VERSION =
  process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v25.0";

function env(name) {
  return process.env[name]?.trim() || "";
}

function graphUrl(path) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${String(path).replace(/^\/+/, "")}`;
}

async function graphRequest(path, options = {}) {
  const response = await fetch(graphUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Meta Graph API request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.meta = data;
    throw error;
  }

  return data;
}

export async function exchangeEmbeddedSignupCode(code) {
  const appId = env("META_APP_ID");
  const appSecret = env("META_APP_SECRET");

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET are required.");
  }

  const url = new URL(graphUrl("oauth/access_token"));
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok || !data.access_token) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Meta did not return an access token."
    );
  }

  return data.access_token;
}

export async function getWhatsAppPhoneNumber(phoneNumberId, accessToken) {
  const fields = "id,display_phone_number,verified_name,quality_rating,code_verification_status";
  return graphRequest(
    `${phoneNumberId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`
  );
}

export async function subscribeWaba(wabaId, accessToken) {
  return graphRequest(`${wabaId}/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getWaba(wabaId, accessToken) {
  return graphRequest(
    `${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace&access_token=${encodeURIComponent(accessToken)}`
  );
}

export async function sendWhatsAppText({
  phoneNumberId,
  recipient,
  text,
  accessToken,
}) {
  if (!phoneNumberId || !recipient || !text) {
    throw new Error("phoneNumberId, recipient and text are required.");
  }

  return graphRequest(`${phoneNumberId}/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    }),
  });
}

export async function sendWhatsAppTemplate({
  phoneNumberId,
  recipient,
  template,
  accessToken,
}) {
  if (!phoneNumberId || !recipient || !template?.name) {
    throw new Error("phoneNumberId, recipient and template.name are required.");
  }

  return graphRequest(`${phoneNumberId}/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template,
    }),
  });
}
