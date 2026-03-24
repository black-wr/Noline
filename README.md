# Notulen Pintar (Web App)

Aplikasi web sederhana untuk mencatat notulen dengan dua mode:

1. **Live transcription** dari mikrofon (Web Speech API)
2. **Transkripsi file rekaman audio** menggunakan **Gemini API**

## Cara menjalankan

```bash
python3 -m http.server 8000
```

Buka `http://localhost:8000` di browser.

## Cara pakai

1. Isi **Gemini API Key**.
2. Pilih bahasa notulen.
3. Untuk mode live: klik **Mulai Live**, lalu **Stop Live**.
4. Untuk rekaman: upload file audio, lalu klik **Transkrip File**.
5. Hasil notulen bisa disalin atau diunduh sebagai `.txt`.

## Catatan penting

- Mode live membutuhkan browser dengan dukungan `SpeechRecognition` (Chrome/Edge modern).
- Transkripsi rekaman menggunakan endpoint Gemini `v1beta/models/gemini-2.0-flash:generateContent` dengan audio `inlineData` (base64).
- Demi keamanan, **jangan hardcode API key** di source code. Untuk production, sebaiknya panggil API lewat backend/proxy.
