const minutesEl = document.getElementById("minutes");
const apiKeyEl = document.getElementById("apiKey");
const languageEl = document.getElementById("language");
const liveStatusEl = document.getElementById("liveStatus");
const fileStatusEl = document.getElementById("fileStatus");
const audioFileEl = document.getElementById("audioFile");

const startLiveBtn = document.getElementById("startLive");
const stopLiveBtn = document.getElementById("stopLive");
const transcribeFileBtn = document.getElementById("transcribeFile");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

let recognition;
let isLiveActive = false;

function appendText(text) {
  const prefix = minutesEl.value.trim().length > 0 ? "\n" : "";
  minutesEl.value += `${prefix}${text.trim()}`;
}

function setLiveStatus(text) {
  liveStatusEl.textContent = `Status: ${text}`;
}

function setFileStatus(text) {
  fileStatusEl.textContent = `Status: ${text}`;
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

  let finalBuffer = "";

  recog.onstart = () => {
    isLiveActive = true;
    setLiveStatus("mendengarkan...");
  };

  recog.onresult = (event) => {
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        finalBuffer += `${result[0].transcript} `;
      } else {
        interimText += result[0].transcript;
      }
    }

    const previewText = finalBuffer + interimText;
    setLiveStatus(`mendengarkan... ${previewText.slice(-70)}`);
  };

  recog.onerror = (event) => {
    setLiveStatus(`terjadi error: ${event.error}`);
  };

  recog.onend = () => {
    if (finalBuffer.trim()) {
      appendText(finalBuffer.trim());
      finalBuffer = "";
    }

    if (isLiveActive) {
      recog.start();
    } else {
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
    setFileStatus("mengirim ke Gemini untuk transkripsi...");

    const promptByLang = {
      id: "Transkripsikan audio ini ke teks Bahasa Indonesia. Rapikan tanda baca dan pisahkan paragraf bila perlu.",
      en: "Transcribe this audio into English text. Add clean punctuation and paragraph breaks if needed.",
      ms: "Transkripsikan audio ini ke teks Bahasa Melayu. Kemas tanda baca dan perenggan jika perlu.",
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptByLang[languageEl.value] || promptByLang.id },
                {
                  inlineData: {
                    mimeType: getMimeType(file),
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const transcript = extractGeminiText(result);

    if (!transcript) {
      throw new Error("Gemini tidak mengembalikan teks transkrip.");
    }

    appendText(`[Transkrip file: ${file.name}]\n${transcript}`);
    setFileStatus("selesai ✅");
  } catch (error) {
    setFileStatus(`gagal: ${error.message}`);
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(minutesEl.value);
    alert("Notulen disalin ke clipboard.");
  } catch {
    alert("Gagal menyalin. Pastikan browser mengizinkan clipboard.");
  }
});

downloadBtn.addEventListener("click", () => {
  const content = minutesEl.value || "";
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
  const confirmed = confirm("Yakin ingin mengosongkan notulen?");
  if (!confirmed) return;
  minutesEl.value = "";
});

audioFileEl.addEventListener("change", () => {
  const file = audioFileEl.files[0];
  if (!file) {
    setFileStatus("belum ada file.");
    return;
  }
  setFileStatus(`siap: ${file.name} (${Math.round(file.size / 1024)} KB)`);
});
