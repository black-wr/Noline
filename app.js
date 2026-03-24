const minutesEl = document.getElementById("minutes");
const structuredMinutesEl = document.getElementById("structuredMinutes");
const apiKeyEl = document.getElementById("apiKey");
const languageEl = document.getElementById("language");
const liveStatusEl = document.getElementById("liveStatus");
const fileStatusEl = document.getElementById("fileStatus");
const generateStatusEl = document.getElementById("generateStatus");
const audioFileEl = document.getElementById("audioFile");

const startLiveBtn = document.getElementById("startLive");
const stopLiveBtn = document.getElementById("stopLive");
const transcribeFileBtn = document.getElementById("transcribeFile");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

let recognition;
let isLiveActive = false;
let persistedText = "";
let liveFinalText = "";
let liveInterimText = "";

function syncMinutesView() {
  const chunks = [persistedText.trim(), liveFinalText.trim(), liveInterimText.trim()].filter(Boolean);
  minutesEl.value = chunks.join("\n");
}

function appendText(text) {
  if (!text || !text.trim()) return;
  persistedText = [persistedText.trim(), text.trim()].filter(Boolean).join("\n");
  syncMinutesView();
}

function setLiveStatus(text) {
  liveStatusEl.textContent = `Status: ${text}`;
}

function setFileStatus(text) {
  fileStatusEl.textContent = `Status: ${text}`;
}

function setGenerateStatus(text) {
  generateStatusEl.textContent = `Status: ${text}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Gagal membaca file audio."));
    reader.readAsDataURL(file);
  });
}

function getMimeType(file) {
  return file.type && file.type.trim() ? file.type : "audio/mpeg";
}

function extractGeminiText(json) {
  const candidates = json?.candidates || [];
  const parts = candidates[0]?.content?.parts || [];
  return parts
    .filter((part) => typeof part?.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function callGemini({ apiKey, promptText, inlineAudio }) {
  const parts = [{ text: promptText }];
  if (inlineAudio) {
    parts.push({
      inlineData: {
        mimeType: inlineAudio.mimeType,
        data: inlineAudio.base64,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const text = extractGeminiText(result);

  if (!text) {
    throw new Error("Gemini tidak mengembalikan teks.");
  }

  return text;
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setLiveStatus("Browser tidak mendukung SpeechRecognition.");
    startLiveBtn.disabled = true;
    stopLiveBtn.disabled = true;
    return null;
  }

  const recog = new SpeechRecognition();
  recog.continuous = true;
  recog.interimResults = true;
  recog.lang = languageEl.value || "id-ID";

  recog.onstart = () => {
    isLiveActive = true;
    setLiveStatus("mendengarkan dan langsung mencatat...");
  };

  recog.onresult = (event) => {
    const finals = [];
    const interims = [];

    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result[0]?.transcript || "";
      if (result.isFinal) {
        finals.push(text);
      } else {
        interims.push(text);
      }
    }

    liveFinalText = finals.join(" ").trim();
    liveInterimText = interims.join(" ").trim();
    syncMinutesView();

    const preview = liveInterimText || liveFinalText;
    setLiveStatus(`mendengarkan... ${preview.slice(-70)}`);
  };

  recog.onerror = (event) => {
    setLiveStatus(`terjadi error: ${event.error}`);
  };

  recog.onend = () => {
    if (isLiveActive) {
      recog.start();
    } else {
      if (liveFinalText || liveInterimText) {
        persistedText = [persistedText.trim(), liveFinalText.trim(), liveInterimText.trim()].filter(Boolean).join("\n");
        liveFinalText = "";
        liveInterimText = "";
        syncMinutesView();
      }
      setLiveStatus("berhenti.");
    }
  };

  return recog;
}

startLiveBtn.addEventListener("click", () => {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }
  if (!recognition) return;

  recognition.lang = languageEl.value === "id" ? "id-ID" : `${languageEl.value}-${languageEl.value.toUpperCase()}`;

  try {
    isLiveActive = true;
    recognition.start();
  } catch {
    setLiveStatus("sudah berjalan.");
  }
});

stopLiveBtn.addEventListener("click", () => {
  if (!recognition) return;
  isLiveActive = false;
  recognition.stop();
});

transcribeFileBtn.addEventListener("click", async () => {
  const apiKey = apiKeyEl.value.trim();
  const file = audioFileEl.files[0];

  if (!apiKey) {
    setFileStatus("isi Gemini API Key dulu.");
    return;
  }

  if (!file) {
    setFileStatus("pilih file audio dulu.");
    return;
  }

  setFileStatus("membaca file audio...");

  try {
    const base64Audio = await fileToBase64(file);

    const promptByLang = {
      id: "Transkripsikan audio ini ke teks Bahasa Indonesia. Rapikan tanda baca dan pisahkan paragraf bila perlu.",
      en: "Transcribe this audio into English text. Add clean punctuation and paragraph breaks if needed.",
      ms: "Transkripsikan audio ini ke teks Bahasa Melayu. Kemas tanda baca dan perenggan jika perlu.",
    };

    setFileStatus("mengirim ke Gemini untuk transkripsi...");

    const transcript = await callGemini({
      apiKey,
      promptText: promptByLang[languageEl.value] || promptByLang.id,
      inlineAudio: { mimeType: getMimeType(file), base64: base64Audio },
    });

    appendText(`[Transkrip file: ${file.name}]\n${transcript}`);
    setFileStatus("selesai ✅");
  } catch (error) {
    setFileStatus(`gagal: ${error.message}`);
  }
});

generateBtn.addEventListener("click", async () => {
  const apiKey = apiKeyEl.value.trim();
  const rawMinutes = minutesEl.value.trim();

  if (!apiKey) {
    setGenerateStatus("isi Gemini API Key dulu.");
    return;
  }

  if (!rawMinutes) {
    setGenerateStatus("transkrip masih kosong.");
    return;
  }

  setGenerateStatus("menghasilkan notulen rapi...");

  const promptByLang = {
    id: `Kamu adalah sekretaris rapat profesional.
Susun transkrip rapat berikut menjadi notulen yang rapi dalam Bahasa Indonesia.
Format wajib:
1) Ringkasan rapat (3-6 poin)
2) Poin penting / keputusan (bullet points)
3) Daftar tanya jawab peserta (format: Penanya - Pertanyaan - Jawaban)
4) Action items (PIC, tugas, deadline jika ada)
5) Catatan lanjutan
Jika ada informasi yang tidak jelas, tandai sebagai "Perlu klarifikasi".

Transkrip:
${rawMinutes}`,
    en: `You are a professional meeting secretary.
Turn this transcript into clean meeting minutes in English.
Required format:
1) Meeting summary (3-6 bullets)
2) Key points / decisions
3) Q&A list (Asker - Question - Answer)
4) Action items (Owner, task, deadline if available)
5) Follow-up notes
Mark unclear information as "Needs clarification".

Transcript:
${rawMinutes}`,
    ms: `Anda ialah setiausaha mesyuarat profesional.
Susun transkrip ini menjadi minit mesyuarat yang kemas dalam Bahasa Melayu.
Format wajib:
1) Ringkasan mesyuarat (3-6 poin)
2) Poin penting / keputusan
3) Senarai soal jawab (Penanya - Soalan - Jawapan)
4) Action items (PIC, tugas, tarikh akhir jika ada)
5) Nota susulan
Tandakan maklumat tidak jelas sebagai "Perlu penjelasan".

Transkrip:
${rawMinutes}`,
  };

  try {
    const structured = await callGemini({
      apiKey,
      promptText: promptByLang[languageEl.value] || promptByLang.id,
    });

    structuredMinutesEl.value = structured;
    setGenerateStatus("selesai ✅");
  } catch (error) {
    setGenerateStatus(`gagal: ${error.message}`);
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(minutesEl.value);
    alert("Transkrip mentah disalin ke clipboard.");
  } catch {
    alert("Gagal menyalin. Pastikan browser mengizinkan clipboard.");
  }
});

downloadBtn.addEventListener("click", () => {
  const raw = minutesEl.value || "";
  const structured = structuredMinutesEl.value || "";
  const content = `=== TRANSKRIP MENTAH ===\n${raw}\n\n=== NOTULEN RAPI ===\n${structured}`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `notulen-${date}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener("click", () => {
  const confirmed = confirm("Yakin ingin mengosongkan transkrip dan notulen rapi?");
  if (!confirmed) return;
  persistedText = "";
  liveFinalText = "";
  liveInterimText = "";
  syncMinutesView();
  structuredMinutesEl.value = "";
  setGenerateStatus("belum digenerate.");
});

audioFileEl.addEventListener("change", () => {
  const file = audioFileEl.files[0];
  if (!file) {
    setFileStatus("belum ada file.");
    return;
  }
  setFileStatus(`siap: ${file.name} (${Math.round(file.size / 1024)} KB)`);
});
