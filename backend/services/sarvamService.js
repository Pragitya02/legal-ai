console.log("SARVAM SERVICE LOADED");

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_BASE_URL = "https://api.sarvam.ai";

/**
 * Convert speech (audio buffer) to text using Sarvam's Saaras v3 model.
 * @param {Buffer} fileBuffer - raw audio bytes (wav, mp3, webm, etc.)
 * @param {string} filename - original filename, used for content hints
 * @param {string} languageCode - BCP-47 code, e.g. "hi-IN", "pa-IN", "en-IN", or "unknown" to auto-detect
 */
async function speechToText(fileBuffer, filename = "audio.webm", languageCode = "unknown") {
    if (!SARVAM_API_KEY) {
        throw new Error("SARVAM_API_KEY is not set in .env");
    }

    const form = new FormData();
    form.append("file", new Blob([fileBuffer]), filename);
    form.append("model", "saaras:v3");
    form.append("mode", "transcribe");
    form.append("language_code", languageCode);

    const res = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
        method: "POST",
        headers: {
            "api-subscription-key": SARVAM_API_KEY,
        },
        body: form,
    });

    if (!res.ok) {
        // Consume the body but don't include it in the thrown error —
        // the STT route only logs err.message server-side, and the
        // raw provider response isn't needed for that; the status
        // code is enough to diagnose a failed call.
        await res.text();
        throw new Error(`Sarvam STT failed (${res.status})`);
    }

    const data = await res.json();

    return {
        transcript: data.transcript,
        languageCode: data.language_code,
    };
}

/**
 * Convert text to speech using Sarvam's Bulbul v3 model.
 * @param {string} text - text to speak (max 2500 chars per Sarvam's limit)
 * @param {string} languageCode - BCP-47 code, e.g. "hi-IN", "pa-IN", "en-IN"
 * @param {string} speaker - voice name, defaults to "shubh"
 * @returns {Promise<string>} base64-encoded WAV audio
 */
async function textToSpeech(
  text,
  languageCode = "en-IN",
  speaker = "shubh"
) {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY is not set in .env");
  }

  const res = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      target_language_code: languageCode,
      model: "bulbul:v3",
      speaker: speaker || "shubh",
      speech_sample_rate: 22050,
    }),
  });

  if (!res.ok) {
    // Don't log the raw provider response body: it can echo back part
    // of the requested text or other provider-internal detail. The
    // status code is enough for server-side debugging.
    const errText = await res.text();
    console.error("SARVAM TTS FAILED:", res.status);
    throw new Error(`Sarvam TTS failed (${res.status})`);
  }

  const data = await res.json();

  if (!data.audios || !data.audios[0]) {
    throw new Error("Sarvam TTS returned no audio");
  }

  return data.audios[0];
}

module.exports = { speechToText, textToSpeech };
