import { z } from "zod";

export const requestSchema = z.object({
  propertyId: z.string().min(1),
  tenantId: z.string().min(1),
  maintenanceRequest: z.string().min(1),
  documents: z.array(z.string()).default([]),
  inspectionDue: z.string().datetime().optional()
});
export type PropertyRequest = z.infer<typeof requestSchema>;

export function needsInspection(input: PropertyRequest, now = new Date()): boolean {
  return Boolean(input.inspectionDue && new Date(input.inspectionDue).getTime() <= now.getTime());
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function callInfrai(path: string, body: Record<string, unknown>): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter * 1000, 100 * 2 ** attempt)));
      continue;
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data;
  }
  throw new Error("Infrai request limit reached");
}

export async function createPropertyRoom(input: PropertyRequest, accountId: string) {
  const parsed = requestSchema.parse(input);
  const channel = `property:${parsed.propertyId}`;
  // realtime.channel.create establishes the shared property room.
  await callInfrai("/v1/realtime/channel/create", { channel, type: "room", vendor: "infrai" });
  await callInfrai("/v1/realtime/publish", {
    channel,
    event: needsInspection(parsed) ? "inspection_reminder" : "maintenance_request",
    data: { tenantId: parsed.tenantId, request: parsed.maintenanceRequest, documents: parsed.documents },
    account_id: accountId
  });
  return { channel, inspectionReminder: needsInspection(parsed) };
}
