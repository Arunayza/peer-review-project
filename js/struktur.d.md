# Struktur & Arsitektur Sistem: PeerReview Pro

Platform web aplikasi kolaboratif untuk pengujian proyek (*peer review*), penilaian UX, iterasi perbaikan (*refactoring*), dan *mini showcase* lintas sekolah yang terintegrasi secara real-time.

---

## 1. Arsitektur & Peran Pengguna (Multi-Role & Authentication Guard)
Aplikasi mendukung 3 hak akses utama (*roles*) dengan sistem keamanan agar siswa tidak dapat masuk ke panel pengelola:
1. **Admin (God Mode)**:
   - Masuk menggunakan **Password Master Khusus Admin**.
   - Mengelola daftar Sekolah (Tambah, Ubah, Hapus).
   - Mengelola akun Pengajar dan menetapkan pengajar ke sekolah tertentu.
   - Memiliki akses penuh (*God Mode*) untuk melihat, memantau, dan menghapus data di seluruh sekolah dan kelas.
2. **Pengajar (Teacher)**:
   - Masuk menggunakan **Akun / Password Pengajar** yang valid di sekolah yang telah ditetapkan oleh Admin.
   - Mengelola kelas/rombel di sekolah tersebut (Membuat kelas, menghapus kelas).
   - Menetapkan **Kode Akses Kelas** untuk setiap rombel.
   - Menambahkan daftar siswa ke dalam kelas/rombel.
   - Memantau rekap hasil peer review dan status perbaikan project dari para siswa di kelasnya melalui dashboard kelas.
3. **Siswa (Student)**:
   - Memilih sekolah dan kelas/rombel yang dituju.
   - Memasukkan **Kode Akses Kelas** yang diberikan oleh pengajar.
   - Memilih nama diri sendiri dari daftar dropdown siswa di kelas tersebut (tanpa verifikasi password untuk mempermudah perpindahan antar komputer saat sesi lab).
   - Dilengkapi dengan catatan *warning* agar siswa tidak iseng atau sengaja menggunakan nama teman.
   - Berperan dalam dua alur utama:
     - **Tester**: Menguji project teman, mengisi worksheet evaluasi berbasis standar PDF (Bagian A–E: Pemanasan, Checklist Beta Testing, Rating Bintang 1-5 dengan **default 0 dan tidak ada yang tercetak otomatis**, serta Feedback).
     - **Creator**: Menerima daftar review masuk dari tester, melihat hasil review, melakukan perbaikan/iterasi (*refactoring*), re-testing, dan menyimpan hasilnya ke dashboard pengajar.

---

## 2. Alur Navigasi & Struktur Halaman

### A. Halaman Utama / Dashboard Global
- Menampilkan daftar sekolah secara global (Contoh: *SD Islam Bunga Bangsa Samarinda*, *SMP Islam Bunga Bangsa Samarinda*, *SMPN 16 Samarinda*).
- Tombol akses login terpisah untuk Admin dan Pengajar.

### B. Halaman Kelas / Rombel
- **Flow untuk Siswa**: Pilih sekolah $\rightarrow$ Pilih kelas $\rightarrow$ Masukkan Kode Akses Kelas $\rightarrow$ Pilih Nama Sendiri.
- **Flow untuk Pengajar**: Setelah login guru $\rightarrow$ Masuk ke sekolah $\rightarrow$ Tambah/Kelola Kelas & Daftar Siswa. Di dalam halaman kelas, guru dapat melihat daftar rekap siswa secara *live* (Contoh: `1. Adam - Selesai - [Lihat Detail Worksheet]`).
- **Flow untuk Admin**: Kontrol penuh (*God Mode*) untuk modifikasi lintas sekolah dan kelas.

### C. Alur Kerja Worksheet Interaktif (Sesuai Standar PDF)
1. **Bagian A (Pemanasan)**: Mengisi konsep dasar (*Beta Testing*, *UX*, *Feedback*).
2. **Bagian B (Kenali Aplikasinya)**: Memilih nama Creator, nama aplikasi, dan tujuan aplikasi.
3. **Bagian C (Beta Testing)**: Checklist pengujian aplikasi (8 poin status OK / Perlu Diperbaiki) beserta catatan temuan penting.
4. **Bagian D (Rating UX 1-5)**: Penilaian aspek UX menggunakan **Bintang** (secara *default* bernilai **0** dan pengguna wajib memilih secara interaktif).
5. **Bagian E (Feedback untuk Developer)**: Kolom interaktif untuk *Praise*, *Finding*, dan *Suggestion*.
6. **Bagian F - J (Peran Creator / Iterasi & Re-testing)**:
   - Creator mendapati daftar review masuk.
   - Creator dapat memilih opsi *"Project sudah 100% aman (Tanpa perbaikan)"* atau mengisi modul yang diperbaiki beserta catatan perbaikannya.
   - Melakukan *re-testing* (Bagian G), refleksi singkat (Bagian I), dan *Checklist Selesai* (Bagian J).
   - Tombol **Simpan/Save Hasil** mengirim data secara *real-time* ke dashboard pengajar di dalam daftar kelas.

---

## 3. Struktur Teknis & Tech Stack
- **Frontend**: HTML5, Tailwind CSS (via CDN), Vanilla JavaScript (ES6 Modules).
- **Backend & Database**: Firebase Realtime Database (untuk sinkronisasi *real-time* multi-komputer di lab).
- **Struktur File Proyek (Modular)**:
  ```text
  /peer-review-pro
  ├── index.html           # Halaman utama, routing & template views
  ├── style.css            # Kustomisasi animasi & style tambahan
  └── js/
      ├── firebase.js      # Konfigurasi & koneksi Firebase Database
      └── app.js           # Logika utama (Auth, Role management, Tester/Creator workflow)