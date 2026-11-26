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

## Ujian automatik

GitHub Actions menjalankan semakan sintaks Pages Functions, JavaScript sebaris dalam `index.html`, ujian regresi API dan kesahan SQL migration D1 apabila ada push ke `main` atau pull request. `package.json` menetapkan mod ES module untuk ujian Node.js. Fail `_headers` menetapkan header keselamatan untuk respons fail statik; respons API menetapkan header JSON/no-store dan header keselamatan asasnya sendiri.

Ujian API meliputi:
- penerimaan tarikh semasa mengikut zon waktu Malaysia;
- penerangan kes yang menyebut permintaan OTP tanpa mendedahkan kod;
- penolakan nilai OTP sebenar;
- penolakan permintaan daripada origin berlainan.

## Had fungsi semasa

- Borang menghantar **permohonan** dan pilihan slot; ia tidak mengesahkan atau mengunci janji temu secara automatik.
- Belum ada papan pemuka pentadbir, notifikasi e-mel/WhatsApp atau aliran pengurusan status kes.
- Rekod hanya boleh disemak melalui akses pentadbir D1 yang sah. Jangan bina endpoint awam untuk membaca rekod.
- Notis privasi belum lengkap. Sebelum penggunaan awam berskala, tetapkan nama dan maklumat pengendali data, tujuan dan asas pemprosesan, pihak yang boleh mengakses data, tempoh simpanan, serta saluran permintaan/pemadaman.
- Tambah rate limiting, pemantauan penyalahgunaan dan prosedur tindak balas insiden sebelum penggunaan meluas.

## Status deployment

Kod dalam GitHub telah dikemas kini, tetapi ini **bukan bukti** bahawa Cloudflare Pages sudah menerbitkan commit terkini atau bahawa D1 migration, binding dan secret telah aktif dalam Production.

Pengesahan akhir masih memerlukan:
1. GitHub Actions menunjukkan semua semakan lulus.
2. `https://muledealer.pages.dev/api/health` menunjukkan API, D1 dan Turnstile dikonfigurasi.
3. Migration D1 disahkan pada pangkalan data remote.
4. Satu permohonan ujian menggunakan Turnstile sebenar berjaya disimpan dan boleh disemak dalam D1.
5. Secret `TURNSTILE_SECRET_KEY` kekal sebagai Pages secret dan tidak pernah berada dalam repositori.