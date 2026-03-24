# Notulen Pintar (Web App)

Aplikasi web untuk mencatat notulen rapat dengan 2 alur:

1. **Live transcription real-time** dari mikrofon (teks interim langsung terlihat, lalu otomatis difinalkan tanpa perlu stop dulu)
2. **Transkripsi file rekaman audio** via **Gemini API**

Selain itu, aplikasi bisa **generate notulen rapi otomatis** dari transkrip mentah:
- ringkasan rapat,
- poin/keputusan penting,
- daftar tanya jawab peserta,
- action items.

## Cara menjalankan

```bash
python3 -m http.server 8000
```

Buka `http://localhost:8000` di browser.

## Cara pakai

1. Isi **Gemini API Key**.
2. Klik **Mulai Live** untuk transkrip real-time (atau upload file audio lalu klik **Transkrip File**).
3. Setelah transkrip terkumpul, klik **Generate Notulen Rapi**.
4. Simpan hasil dengan **Unduh .txt**.

## Catatan penting

- Browser live transcription: Chrome/Edge modern (dukungan `SpeechRecognition`).
- Endpoint Gemini yang dipakai: `v1beta/models/gemini-2.0-flash:generateContent`.
- Jangan hardcode API key di source code. Untuk production, gunakan backend/proxy.
