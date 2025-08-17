import React, { useEffect, useMemo, useState } from "react";

const LS_KEY = "matching_game_dataset_v1";
const LS_SETTINGS = "matching_game_settings_v1";

const SAMPLE_DATA = `
polite — shows good manners and respect
rude — not polite; impolite or offensive
shy — nervous or uncomfortable with people
confident — sure of yourself; not shy
hard-working — puts in a lot of effort
lazy — not liking to work or be active
creative — good at thinking of new ideas
honest — tells the truth; not lying
patient — able to wait calmly
impatient — not able to wait; easily annoyed
curly — with a lot of curls (hair)
straight — not curly or wavy (hair)
tall — of great height
short — of little height
slim — thin in a healthy way
plump — a little fat in a pleasant way
friendly — kind and pleasant to others
moody — changes feelings often and quickly
outgoing — sociable; enjoys meeting people
quiet — speaks little; not noisy
`;

function parsePairs(text) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = line.split(/\s*[—:-]\s+|,\s+/);
    if (m.length >= 2) {
      const term = m[0].trim();
      const def = m.slice(1).join(" ").trim();
      if (term && def) out.push({ term, def });
    }
  }
  return out;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function buildDeck(pairs) {
  return pairs.map((p) => ({ id: uid(), term: p.term, def: p.def, key: p.term + "::" + p.def }));
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function useHashState(initialText) {
  const [hashText, setHashText] = useState(() => {
    try {
      const h = decodeURIComponent(window.location.hash.slice(1));
      return h || initialText;
    } catch {
      return initialText;
    }
  });
  useEffect(() => {
    const onHash = () => {
      try {
        setHashText(decodeURIComponent(window.location.hash.slice(1)) || initialText);
      } catch {
        setHashText(initialText);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [initialText]);
  const updateHash = (text) => {
    try {
      window.location.hash = encodeURIComponent(text);
    } catch {
      // ignore
    }
  };
  return [hashText, updateHash];
}

export default function App() {
  const [hashData, setHashData] = useHashState("");
  const [rawText, setRawText] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved || hashData || SAMPLE_DATA;
  });
  useEffect(() => {
    if (hashData && hashData !== rawText) setRawText(hashData);
  }, [hashData]); // eslint-disable-line

  const allPairs = useMemo(() => {
    const parsed = parsePairs(rawText);
    return buildDeck(parsed);
  }, [rawText]);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(LS_SETTINGS);
    return saved
      ? JSON.parse(saved)
      : { roundSize: 8, timerOn: false, timerSec: 180, immediateFeedback: true };
  });
  useEffect(() => localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)), [settings]);

  const [pool, setPool] = useState(() => shuffle(allPairs).slice(0, Math.min(settings.roundSize, allPairs.length)));
  useEffect(() => {
    setPool(shuffle(allPairs).slice(0, Math.min(settings.roundSize, allPairs.length)));
  }, [allPairs, settings.roundSize]);

  const [left, setLeft] = useState(() => shuffle(pool).map((p) => ({ ...p })));
  const [right, setRight] = useState(() => shuffle(pool).map((p) => ({ ...p })));
  const [matched, setMatched] = useState({});
  const [selLeft, setSelLeft] = useState(null);
  const [selRight, setSelRight] = useState(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLeft(shuffle(pool).map((p) => ({ ...p })));
    setRight(shuffle(pool).map((p) => ({ ...p })));
    setMatched({});
    setSelLeft(null);
    setSelRight(null);
    setScore(0);
    setMistakes(0);
    setStreak(0);
    setMessage("");
  }, [pool]);

  const [timeLeft, setTimeLeft] = useState(settings.timerSec);
  useEffect(() => setTimeLeft(settings.timerSec), [settings.timerSec, pool]);
  useEffect(() => {
    if (!settings.timerOn) return;
    if (Object.keys(matched).length >= pool.length) return;
    if (timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [settings.timerOn, timeLeft, matched, pool.length]);

  function tryMatch(leftItem, rightItem) {
    const isCorrect = leftItem.key === rightItem.key;
    if (isCorrect) {
      setMatched((m) => ({ ...m, [leftItem.key]: true }));
      setScore((s) => s + 100 + streak * 10);
      setStreak((st) => st + 1);
      setMessage("✔️ Correct!");
    } else {
      setMistakes((x) => x + 1);
      setStreak(0);
      setMessage("✖️ Try again");
    }
  }

  useEffect(() => {
    if (selLeft && selRight) {
      tryMatch(selLeft, selRight);
      setSelLeft(null);
      setSelRight(null);
    }
  }, [selLeft, selRight]);

  const finished = Object.keys(matched).length >= pool.length && pool.length > 0;

  function reshuffle() {
    setPool(shuffle(allPairs).slice(0, Math.min(settings.roundSize, allPairs.length)));
  }

  function resetSameRound() {
    setLeft(shuffle(pool).map((p) => ({ ...p })));
    setRight(shuffle(pool).map((p) => ({ ...p })));
    setMatched({});
    setSelLeft(null);
    setSelRight(null);
    setScore(0);
    setMistakes(0);
    setStreak(0);
    setMessage("");
    setTimeLeft(settings.timerSec);
  }

  function saveToLocal() {
    localStorage.setItem(LS_KEY, rawText);
    setMessage("💾 Saved locally");
  }

  function useSample() {
    setRawText(SAMPLE_DATA.trim());
    setHashData("");
  }

  function copyShareLink() {
    const toShare = rawText.trim();
    const newHash = encodeURIComponent(toShare);
    const url = `${window.location.origin}${window.location.pathname}#${newHash}`;
    navigator.clipboard.writeText(url);
    setMessage("🔗 Link copied!");
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Matching Game: Words ↔ Definitions</h1>
            <p className="text-sm text-slate-500 mt-1">Click a word, then a definition to make a pair. Great for vocab drills, warm-ups, and quizzes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={resetSameRound} className="px-3 py-2 rounded-xl bg-white shadow border hover:bg-slate-50">Reset</button>
            <button onClick={reshuffle} className="px-3 py-2 rounded-xl bg-indigo-600 text-white shadow hover:bg-indigo-700">New Round</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Score" value={score} />
          <Stat label="Streak" value={streak} />
          <Stat label="Mistakes" value={mistakes} />
          <Stat label={settings.timerOn ? "Time" : "Pairs"} value={settings.timerOn ? secToClock(timeLeft) : `${Object.keys(matched).length}/${pool.length}`} danger={settings.timerOn && timeLeft <= 10} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Column title="Words" items={left} matched={matched} selected={selLeft} setSelected={setSelLeft} side="left" />
          <Column title="Definitions" items={right} matched={matched} selected={selRight} setSelected={setSelRight} side="right" />
        </div>

        {message && !finished && (
          <div className="mb-4 text-center"><span className="inline-block px-3 py-2 rounded-xl bg-white border shadow text-sm">{message}</span></div>
        )}

        {finished && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl mb-6 flex items-center justify-between">
            <div>
              <p className="font-semibold">🎉 Great job! You matched all pairs.</p>
              <p className="text-sm">Score: {score} · Mistakes: {mistakes}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetSameRound} className="px-3 py-2 rounded-xl bg-white shadow border">Play again</button>
              <button onClick={reshuffle} className="px-3 py-2 rounded-xl bg-indigo-600 text-white shadow">New round</button>
            </div>
          </div>
        )}

        <details className="bg-white rounded-2xl border shadow p-4 open:shadow-md">
          <summary className="cursor-pointer font-semibold text-slate-700">Teacher Panel</summary>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-600">Paste pairs (one per line). Separators accepted: “term — definition”, “term - definition”, “term: definition”, or “term, definition”.</label>
              <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} className="mt-2 w-full h-56 rounded-xl border p-3 font-mono text-sm" placeholder="word — definition" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={saveToLocal} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save</button>
                <button onClick={() => setHashData(rawText)} className="px-3 py-2 rounded-xl bg-white border">Update URL</button>
                <button onClick={copyShareLink} className="px-3 py-2 rounded-xl bg-white border">Copy share link</button>
                <button onClick={useSample} className="px-3 py-2 rounded-xl bg-white border">Load sample</button>
                <button onClick={() => setPool(shuffle(allPairs).slice(0, Math.min(settings.roundSize, allPairs.length)))} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Apply & Start</button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 border rounded-2xl p-4">
                <h3 className="font-semibold mb-2">Round Settings</h3>
                <label className="block text-sm">Pairs in a round: {settings.roundSize}</label>
                <input type="range" min={4} max={Math.max(4, allPairs.length)} value={settings.roundSize} onChange={(e) => setSettings((s) => ({ ...s, roundSize: parseInt(e.target.value, 10) }))} className="w-full" />
                <div className="mt-3 flex items-center gap-2">
                  <input id="timer" type="checkbox" checked={settings.timerOn} onChange={(e) => setSettings((s) => ({ ...s, timerOn: e.target.checked }))} />
                  <label htmlFor="timer" className="text-sm">Enable timer</label>
                </div>
                {settings.timerOn && (
                  <div className="mt-2">
                    <label className="block text-sm">Seconds: </label>
                    <input type="number" min={10} step={10} value={settings.timerSec} onChange={(e) => setSettings((s) => ({ ...s, timerSec: Math.max(10, parseInt(e.target.value || "0", 10)) }))} className="mt-1 w-32 rounded border p-2" />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <input id="feedback" type="checkbox" checked={settings.immediateFeedback} onChange={(e) => setSettings((s) => ({ ...s, immediateFeedback: e.target.checked }))} />
                  <label htmlFor="feedback" className="text-sm">Immediate feedback message</label>
                </div>
              </div>
              <div className="bg-slate-50 border rounded-2xl p-4 text-sm text-slate-600">
                <h3 className="font-semibold text-slate-700 mb-1">Tips</h3>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Paste your own list of pairs and press <span className="font-medium">Apply & Start</span>.</li>
                  <li>Use <span className="font-medium">Update URL</span> → <span className="font-medium">Copy share link</span> to share a live game.</li>
                  <li>For Canva: host this app (e.g., Vercel/Netlify) and embed the URL via <span className="font-medium">Apps → Embed</span>.</li>
                  <li>Short on time? Enable the timer for a quick challenge.</li>
                </ul>
              </div>
            </div>
          </div>
        </details>

        <footer className="mt-8 text-center text-xs text-slate-400">© Matching Words with Definitions — built for teachers & students</footer>
      </div>
    </div>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div className={`bg-white rounded-2xl border shadow p-4 ${danger ? "ring-2 ring-rose-300" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Column({ title, items, matched, selected, setSelected, side }) {
  return (
    <div className="bg-white border rounded-2xl shadow p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="grid grid-cols-1 gap-2">
        {items.map((it, idx) => {
          const isMatched = !!matched[it.key];
          const isSelected = selected?.id === it.id;
          return (
            <button
              key={it.id}
              disabled={isMatched}
              onClick={() => setSelected(isSelected ? null : it)}
              className={
                "text-left w-full px-3 py-3 rounded-xl border shadow-sm transition active:scale-[0.99] " +
                (isMatched
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : isSelected
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white hover:bg-slate-50")
              }
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-mono rounded-full bg-slate-100 border">{idx + 1}</span>
                <span>{side === "left" ? it.term : it.def}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function secToClock(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}
