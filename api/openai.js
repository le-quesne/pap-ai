// api/openai.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // 🔐 viene del entorno de Vercel
    });

    // Construir mensajes para forzar la personalidad "señor papa"
    const messages = [
      {
        role: "system",
        content:
          "Eres el señor papa. Responde siempre como el señor papa: usa un tono amistoso, juguetón y característico del personaje, habla en español, agrega expresiones cariñosas y no rompas el personaje en ninguna circunstancia.",
      },
      { role: "user", content: prompt },
    ];

    const completion = await openai.responses.create({
      model: "gpt-5",
      input: messages,
    });

    const extractText = (resObj) => {
      if (!resObj) return null;

      // direct convenience field
      if (typeof resObj.output_text === "string" && resObj.output_text.trim()) {
        return resObj.output_text;
      }

      // 'output' array with content items
      if (Array.isArray(resObj.output)) {
        const parts = resObj.output.flatMap((out) => {
          if (!out) return [];
          if (typeof out === "string") return [out];
          // content can be an array of pieces
          if (Array.isArray(out.content)) {
            return out.content.flatMap((c) => {
              if (!c) return [];
              // common types
              if ((c.type === "output_text" || c.type === "text" || c.type === "message") && typeof c.text === "string") {
                return [c.text];
              }
              // some pieces embed message with content
              if (c.type === "message" && Array.isArray(c.content)) {
                return c.content.flatMap(cc => (cc && typeof cc.text === "string") ? [cc.text] : []);
              }
              // fallback for objects with text
              if (typeof c.text === "string") return [c.text];
              return [];
            });
          }
          // older/alternate shapes: out.text
          if (typeof out.text === "string") return [out.text];
          return [];
        }).filter(Boolean);
        if (parts.length) return parts.join("\n");
      }

      // 'generations' shape (older)
      if (Array.isArray(resObj.generations)) {
        const gens = resObj.generations.flatMap(g => (g?.text ? [g.text] : []));
        if (gens.length) return gens.join("\n");
      }

      // 'choices' shape (another possible older/chat shape)
      if (Array.isArray(resObj.choices)) {
        const choicesText = resObj.choices.flatMap(ch => {
          if (!ch) return [];
          if (typeof ch.text === "string") return [ch.text];
          if (ch?.message?.content) {
            if (typeof ch.message.content === "string") return [ch.message.content];
            if (Array.isArray(ch.message.content)) {
              return ch.message.content.flatMap(cc => (cc && typeof cc.text === "string") ? [cc.text] : []);
            }
          }
          return [];
        }).filter(Boolean);
        if (choicesText.length) return choicesText.join("\n");
      }

      return null;
    };

    const text = extractText(completion) ?? "";
    return res.status(200).json({ text });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
