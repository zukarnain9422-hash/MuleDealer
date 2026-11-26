import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/submit.js";

const malaysiaToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kuala_Lumpur",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function makeContext(overrides = {}) {
  let inserted = false;
  const db = {
    prepare() {
      return {
        bind() {
          return {
            async run() {
              inserted = true;
              return { success: true };
            },
          };
        },
      };
    },
  };
  const env = {
    DB: db,
    TURNSTILE_SECRET_KEY: "test-secret",
    TURNSTILE_HOSTNAMES: "muledealer.pages.dev",
    ...overrides,
  };
  const payload = {
    category: "Kes Keldai Akaun",
    displayName: "Pengguna Ujian",
    contact: "test@example.com",
    incidentDate: malaysiaToday,
    consultationMode: "Telefon / Panggilan Suara",
    preferredSlot: "Pagi (9.00 PG – 12.00 TGH)",
    summary: "Scammer meminta OTP tetapi saya tidak berkongsi kod.",
    consent: true,
    turnstileToken: "test-token",
  };
  const request = new Request("https://muledealer.pages.dev/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://muledealer.pages.dev",
    },
    body: JSON.stringify(payload),
  });
  return { context: { request, env }, payload, wasInserted: () => inserted };
}

test("accepts a Malaysian local current date and a safe scam description", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: true,
    action: "contact",
    hostname: "muledealer.pages.dev",
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const fixture = makeContext();
    const response = await onRequestPost(fixture.context);
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.ok, true);
    assert.match(result.referenceCode, /^RND-\d{4}-[A-F0-9]{8}$/);
    assert.equal(fixture.wasInserted(), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects an actual OTP value before Turnstile verification or database insert", async () => {
  const originalFetch = globalThis.fetch;
  let verificationCalled = false;
  globalThis.fetch = async () => {
    verificationCalled = true;
    return new Response("{}");
  };

  try {
    const fixture = makeContext();
    fixture.context.request = new Request(fixture.context.request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://muledealer.pages.dev",
      },
      body: JSON.stringify({ ...fixture.payload, summary: "OTP: 123456 telah diberi kepada scammer." }),
    });
    const response = await onRequestPost(fixture.context);
    assert.equal(response.status, 400);
    assert.equal(verificationCalled, false);
    assert.equal(fixture.wasInserted(), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a cross-origin submission", async () => {
  const fixture = makeContext();
  fixture.context.request = new Request(fixture.context.request.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://attacker.example",
    },
    body: JSON.stringify(fixture.payload),
  });
  const response = await onRequestPost(fixture.context);
  assert.equal(response.status, 403);
  assert.equal(fixture.wasInserted(), false);
});
