import { useState } from "react";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      // Llamada al endpoint del backend en lugar de usar el cliente OpenAI en el navegador
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setOutput(data.text || "⚠️ Sin respuesta 😅");
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

