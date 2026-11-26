# MuleDealer — Panduan Setup dan Status

MuleDealer ialah portal penerimaan maklumat awal berkaitan mangsa penipuan dan kes keldai akaun. Portal ini bukan agensi penguat kuasa, bank atau firma guaman.

## Struktur projek

```text
MuleDealer/
├── index.html
├── functions/
│   └── api/
│       ├── health.js
│       └── submit.js
├── migrations/
│   └── 0001_initial.sql
└── wrangler.toml
```

## Konfigurasi dalam repositori

- Cloudflare Pages project: `muledealer`
- Output directory: `.`
- Pages Functions: folder `functions/` di root
- D1 binding: `DB`
- D1 database: `muledealer-db`
- Turnstile hostname yang dibenarkan: `muledealer.pages.dev`
- Turnstile Site Key disimpan dalam konfigurasi awam; Secret Key mesti disimpan sebagai Pages secret `TURNSTILE_SECRET_KEY`.

Semak Dashboard Cloudflare untuk mengesahkan binding dan secret pada environment Production dan Preview. Jangan letakkan Secret Key dalam HTML, JavaScript atau repositori.

## Borang dan API

Borang dalam `index.html` sudah menghantar JSON ke `POST /api/submit` dan menyertakan token Turnstile. API menyemak medan, persetujuan, tarikh kejadian dan pengesahan Turnstile di bahagian server sebelum menyimpan rekod ke D1.

Endpoint:

- `GET /api/health` — status API dan kewujudan binding/konfigurasi.
- `POST /api/submit` — penerimaan permohonan. Memerlukan token Turnstile yang sah.

Nombor rujukan dijana dengan format `RND-YYYY-XXXXXXXX`. Ia hanya dipaparkan selepas API berjaya menyimpan permohonan.

## D1 migration

Skema awal berada di `migrations/0001_initial.sql`. Pastikan migration telah digunakan pada pangkalan data remote:

```bash
wrangler d1 migrations apply muledealer-db --remote
```

Semak jadual:

```bash
wrangler d1 execute muledealer-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Jangan jalankan migration secara membuta tuli pada pangkalan data produksi; semak status migration terlebih dahulu.

## Semakan deployment

Selepas commit ke branch `main`, Cloudflare Pages sepatutnya memulakan deployment automatik jika integrasi Git dan Production branch dikonfigurasi dengan betul.

Uji:

1. Buka laman utama `https://muledealer.pages.dev`.
2. Buka `https://muledealer.pages.dev/api/health`.
3. Pastikan respons health menunjukkan `ok: true`, `databaseConfigured: true` dan `turnstileConfigured: true`.
4. Hantar satu permohonan ujian yang dibenarkan dan sahkan respons HTTP 201 serta nombor rujukan.
5. Semak rekod masuk ke D1 menggunakan akses pentadbir yang sah. Jangan gunakan maklumat mangsa sebenar untuk ujian.

Status konfigurasi fail dalam GitHub bukan bukti deployment Cloudflare atau binding akaun telah berjaya. Pengesahan runtime perlu dibuat pada URL produksi.

## Keselamatan dan privasi

- Jangan minta atau simpan kata laluan bank, PIN, TAC/OTP, nombor kad penuh atau akses perbankan.
- Hadkan akses D1 kepada pentadbir yang diberi kuasa.
- Jangan sediakan endpoint awam untuk membaca rekod aduan.
- Lindungi paparan data dengan kawalan akses, output escaping dan audit log.
- Tetapkan notis privasi, tujuan pemprosesan, tempoh simpanan/pemadaman dan saluran permintaan data.
- Tambah rate limiting, pemantauan penyalahgunaan dan prosedur tindak balas insiden sebelum penggunaan meluas.
- Jangan dakwa portal ini mewakili kerajaan, polis, bank atau firma guaman.

## Status semasa

Kod borang frontend dan endpoint submit telah disambungkan dalam repositori. Pembaikan terkini membuang teks asing yang menyebabkan ralat sintaks di hujung `functions/api/submit.js` dan menyeragamkan awalan nombor rujukan kepada `RND-`.

**Deployment Pages, status migration D1 dan tetapan secret/binding Cloudflare masih perlu disahkan melalui runtime dan Dashboard.**