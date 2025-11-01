// api/openai.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic } = req.body ?? {};

  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "Missing topic" });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt =
      "Eres un creador de adivinanzas en español. Tus enigmas son educativos, divertidos y siempre incluyen una explicación breve de la respuesta correcta.";

    const userPrompt = `Genera una única adivinanza original sobre el tema "${topic}". Devuelve únicamente un objeto JSON con esta estructura exacta:
{
  "clue": "Texto de la adivinanza (máximo 2 frases)",
  "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "answer": "Debe coincidir exactamente con una de las opciones",
  "funFact": "Dato curioso o explicación de 1 frase"
}
Las opciones deben ser distintas, plausibles y en español. No incluyas texto adicional ni formato de código.`;

    const completion = await openai.responses.create({
      model: "gpt-5",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const extractText = (resObj) => {
      if (!resObj) return null;

      if (typeof resObj.output_text === "string" && resObj.output_text.trim()) {
        return resObj.output_text;
      }

      if (Array.isArray(resObj.output)) {
        const parts = resObj.output
          .flatMap((out) => {
            if (!out) return [];
            if (typeof out === "string") return [out];
            if (Array.isArray(out.content)) {
              return out.content.flatMap((c) => {
                if (!c) return [];
                if (
                  (c.type === "output_text" || c.type === "text" || c.type === "message") &&
                  typeof c.text === "string"
                ) {
                  return [c.text];
                }
                if (c.type === "message" && Array.isArray(c.content)) {
                  return c.content.flatMap((cc) =>
                    cc && typeof cc.text === "string" ? [cc.text] : []
                  );
                }
                if (typeof c.text === "string") return [c.text];
                return [];
              });
            }
            if (typeof out.text === "string") return [out.text];
            return [];
          })
          .filter(Boolean);
        if (parts.length) return parts.join("\n");
      }

      if (Array.isArray(resObj.generations)) {
        const gens = resObj.generations.flatMap((g) => (g?.text ? [g.text] : []));
        if (gens.length) return gens.join("\n");
      }

      if (Array.isArray(resObj.choices)) {
        const choicesText = resObj.choices
          .flatMap((ch) => {
            if (!ch) return [];
            if (typeof ch.text === "string") return [ch.text];
            if (ch?.message?.content) {
              if (typeof ch.message.content === "string") return [ch.message.content];
              if (Array.isArray(ch.message.content)) {
                return ch.message.content.flatMap((cc) =>
                  cc && typeof cc.text === "string" ? [cc.text] : []
                );
              }
            }
            return [];
          })
          .filter(Boolean);
        if (choicesText.length) return choicesText.join("\n");
      }

      return null;
    };

    const text = extractText(completion) ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No se pudo generar un JSON válido para la adivinanza");
    }

    let riddle;
    try {
      riddle = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      throw new Error("Respuesta de OpenAI con formato inesperado");
    }

    if (
      !riddle ||
      typeof riddle.clue !== "string" ||
      !Array.isArray(riddle.options) ||
      riddle.options.length < 2 ||
      typeof riddle.answer !== "string" ||
      typeof riddle.funFact !== "string"
    ) {
      throw new Error("La adivinanza generada no tiene la estructura esperada");
    }

    if (!riddle.options.includes(riddle.answer)) {
      throw new Error("La respuesta correcta debe estar incluida entre las opciones");
    }

    return res.status(200).json({ riddle });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
