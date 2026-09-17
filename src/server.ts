import { createServer } from "node:http";
import { createPropertyRoom, requestSchema } from "./room_service.ts";

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/property-room") { res.writeHead(404); res.end(); return; }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    const body = requestSchema.parse(JSON.parse(raw));
    const result = await createPropertyRoom(body, process.env.INFRAI_ACCOUNT_ID ?? "demo-account");
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: error instanceof Error ? error.message : "invalid request" }));
  }
});
server.listen(Number(process.env.PORT ?? 3000), () => console.log("property room service listening"));
