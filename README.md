# ifs24030-pabwe-p3

Aplikasi web single page untuk Praktikum PABWE 3.

## Fitur
- Expense Tracker: CRUD, ringkasan pemasukan/pengeluaran/saldo, cari, filter, sort, modal, localStorage.
- Bookmark Manager: CRUD, validasi URL http/https, buka tab baru, cari, sort, modal, localStorage key terpisah.
- Quiz App: 7 soal dari array of object, feedback, skor akhir, ulangi, high score localStorage.
- Integrasi tiga tab: satu panel aktif dan tab aktif dikelola melalui query URL `?tab=expense|bookmark|quiz`.

## Struktur
ifs24030-pabwe-p3/
├── index.html
└── assets/
    └── script.js

## Menjalankan
Buka `index.html` di browser. Internet diperlukan untuk memuat Tailwind CDN, Google Fonts, dan Tabler Icons.

Contoh URL:
- `index.html?tab=expense`
- `index.html?tab=bookmark`
- `index.html?tab=quiz`
