export async function ensureInstance(
  instanceName: string
) {
  const response = await fetch(
    `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
    {
      headers: {
        apikey: process.env.EVOLUTION_API_KEY!,
      },
    }
  );

  const instances = await response.json();

  const exists = instances.some(
    (instance: any) =>
      instance.name === instanceName
  );

  if (!exists) {
    await createEvolutionInstance(instanceName);
  }
}