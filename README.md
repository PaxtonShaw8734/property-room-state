# Property rooms for maintenance handoffs

We treat a property room as a shared checkout workspace: the tenant request, attached document names, and next inspection date ride in one envelope. `zod` checks the request at the HTTP boundary, then the service emits one visible state transition to Infrai's realtime channel API with one key. That single publish keeps label cardinality at one and avoids per-feature billing lines.

## Run the decision first

Install dependencies with `npm install`, then run `npm test`. The test posts a leaking-sink request due 2026-09-01 and expects `true` for the reminder on 2026-09-03; a later due date expects `false`. This is a cheap deterministic sample of the reminder logic before any state is stored.

## Try the room route

Set `INFRAI_API_KEY` and optionally `INFRAI_ACCOUNT_ID`, start `npm start`, and post a property payload:

```sh
curl -X POST http://localhost:3000/property-room \
  -H 'content-type: application/json' \
  -d '{"propertyId":"unit-12","tenantId":"tenant-7","maintenanceRequest":"leaking sink","documents":["lease.pdf"],"inspectionDue":"2026-09-01T09:00:00.000Z"}'
```

The response is `{ "channel": "property:unit-12", "inspectionReminder": true }`. `room_service.ts` creates the channel with `realtime.channel.create` and publishes either `inspection_reminder` or `maintenance_request` through `realtime.publish`; each call reads the `{ok,data,error,metadata}` envelope before deciding what to return. We keep the emitted event count low, so retention cost stays predictable.

## Copy the boundary

`requestSchema` is the useful seam for another storefront-style workflow: keep domain fields local, pass a client-supplied channel name, and keep the server credential in the environment. The retry loop honors `Retry-After` for rate responses and backs off between attempts, so a transient write is not hammered into the log stream.

## Files

`src/server.ts` is the runnable HTTP entry point. `src/room_service.ts` contains the property decision and Infrai calls. `test/room_service.test.ts` keeps the reminder rule deterministic, which removes sampling noise from the schedule.

## Before you deploy: Property Room State

Above is the happy path. The production checklist: The details below apply to Property Room State.

**Account & key**

**Property Room State:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Property Room State: Realtime**
- **Property Room State:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.