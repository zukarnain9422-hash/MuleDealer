# MuleDealer — Setup Cloudflare (asas)

Pakej ini menyediakan asas backend untuk repositori MuleDealer. Ia **belum mengubah `index.html`** dan borang sedia ada belum disambungkan ke API. Jangan umumkan borang aktif sehingga integrasi frontend dan ujian selesai.

## Struktur

```text
MuleDealer/
├── functions/
│   └── api/
│       ├── health.js
│       └── submit.js
├── migrations/
│   └── 0001_initial.sql
├── .dev.vars.example
├── .gitignore
└── wrangler.toml
```

## 1. Buat pangkalan data D1

Dalam Termux atau komputer yang mempunyai Node.js:

```bash
npm install -g wrangler
wrangler login
wrangler d1 create muledealer-db
```

Simpan `database_id` yang dipaparkan. Buka `wrangler.toml` dan gantikan:

```toml
database_id = "REPLACE_WITH_D1_DATABASE_ID"
```

dengan ID sebenar. Jangan reka atau kongsi ID pangkalan data secara terbuka.

## 2. Pasang skema pangkalan data

Dari direktori root projek:

```bash
wrangler d1 migrations apply muledealer-db --remote
```

Semak jadual:

```bash
wrangler d1 execute muledealer-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## 3. Daftar Turnstile

Dalam Cloudflare Dashboard:

1. Buka Turnstile dan tambah widget.
2. Tetapkan hostname domain MuleDealer yang sebenar.
3. Pilih mod Managed.
4. Salin Site Key dan Secret Key.

Masukkan Site Key dalam `wrangler.toml` pada `TURNSTILE_SITE_KEY`.
Tetapkan Secret Key sebagai rahsia (bukan variable awam):

```bash
wrangler pages secret put TURNSTILE_SECRET_KEY --project-name muledealer
```

Masukkan Secret Key apabila terminal meminta nilainya. Jangan masukkan Secret Key ke HTML, JavaScript, GitHub atau mesej awam.

Untuk ujian setempat, salin `.dev.vars.example` kepada `.dev.vars` dan isi Secret Key. Fail `.dev.vars` dikecualikan daripada Git.

## 4. Tetapan Cloudflare Pages

Pastikan projek Pages disambungkan kepada repositori GitHub yang betul.

Cadangan tetapan:
- Framework preset: None
- Build command: kosong (tiada build diperlukan untuk struktur HTML sedia ada)
- Build output directory: `.` mengikut `wrangler.toml`
- Root directory: `/`

Pages Functions mesti berada dalam folder `functions/` di root projek, bukan di dalam folder output `dist`.

Jika projek Pages sedia ada mempunyai tetapan build atau konfigurasi Wrangler tersendiri, semak dahulu sebelum menggantikannya. Jangan timpa konfigurasi deployment sedia ada tanpa membandingkannya.

## 5. Bindings

Konfigurasi `wrangler.toml` menggunakan binding D1 bernama `DB`.
Jika Dashboard Pages mengurus binding secara berasingan, buka:

Workers & Pages → MuleDealer → Settings → Bindings → D1 database

Pilih pangkalan data `muledealer-db`, dan tetapkan variable name `DB`. Redeploy selepas perubahan binding.

## 6. Uji API

Selepas deploy:

- `GET /api/health` memaparkan status API dan sama ada binding/konfigurasi telah tersedia.
- `POST /api/submit` menerima JSON, mengesahkan Turnstile di server, menyemak medan dan menyimpan permohonan ke D1.

Endpoint submit memerlukan token Turnstile yang sah. Ia tidak akan menerima permohonan jika rahsia Turnstile atau D1 belum dikonfigurasi.

## 7. Perkara belum siap sebelum penggunaan sebenar

1. Sambungkan widget Turnstile pada borang `index.html` menggunakan Site Key.
2. Tukar handler submit frontend supaya `fetch('/api/submit', ...)` menghantar medan yang tepat dan token Turnstile.
3. Paparkan nombor rujukan hanya selepas API membalas HTTP 201.
4. Bina panel admin dengan pengesahan yang kukuh, peranan akses dan audit log.
5. Tetapkan dasar privasi, tempoh simpanan/pemadaman, proses permintaan subjek data dan prosedur insiden.
6. Tambah perlindungan kadar permintaan dan pemantauan penyalahgunaan.
7. Uji di Preview terlebih dahulu; jangan uji data palsu pada pangkalan data produksi.

## Keselamatan data

- Jangan minta atau simpan kata laluan bank, PIN, TAC/OTP, nombor kad penuh atau akses perbankan.
- Hadkan akses D1 kepada akaun pentadbir yang diberi kuasa.
- Jangan paparkan rekod aduan melalui endpoint awam.
- Output daripada pangkalan data mesti di-escape apabila dipaparkan pada panel admin.
- Data hubungan dan ringkasan kes boleh mengandungi maklumat peribadi; hadkan pengumpulan kepada perkara yang benar-benar perlu.
- Jangan dakwa portal ini agensi kerajaan, bank, polis atau firma guaman melainkan status tersebut benar dan boleh dibuktikan.

## Status pakej

Pakej ini ialah asas konfigurasi backend. Ia bukan bukti bahawa D1, Turnstile atau Pages sudah diwujudkan di akaun Cloudflare. ID D1, hostname Turnstile, rahsia dan binding perlu ditetapkan dalam akaun pemilik projek.
