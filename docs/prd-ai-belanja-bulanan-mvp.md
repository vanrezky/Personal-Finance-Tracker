# PRD: MVP AI Belanja Bulanan dan Mingguan

## Tujuan
Membuat fitur AI yang membantu user mengubah data transaksi dan daftar belanja menjadi insight yang langsung bisa dipakai.

Fitur ini harus bisa:
- menarik data transaksi berdasarkan kategori `03` dan `04`
- membaca daftar belanja bulanan/mingguan yang sudah ada
- memberi rekomendasi item, ringkasan pengeluaran, dan perbandingan sederhana
- menghasilkan output yang bisa langsung dipakai user tanpa perlu paham prompt atau analisa manual

## Masalah yang Diselesaikan
Saat ini daftar belanja bulanan sudah ada, tetapi:
- tidak ada cara untuk menarik data transaksi nyata ke dalam analisa shopping list
- user harus menebak item mana yang perlu diisi ulang
- tidak ada ringkasan apakah belanja bulan ini sesuai pola historis
- tidak ada insight yang menjembatani data transaksi dan daftar belanja

## Target User
- user rumah tangga yang membuat daftar belanja bulanan/mingguan
- user yang sudah rutin mencatat transaksi
- user yang ingin tahu pola belanja tanpa analisa manual

## Scope MVP
MVP hanya mencakup 1 halaman atau 1 panel AI di fitur belanja bulanan.

Output AI harus terdiri dari:
1. ringkasan belanja dari kategori `03` dan `04`
2. daftar item yang sering muncul dari transaksi
3. rekomendasi item untuk ditambahkan ke shopping list
4. perbandingan sederhana terhadap bulan sebelumnya
5. tombol untuk menerapkan hasil rekomendasi ke daftar belanja

## Lokasi Fitur

### Tempat tampil
- Di halaman `Belanja Bulanan`
- Bentuknya tab atau card khusus: `Analisa AI`

### Alasan
- konteksnya paling dekat dengan shopping list
- user yang membuka halaman ini memang sedang ingin mengelola belanja
- tidak mencampuradukkan dengan halaman laporan umum

### UI minimal yang harus ada
- tombol `Analisa AI`
- area hasil analisa
- tombol `Tarik data transaksi`
- tombol `Tambahkan ke daftar`
- tombol `Refresh analisa`

## Sumber Data

### Data transaksi
AI hanya membaca transaksi dengan kategori:
- `03` = belanja mingguan
- `04` = belanja bulanan

Data transaksi minimal yang dipakai:
- tanggal transaksi
- kategori
- nama transaksi / deskripsi
- nominal
- catatan jika ada
- household/user scope

### Data shopping list
AI membaca daftar dari modul belanja bulanan/mingguan yang sudah ada:
- nama item
- estimated amount
- quantity
- unit
- notes
- status checked / unchecked
- createdAt / updatedAt
- bulan aktif

### Data historis yang dipakai
Untuk MVP, AI hanya melihat:
- bulan aktif
- 3 bulan sebelumnya
- daftar item dari bulan aktif dan bulan sebelumnya
- transaksi kategori `03` dan `04` dari rentang waktu itu

## Output AI yang Wajib

### Ringkasan belanja
AI harus menampilkan:
- total transaksi kategori `03`
- total transaksi kategori `04`
- total gabungan `03 + 04`
- perbandingan dengan bulan sebelumnya
- jumlah transaksi yang dianalisis

Contoh format:
- Belanja minggu ini: Rp 1.250.000
- Belanja bulan ini: Rp 4.800.000
- Naik 12% dibanding bulan lalu

### Item yang paling sering muncul
AI harus mengelompokkan transaksi yang mirip menjadi satu item.

Contoh grouping:
- `beras`, `beras 5kg`, `stok beras` -> `Beras`
- `minyak`, `minyak goreng` -> `Minyak Goreng`
- `telur`, `telur ayam` -> `Telur`

Output:
- nama item normalisasi
- frekuensi muncul
- total estimasi nominal
- kategori sumber dominan: mingguan atau bulanan

### Rekomendasi item untuk shopping list
AI harus mengeluarkan rekomendasi item yang layak dimasukkan ke daftar belanja.

Aturan rekomendasi minimal:
- item sering muncul di transaksi 3 bulan terakhir
- item belum ada di shopping list bulan aktif
- item ada di daftar bulan lalu tapi tidak ada di bulan aktif
- item memiliki nominal relatif stabil

Output tiap rekomendasi:
- nama item
- alasan rekomendasi
- estimasi nominal
- prioritas: tinggi / sedang / rendah

### Perbandingan dengan bulan sebelumnya
AI harus membandingkan:
- total nominal transaksi kategori `03 + 04`
- jumlah item unik
- jumlah item yang berulang
- item baru yang muncul bulan ini

### Tindakan langsung
User harus bisa:
- menambahkan rekomendasi item ke shopping list aktif
- menambahkan semua rekomendasi sekaligus
- menolak item tertentu agar tidak masuk daftar

## Rule Engine MVP
MVP sebaiknya tidak bergantung penuh pada model AI generatif. Gunakan kombinasi aturan dan AI summary.

### Aturan dasar grouping
Item digabung jika:
- setelah lowercase dan trim, kata inti sama
- sinonim dasar cocok dari daftar mapping
- perbedaan hanya satuan atau angka ukuran

Contoh mapping awal:
- `beras`, `beras 5kg`, `stok beras`
- `minyak`, `minyak goreng`
- `telur`, `telur ayam`
- `sabun`, `sabun mandi`, `sabun cuci`

### Aturan rekomendasi
Item masuk rekomendasi jika:
- muncul minimal 2 kali dalam 3 bulan
- atau muncul bulan lalu dan tidak ada di bulan aktif
- atau user pernah centang item ini sebelumnya dan sekarang belum muncul

### Aturan pengecualian
Jangan rekomendasikan jika:
- item sudah ada di shopping list aktif
- item sudah ditolak user pada sesi analisa ini
- item muncul terlalu jarang dan tidak stabil
- nominal nol atau data terlalu ambigu

## UX Flow

### Flow 1: Buka analisa
1. user buka halaman belanja bulanan
2. klik tab `Analisa AI`
3. sistem menampilkan status `Belum dianalisis`
4. user klik `Tarik data transaksi`

### Flow 2: Generate insight
1. sistem ambil transaksi kategori `03` dan `04`
2. sistem ambil shopping list bulan aktif dan histori 3 bulan
3. sistem grouping item
4. sistem buat rekomendasi
5. sistem tampilkan hasil

### Flow 3: Terapkan hasil
1. user pilih satu atau beberapa item rekomendasi
2. klik `Tambahkan ke daftar`
3. sistem menambahkan item ke shopping list aktif
4. item baru langsung muncul di daftar utama

### Flow 4: Re-analyze
1. user menambah transaksi atau mengubah shopping list
2. klik `Refresh analisa`
3. sistem hitung ulang hasil berdasarkan data terbaru

## Komponen UI

### Header panel
- judul: `Analisa AI Belanja`
- subtitle: `Ringkasan transaksi kategori 03 dan 04`
- tombol refresh

### Ringkasan angka
Tampilkan 4 kartu:
- Total belanja minggu ini
- Total belanja bulan ini
- Total gabungan
- Perubahan vs bulan lalu

### Top item
Daftar item paling sering muncul:
- nama item
- jumlah kemunculan
- total nominal
- badge mingguan / bulanan

### Rekomendasi
Daftar rekomendasi item:
- checkbox
- nama item
- alasan
- estimasi nominal
- prioritas
- tombol add

### Log analisa
Tampilkan status proses:
- memuat transaksi
- mengelompokkan item
- membuat rekomendasi
- selesai

## Data Model yang Perlu Disiapkan

### `ShoppingAIInsight`
```ts
type ShoppingAIInsight = {
  householdId: string;
  monthKey: string;
  generatedAt: string;
  sourceRange: {
    from: string;
    to: string;
  };
  totals: {
    weeklyTotal: number;
    monthlyTotal: number;
    combinedTotal: number;
    previousCombinedTotal: number;
    changePercent: number;
  };
  topItems: Array<{
    normalizedName: string;
    sourceNames: string[];
    frequency: number;
    totalAmount: number;
    sourceCategory: '03' | '04' | 'both';
  }>;
  recommendations: Array<{
    normalizedName: string;
    displayName: string;
    reason: string;
    estimatedAmount: number;
    priority: 'high' | 'medium' | 'low';
    sourceNames: string[];
  }>;
  rejectedNames: string[];
};
```

### `ShoppingAIReview`
Untuk feedback user nanti:
```ts
type ShoppingAIReview = {
  insightId: string;
  normalizedName: string;
  accepted: boolean;
  rejectedReason?: string;
  createdAt: string;
};
```

Untuk MVP, review boleh disimpan lokal dulu atau belum disimpan. Tapi struktur ini sebaiknya disiapkan.

## API / Service Contract

Kalau analisa dilakukan lewat backend/service, kontraknya harus seperti ini:

### Request
```ts
POST /api/shopping/ai/analyze
{
  householdId: string;
  monthKey: string;
}
```

### Response
```ts
{
  summary: {
    weeklyTotal: number;
    monthlyTotal: number;
    combinedTotal: number;
    previousCombinedTotal: number;
    changePercent: number;
  },
  topItems: [],
  recommendations: [],
  transactionCount: number,
  shoppingItemCount: number
}
```

### Add to shopping list
```ts
POST /api/shopping/ai/apply-recommendations
{
  householdId: string;
  monthKey: string;
  items: string[]
}
```

Kalau belum pakai backend endpoint, logic ini boleh dikerjakan di client dulu, tapi struktur response sebaiknya tetap sama.

## Acceptance Criteria

Fitur dianggap selesai kalau:
1. user bisa membuka panel AI di halaman belanja bulanan
2. sistem membaca transaksi kategori `03` dan `04`
3. sistem menampilkan total belanja dan perbandingan bulan sebelumnya
4. sistem menampilkan minimal 3 rekomendasi item bila data cukup
5. user bisa menambahkan rekomendasi ke daftar belanja aktif
6. item yang sudah ada di daftar aktif tidak ikut direkomendasikan lagi
7. hasil analisa tidak error saat data transaksi kosong
8. jika tidak ada transaksi kategori `03` atau `04`, tampilkan state kosong yang jelas

## Empty State dan Error State

### Jika tidak ada transaksi
Tampilkan:
- `Belum ada transaksi kategori belanja mingguan/bulanan untuk dianalisis`

### Jika data shopping list kosong
Tampilkan:
- `Belum ada daftar belanja aktif`

### Jika analisa gagal
Tampilkan:
- `Gagal memproses analisa AI`
- tombol retry

### Jika data terlalu sedikit
Tampilkan:
- `Data belum cukup untuk memberi rekomendasi yang akurat`

## Non-Goals MVP
Jangan masuk dulu ke:
- fine-tuning model
- training model khusus
- prediksi berbasis machine learning kompleks
- integrasi multi-agent
- rekomendasi lintas kategori di luar `03` dan `04`
- sinkronisasi ke semua laporan keuangan
- auto-purchase suggestion ke luar aplikasi

## Definition of Done
PR dianggap selesai kalau:
- panel AI muncul di halaman belanja bulanan
- data transaksi kategori `03` dan `04` berhasil dibaca
- item transaksi dikelompokkan menjadi nama yang lebih bersih
- rekomendasi muncul dan bisa ditambahkan ke list
- empty/error state aman
- hasilnya bisa dipakai user tanpa manual input tambahan

## Urutan Implementasi yang Disarankan
1. bikin service pengambil data transaksi kategori `03` dan `04`
2. bikin fungsi grouping item
3. bikin fungsi rekomendasi rule-based
4. bikin UI panel AI
5. bikin aksi tambah rekomendasi ke shopping list
6. bikin state loading / empty / error
7. baru tambahkan ringkasan natural language dari AI

## Catatan Implementasi Penting
- Jangan jadikan AI satu-satunya sumber kebenaran
- Data transaksi harus tetap menjadi source of truth
- Shopping list manual tetap bisa dipakai tanpa AI
- AI hanya membantu menyusun, meringkas, dan merekomendasikan
- Penggabungan item harus deterministic supaya hasilnya konsisten
