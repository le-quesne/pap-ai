import { useMemo, useRef, useState } from "react";
import "./App.css";

const TOPICS = [
  {
    id: "animales",
    label: "Animales",
    description: "Fauna terrestre, aérea y marina, comportamientos y hábitats.",
  },
  {
    id: "ciencia",
    label: "Ciencia",
    description: "Conceptos y descubrimientos científicos cotidianos.",
  },
  {
    id: "comida",
    label: "Comida",
    description: "Platos, ingredientes y curiosidades gastronómicas.",
  },
  {
    id: "historia",
    label: "Historia",
    description: "Eventos y personajes históricos relevantes del mundo.",
  },
];

const TOPIC_EMOJIS = {
  animales: "🦊",
  ciencia: "🔬",
  comida: "🍉",
  historia: "📜",
};

function App() {
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [currentRiddle, setCurrentRiddle] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const topicMap = useMemo(
    () => Object.fromEntries(TOPICS.map((topic) => [topic.id, topic])),
    []
  );

  const selectedTopic = selectedTopicId ? topicMap[selectedTopicId] : null;

  async function fetchRiddleByTopic(topicId) {
    const topic = topicMap[topicId];
    if (!topic) return;

    const promptTopic = topic.description
      ? `${topic.label}. ${topic.description}`
      : topic.label;

    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError("");
    setFeedback("");
    setSelectedOption(null);
    setCurrentRiddle(null);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: promptTopic }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "" }));
        const message = payload?.error || "No se pudo generar la adivinanza.";
        throw new Error(message);
      }

      const data = await response.json();
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!data?.riddle) {
        throw new Error("No se recibió una adivinanza válida.");
      }

      setCurrentRiddle(data.riddle);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Ocurrió un error inesperado.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  function startTopic(topicId) {
    if (!topicMap[topicId]) return;
    setSelectedTopicId(topicId);
    fetchRiddleByTopic(topicId);
  }

  function handleOptionSelect(option) {
    if (!currentRiddle || feedback || isLoading) return;
    setSelectedOption(option);
    if (option === currentRiddle.answer) {
      setFeedback("🎉 ¡Correcto! " + currentRiddle.funFact);
    } else {
      setFeedback("❌ Casi. La respuesta correcta es " + currentRiddle.answer + ".");
    }
  }

  function handleNextRiddle() {
    if (!selectedTopic || isLoading) return;
    fetchRiddleByTopic(selectedTopic.id);
  }

  function handleReset() {
    requestIdRef.current += 1;
    setSelectedTopicId(null);
    setCurrentRiddle(null);
    setSelectedOption(null);
    setFeedback("");
    setError("");
    setIsLoading(false);
  }

  return (
    <div className="app-root">
      <div className="glitter-bg" aria-hidden="true"></div>

      <main className="app-card">
        <h1 className="title">🎯 Juego de adivinanzas</h1>
        <p className="subtitle">
          Elige un tema, lee la pista y selecciona la respuesta correcta. ¿Qué
          tan buen detective eres?
        </p>

        {!selectedTopic && (
          <section className="topic-section">
            <h2 className="section-title">1. Elige un tema</h2>
            <div className="topic-grid">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  className="topic-btn"
                  onClick={() => startTopic(topic.id)}
                >
                  <span className="topic-emoji" aria-hidden="true">
                    {TOPIC_EMOJIS[topic.id] ?? "🎲"}
                  </span>
                  {topic.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedTopic && (
          <section className="riddle-section">
            <div className="riddle-header">
              <button className="link-btn" onClick={handleReset}>
                ← Cambiar de tema
              </button>
              <span className="badge">Tema: {selectedTopic.label}</span>
            </div>
            <div className="riddle-card">
              <h2 className="section-title">2. Resuelve la adivinanza</h2>
              {isLoading && (
                <p className="status-message loading-message">
                  ✨ Generando una nueva adivinanza...
                </p>
              )}

              {error && !isLoading && (
                <div className="status-message error-message">
                  <p>{error}</p>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => fetchRiddleByTopic(selectedTopic.id)}
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}

              {currentRiddle && !isLoading && !error && (
                <>
                  <p className="riddle-clue">{currentRiddle.clue}</p>

                  <div className="choices">
                    {currentRiddle.options.map((option) => {
                      const isSelected = option === selectedOption;
                      const isCorrect = option === currentRiddle.answer;
                      const showResult = feedback !== "";
                      const stateClass = [
                        "choice",
                        isSelected ? "is-selected" : "",
                        showResult && isCorrect ? "is-correct" : "",
                        showResult && isSelected && !isCorrect ? "is-incorrect" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <button
                          key={option}
                          className={stateClass}
                          onClick={() => handleOptionSelect(option)}
                          disabled={feedback !== "" || isLoading}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {feedback && <p className="feedback">{feedback}</p>}
                </>
              )}

              <div className="controls">
                <button
                  className="btn"
                  onClick={handleNextRiddle}
                  disabled={isLoading || !selectedTopic}
                >
                  Otra adivinanza
                </button>
                <button className="ghost-btn" onClick={handleReset}>
                  Elegir otro tema
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

