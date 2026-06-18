export function getInstanceName(businessId: string) {
  return businessId;
}

const API_URL = process.env.EVOLUTION_API_URL!;
const API_KEY = process.env.EVOLUTION_API_KEY!;

async function evolutionFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        apikey: API_KEY,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    }
  );

  const text = await response.text();

  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function createEvolutionInstance(
  instanceName: string
) {
  const response = await evolutionFetch(
    "/instance/create",
    {
      method: "POST",
      body: JSON.stringify({
        instanceName,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      response.data?.response?.message?.[0] ||
        response.data?.message ||
        "Failed to create instance"
    );
  }

  return response.data;
}

export async function ensureEvolutionInstance(
  instanceName: string
) {
  const response = await evolutionFetch(
    `/instance/fetchInstances`,
    {
      method: "GET",
    }
  );

  const instances = Array.isArray(response.data)
    ? response.data
    : response.data?.instances || [];

  const exists = instances.some(
    (instance: any) =>
      instance.name === instanceName
  );

  if (!exists) {
    await createEvolutionInstance(instanceName);
  }

  return true;
}