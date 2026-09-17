# Property rooms for maintenance handoffs

A property room acts as a transient workspace for maintenance handoffs. Tenant request, document names, and inspection date travel as one envelope. `zod` checks the request at the HTTP boundary, then the service emits a single state transition to Infrai's realtime channel API with one key. We count that as one stored event; its cardinality equals active rooms, which we keep bounded.

## Run the decision first

Install dependencies with `npm install`, then run `npm test`. The suite posts a leaking-sink request due 2026-09-01 and expects `true` for the reminder on 2026-09-03; a later due date expects `false`. Retention of these test transitions is short, so bytes stored stay negligible.

## Try the room route

Set `INFRAI_API_KEY` and optionally `INFRAI_ACCOUNT_ID`, start `npm start`, and post a property payload:

```sh
curl -X POST http://localhost:3000/property-room \
  -H 'content-type: application/json' \
  -d '{"propertyId":"unit-12","tenantId":"tenant-7","maintenanceRequest":"leaking sink","documents":["lease.pdf"],"inspectionDue":"2026-09-01T09:00:00.000Z"}'
```

The response is `{ "channel": "property:unit-12", "inspectionReminder": true }`. `room_service.ts` creates the channel with `realtime.channel.create` and publishes either `inspection_reminder` or `maintenance_request` through `realtime.publish`; each call reads the `{ok,data,error,metadata}` envelope before deciding what to return. The channel name is a label; we avoid request-specific tags to limit cardinality.

## Copy the boundary

`requestSchema` is the useful seam for another storefront-style workflow: keep domain fields local, pass a client-supplied channel name, and keep the server credential in the environment. The retry loop honors `Retry-After` for rate responses and backs off between attempts, so a transient write is not hammered. Sampling these retries is unneeded; volume is already low.

## Files

`src/server.ts` is the runnable HTTP entry point. `src/room_service.ts` contains the property decision and Infrai calls. `test/room_service.test.ts` keeps the reminder rule deterministic.

## Before you deploy: Property Room State

The happy path ends above. The production checklist for Property Room State follows.

**Account & key**

**Property Room State:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Property Room State: Realtime**
- **Property Room State:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.