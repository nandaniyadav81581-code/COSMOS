import { useState } from "react";
import { askQuestion, type AskResponse } from "../api/ask";
import { AnswerCard } from "../components/AnswerCard";
import { NeedsApi } from "../components/NeedsApi";
import { CosmicLoader, GlassCard } from "../components/ui";

const EXAMPLES = [
  "What techniques are used to detect spacecraft faults?",
  "How is computer vision used for spacecraft navigation?",
  "How are spacecraft becoming autonomous?",
];

type Turn = { id: number; question: string; result?: AskResponse; error?: string };

function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const busy = turns.some((t) => !t.result && !t.error);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const id = Date.now();
    setTurns((ts) => [...ts, { id, question: q }]);
    setText("");
    try {
      const result = await askQuestion(q);
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, result } : t)));
    } catch (e) {
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, error: (e as Error).message } : t)));
    }
  };

  return (
    <>
      {turns.length === 0 && (
        <GlassCard className="mt-8 p-6">
          <p className="text-sm font-semibold">Try asking</p>
          <div className="mt-3 flex flex-col gap-2">
            {EXAMPLES.map((q) => (
              <button key={q} type="button" onClick={() => void ask(q)} className="rounded-xl bg-white/60 px-4 py-2.5 text-left text-sm hover:bg-white">{q}</button>
            ))}
          </div>
        </GlassCard>
      )}
      <div className="mt-8 space-y-8" aria-live="polite">
        {turns.map((t) => (
          <section key={t.id}>
            <p className="mb-3 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-violet-500 px-4 py-2.5 text-white">{t.question}</p>
            {!t.result && !t.error && <CosmicLoader label="Retrieving papers and checking the evidence…" />}
            {t.error && <GlassCard className="p-4 text-sm">Couldn't reach the assistant: {t.error}</GlassCard>}
            {t.result && <AnswerCard r={t.result} />}
          </section>
        ))}
      </div>
      <form className="sticky bottom-4 mt-8" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <label htmlFor="assistant-q" className="sr-only">Your question</label>
        <div className="glass flex gap-2 rounded-2xl p-2">
          <input id="assistant-q" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000}
            placeholder="Ask a question about space research…" className="h-11 flex-1 bg-transparent px-3 focus:outline-none" />
          <button type="submit" disabled={busy || !text.trim()} className="h-11 rounded-xl bg-violet-500 px-5 font-medium text-white disabled:opacity-40">Ask</button>
        </div>
      </form>
    </>
  );
}

export function AssistantPage() {
  return (
    <div className="container-cosmos max-w-4xl py-10">
      <p className="eyebrow">Research assistant</p>
      <h1 className="mt-1 text-3xl font-semibold">Ask the research corpus</h1>
      <p className="mt-2 text-navy-500">Answers come only from retrieved papers, and every sentence cites its source. If the corpus doesn't hold enough evidence, the assistant says so.</p>
      <NeedsApi feature="The research assistant"><Chat /></NeedsApi>
    </div>
  );
}
