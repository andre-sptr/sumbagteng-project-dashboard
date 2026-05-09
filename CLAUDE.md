# Project: Dashboard Projects Sumbagteng

## Tujuan aplikasi
Aplikasi ini bertujuan untuk mempermudah tracking dalam pengerjaan project. Data yg ingin dilihat berupa berapa project yg sudah golive, berapa achivement komitmen golive dengan real golive, OLT A terhubung ke ODC mana?, visualisasi data dari BoQ keseluruhan, dan hal2 lainnya yg bertujuan untuk memantau dan mendapatkan informasi dari project yg sedang dikerjakan. Data diambil dari spreadsheet pada .env

## Stack
- Backend: 
- Database: SQLite
- Frontend: Next

## Masalah yang diketahui
- Kolom full_data di tabel projects berisi data tidak terstruktur
- Logika keseluruhan masih belum rapi
- Topologi masih salah (kosongkan dulu saja karna data ODC dan ODPnya belum ada)
- Data BoQ yg diupload dari file excel apakah sudah diparsing dan masukkan ke database per kolom? (contoh file BoQ @BoQ.xlsx)

## Jangan diubah
- Tidak ada

## Test command
- npm test