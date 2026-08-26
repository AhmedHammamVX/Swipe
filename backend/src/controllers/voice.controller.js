// Unversioned IDs like "gemini-1.5-flash" are often removed; override with GEMINI_MODEL if needed.
const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

/**
 * Extract plain text from Gemini generateContent response.
 */
function extractGeminiText(data) {
    const candidate = data?.candidates?.[0];
    if (!candidate) return null;

    const finish = candidate.finishReason;
    if (finish === "SAFETY" || finish === "RECITATION" || finish === "OTHER") {
        return null;
    }

    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) return null;
    for (const part of parts) {
        if (typeof part?.text === "string" && part.text.trim()) {
            return part.text.trim();
        }
    }
    return null;
}

/**
 * Strip optional ```json ... ``` fences models sometimes add.
 */
function normalizeJsonPayload(raw) {
    if (!raw) return raw;
    let s = raw.trim().replace(/```json|```/gi, "").trim();
    const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i;
    const m = s.match(fence);
    if (m) s = m[1].trim();
    return s;
}

/**
 * POST /api/parse-voice — turn speech transcript into structured intent JSON (Gemini).
 */
export const parseVoice = async (req, res) => {
    try {
        const { transcript } = req.body;

        if (transcript === undefined || transcript === null) {
            return res.status(400).json({ message: "transcript is required." });
        }
        const userTranscript =
            typeof transcript === "string" ? transcript.trim() : String(transcript).trim();
        if (!userTranscript) {
            return res.status(400).json({ message: "transcript cannot be empty." });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ message: "Voice parsing is not configured (missing GEMINI_API_KEY)." });
        }

        const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const prompt = `You are a voice command parser for a chat app.
Extract intent from the user's speech and return ONLY valid JSON (no markdown, no explanation).
Allowed actions: "send_message", "read_messages", "open_chat","turn_on_light_mood".

Examples:
- User said something like "send hello to Alice" → {"action":"send_message","to":"Alice","message":"hello"}
- "read my last 3 messages" → {"action":"read_messages","count":3}
- "open chat with Bob" → {"action":"open_chat","to":"Bob"}

User said: ${JSON.stringify(userTranscript)}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 256,
                    responseMimeType: "application/json",
                },
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const msg =
                data?.error?.message ||
                data?.error?.status ||
                response.statusText ||
                "Gemini API error";
            return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
                message: "Failed to parse voice command.",
                detail: msg,
            });
        }

        if (data?.promptFeedback?.blockReason) {
            return res.status(400).json({
                message: "Request was blocked by safety settings.",
                detail: data.promptFeedback.blockReason,
            });
        }

        const rawAssistant = extractGeminiText(data);
        if (!rawAssistant) {
            return res.status(502).json({ message: "Unexpected or empty response from language model." });
        }

        const jsonString = normalizeJsonPayload(rawAssistant);
        let intent;
        try {
            intent = JSON.parse(jsonString);
        } catch {
            return res.status(502).json({
                message: "Model did not return valid JSON.",
                raw: process.env.NODE_ENV === "development" ? rawAssistant : undefined,
            });
        }

        return res.status(200).json(intent);
    } catch (error) {
        console.log("Error in parseVoice controller", error.message);
        return res.status(500).json({ message: "Internal Server Error!" });
    }
};
