import { providerCreditExpiry } from "../src/lib/dashboard/admin/provider-credit-state";
import { legalDocumentSchema } from "../src/lib/legal/schema";
import { hasProfileImageSignature } from "../src/lib/settings/profile-image";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}`);
  if (!passed) failures += 1;
}

const now = Date.parse("2026-09-21T00:00:00.000Z");
check(
  "provider expiry warns inside configured window",
  providerCreditExpiry("2026-10-01T00:00:00.000Z", 14, now).needsAttention,
);
check(
  "provider expiry stays quiet outside configured window",
  !providerCreditExpiry("2026-12-01T00:00:00.000Z", 14, now).needsAttention,
);
check(
  "missing provider expiry is not presented as an alert",
  providerCreditExpiry(null, 14, now).daysUntilExpiry === null,
);

check(
  "legal document accepts coming-soon copy",
  legalDocumentSchema.safeParse({
    status: "coming_soon",
    title: "Privacy policy",
    summary: "Being prepared.",
    body: "Contact support before launch.",
  }).success,
);
check(
  "legal document rejects empty public copy",
  !legalDocumentSchema.safeParse({ status: "published", title: "", summary: "", body: "" }).success,
);

check(
  "profile upload accepts a PNG signature",
  hasProfileImageSignature("image/png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
);
check(
  "profile upload rejects a renamed executable",
  !hasProfileImageSignature("image/png", new Uint8Array([77, 90, 0, 0, 0, 0, 0, 0])),
);

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
