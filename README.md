# Notulen Pintar (Web App)

Aplikasi web sederhana untuk mencatat notulen dengan dua mode:

1. **Live transcription** dari mikrofon (Web Speech API)
2. **Transkripsi file rekaman audio** yang sudah direkam sebelumnya (OpenAI Audio Transcriptions API)

## Cara menjalankan

Karena ini aplikasi statis, Anda cukup menjalankan server lokal, misalnya:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000` di browser.

## Cara pakai

1. Isi **OpenAI API Key**.
2. Pilih bahasa transkripsi.
3. Untuk mode live: klik **Mulai Live**, lalu **Stop Live**.
4. Untuk rekaman: upload file audio, lalu klik **Transkrip File**.
5. Hasil notulen bisa disalin atau diunduh sebagai `.txt`.

## Catatan penting

- Mode live membutuhkan browser dengan dukungan `SpeechRecognition` (Chrome/Edge modern).
- Kualitas transkripsi dipengaruhi noise lingkungan dan kejernihan audio.
- API key digunakan langsung dari browser pada contoh ini; untuk produksi, disarankan lewat backend agar lebih aman.
