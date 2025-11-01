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

    const completion = await openai.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    const text =
      completion.output
        ?.flatMap(o => o.content)
        ?.filter(c => c.type === "output_text")
        ?.map(c => c.text)
        ?.join("\n") ?? "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: err.message });
  }
}
