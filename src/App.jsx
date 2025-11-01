import { useState } from "react";
import OpenAI from "openai";
import "./App.css";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_KEY,
  dangerouslyAllowBrowser: true,
});

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      // { changed code } — usar un mensaje de sistema para forzar la personalidad
      const messages = [
        {
          role: "system",
          content:
            "Eres el señor patata. Responde siempre como el señor patata: usa un tono amistoso, juguetón y característico del personaje, habla en español y no rompas el personaje en ninguna circunstancia.",
        },
        { role: "user", content: input },
      ];

      const response = await client.responses.create({
        model: "gpt-5",
        input: messages,
      });

      // Robust extraction of text from various possible response shapes
      const extractText = (res) => {
        if (!res) return null;
        // direct convenience field
        if (typeof res.output_text === "string" && res.output_text.trim()) {
          return res.output_text;
        }
        // 'output' array with content items
        if (Array.isArray(res.output)) {
          const texts = res.output
            .flatMap((o) => {
              if (!o) return [];
              if (typeof o === "string") return [o];
              if (Array.isArray(o.content)) {
                return o.content
                  .filter(
                    (c) => c && (c.type === "output_text" || c.type === "text")
                  )
                  .map((c) => (typeof c.text === "string" ? c.text : String(c)));
              }
              return [];
            })
            .filter(Boolean);
          if (texts.length) return texts.join("\n");
        }
        // older/alternate 'generations' shape
        if (Array.isArray(res.generations)) {
          const texts = res.generations.flatMap((g) => (g?.text ? [g.text] : []));
          if (texts.length) return texts.join("\n");
        }
        return null;
      };

      const text = extractText(response);
      setOutput(text || "⚠️ No se obtuvo texto en la respuesta.");
    } catch (err) {
      console.error(err);
      setOutput("⚠️ Error: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-root">
      <div className="glitter-bg" aria-hidden="true"></div>

      <main className="app-card">
        <h1 className="title">🥔 Habla con señor Patata</h1>
        <p className="subtitle">
          Hazle una pregunta y obtén respuestas divertidas al estilo del señor
          Patata.
        </p>

        <textarea
          className="input"
          placeholder="Escribe tu pregunta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <div className="controls">
          <button
            onClick={handleSend}
            disabled={loading}
            className="btn"
          >
            {loading ? "Horneando..." : "Enviar"}
          </button>
          {/* puedes añadir más controles aquí si lo deseas */}
        </div>

        {output && <div className="output">{output}</div>}
      </main>
    </div>
  );
}

export default App;

