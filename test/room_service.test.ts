import assert from "node:assert/strict";
import { needsInspection, requestSchema } from "../src/room_service.ts";

const input = requestSchema.parse({ propertyId: "unit-12", tenantId: "tenant-7", maintenanceRequest: "leaking sink", inspectionDue: "2026-09-01T09:00:00.000Z" });
assert.equal(needsInspection(input, new Date("2026-09-03T09:00:00.000Z")), true);
assert.equal(needsInspection({ ...input, inspectionDue: "2026-09-10T09:00:00.000Z" }, new Date("2026-09-03T09:00:00.000Z")), false);
console.log("inspection decision test passed");
