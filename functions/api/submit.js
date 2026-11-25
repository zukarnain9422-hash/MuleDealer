
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

async function verifyTurnstile(token, secret, ip, allowedHostnames) {
  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (ip) body.set("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) return false;
  const result = await response.json();
  const hostname = typeof result.hostname === "string"
    ? result.hostname.toLowerCase()
    : "";

  return result.success === true &&
    result.action === "contact" &&
    allowedHostnames.includes(hostname);
}

export async function onRequestPost({ request, env }) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");

  if (origin && origin !== requestUrl.origin) {
    return reply(403, { ok: false, error: "Permintaan tidak dibenarkan." });
  }

  if (!env.DB) {
    return reply(503, { ok: false, error: "Pangkalan data belum dikonfigurasi." });
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    return reply(503, { ok: false, error: "Pengesahan keselamatan belum dikonfigurasi." });
  }

  if (!env.TURNSTILE_HOSTNAMES) {
    return reply(503, { ok: false, error: "Hostname keselamatan belum dikonfigurasi." });
  }

  const allowedHostnames = env.TURNSTILE_HOSTNAMES
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedHostnames.length) {
    return reply(503, { ok: false, error: "Hostname keselamatan belum dikonfigurasi." });
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return reply(415, { ok: false, error: "Format permintaan tidak disokong." });
  }

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 16000) {
    return reply(413, { ok: false, error: "Maklumat yang dihantar terlalu besar." });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return reply(400, { ok: false, error: "Data borang tidak sah." });
  }

  const category = cleanText(data.category, 60);
  const displayName = cleanText(data.displayName, 100);
  const contact = cleanText(data.contact, 160);
  const incidentDate = cleanText(data.incidentDate, 10);
  const consultationMode = cleanText(data.consultationMode, 40);
  const preferredSlot = cleanText(data.preferredSlot, 80);
  const summary = cleanText(data.summary, 2000);
  const turnstileToken = cleanText(data.turnstileToken, 2048);
  const consent = data.consent === true;

  const allowedCategories = [
    "Mangsa Scam",
    "Kes Keldai Akaun",
    "Kedua-duanya / Tidak Pasti",
  ];
  const allowedModes = [
    "Dalam Talian (Video / Sidang Web)",
    "Telefon / Panggilan Suara",
    "Bersemuka (Mengikut Temujanji)",
  ];
  const allowedSlots = [
    "Pagi (9.00 PG – 12.00 TGH)",
    "Petang (2.00 PTG – 5.00 PTG)",
    "Malam / Fleksibel (8.00 MLM – 9.30 MLM)",
  ];

  if (!allowedCategories.includes(category)) {
    return reply(400, { ok: false, error: "Kategori kes tidak sah." });
  }
  if (displayName.length < 2 || contact.length < 5) {
    return reply(400, { ok: false, error: "Nama dan maklumat hubungan perlu disemak." });
  }
  if (!validDate(incidentDate)) {
    return reply(400, { ok: false, error: "Tarikh kejadian tidak sah." });
  }
  if (!allowedModes.includes(consultationMode) || !allowedSlots.includes(preferredSlot)) {
    return reply(400, { ok: false, error: "Pilihan rundingan tidak sah." });
  }
  if (summary.length < 15 || !consent) {
    return reply(400, { ok: false, error: "Ringkasan kes atau persetujuan belum lengkap." });
  }
  if (!turnstileToken) {
    return reply(400, { ok: false, error: "Sila lengkapkan pengesahan keselamatan." });
  }

  let humanVerified = false;
  try {
    humanVerified = await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get("CF-Connecting-IP"),
      allowedHostnames,
    );
  } catch {
    return reply(502, { ok: false, error: "Pengesahan keselamatan gagal. Sila cuba semula." });
  }

  if (!humanVerified) {
    return reply(400, { ok: false, error: "Pengesahan keselamatan tidak berjaya." });
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const referenceCode = `MD-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  try {
    await env.DB.prepare(`
      INSERT INTO case_submissions (
        id, reference_code, category, display_name, contact,
        incident_date, consultation_mode, preferred_slot,
        summary, consent_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
    `).bind(
      id,
      referenceCode,
      category,
      displayName,
      contact,
      incidentDate,
      consultationMode,
      preferredSlot,
      summary,
      now,
      now,
      now,
    ).run();
  } catch {
    return reply(500, { ok: false, error: "Permohonan tidak dapat disimpan. Sila cuba semula." });
  }

  return reply(201, {
    ok: true,
    referenceCode,
    status: "received",
    message: "Permohonan diterima untuk semakan awal. Simpan nombor rujukan ini.",
  });
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return reply(405, { ok: false, error: "Kaedah tidak dibenarkan." });
  }
  return onRequestPost(context);
}
Secure Turnstile hostname and action validation.