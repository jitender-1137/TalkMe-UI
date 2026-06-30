// Client-side "smart reply" suggestions — no server, no API keys.
//
// Two layers, used together for an instant-but-smart feel:
//   1. instantSuggestions()  — zero-dependency intent heuristics. Returns
//      immediately so the chips render with no delay (and greeting seeds when
//      the chat is empty / it's the first message).
//   2. rankSuggestions()     — lazy, in-browser semantic ranking with the
//      open-source `Xenova/all-MiniLM-L6-v2` embedding model (Transformers.js,
//      ~23MB, fetched + cached once, runs on WASM/WebGPU). It ranks a curated
//      candidate pool by relevance to the last incoming message.
//
// The model is dynamic-imported so it never touches the main bundle — it loads
// the first time suggestions are actually requested.

/** Friendly openers shown when there's nothing to reply to yet. */
export const GREETING_SEEDS = [
  "Hi 👋", "Hello!", "Hey, how are you?", "What's up?", "Good to see you!", "How's it going?", "Hey there 😊",
]

// Curated reply pool the semantic ranker chooses from. Kept broad so the
// embedding model has good coverage; heuristics below handle the obvious intents.
const CANDIDATE_POOL: string[] = [
  // Affirm / agree
  "Yes, sure!", "Sounds good!", "Absolutely 👍", "Sure, let's do it!", "Of course!",
  "Okay 👍", "Got it!", "Works for me!", "Perfect 👌", "Definitely!",
  // Decline / negative
  "No, sorry.", "Maybe later", "I can't right now", "Not sure yet", "Let me think about it",
  // Greetings
  "Hey! 👋", "Hello there!", "Hi, how are you?", "Hey, what's up?",
  // How are you
  "I'm good, you?", "Doing great! You?", "All good here 😊", "Not bad, you?",
  // Thanks
  "Thank you! 🙏", "Thanks a lot!", "You're welcome 😊", "Anytime!", "No problem!",
  // Scheduling / plans
  "What time works for you?", "Let's meet up!", "I'm free this evening", "Sounds like a plan!",
  "Where should we meet?", "Can we do tomorrow?", "I'll let you know",
  // Emotions / reactions
  "That's awesome! 🎉", "Haha 😂", "Oh nice!", "Wow, really?", "That's great to hear!",
  "Aw, that's sweet ❤️", "I'm so happy for you!", "That's too bad 😔", "Hope you feel better soon!",
  // Acknowledge
  "Okay, noted!", "Makes sense", "I understand", "Got it, thanks!", "Sure thing!",
  // Follow-up questions
  "Tell me more!", "How did it go?", "What happened?", "Really? When?", "And then?",
  // Love / miss
  "Love you too ❤️", "Miss you too!", "❤️", "Same here 🥰",
  // Closings
  "Talk soon!", "Goodnight 🌙", "See you! 👋", "Take care!", "Catch you later!",
  // Apology responses
  "It's okay!", "No worries 👍", "All good!", "Don't worry about it",
  // Congrats
  "Congrats! 🎉", "Well done! 👏", "So proud of you!",
]

const lc = (s: string) => s.toLowerCase().trim()
const has = (t: string, words: string[]) => words.some((w) => t.includes(w))

/**
 * Instant, model-free suggestions based on the last incoming message's intent.
 * Returns greeting seeds when there's no message to reply to.
 */
export function instantSuggestions(lastIncoming: string | null | undefined): string[] {
  const raw = (lastIncoming || "").trim()
  if (!raw) return GREETING_SEEDS
  const t = lc(raw)

  // Order matters — most specific intents first.
  if (has(t, ["love you", "i love you"])) return ["Love you too ❤️", "❤️", "Aw 🥰", "Love you more!", "You're the best 😘"]
  if (has(t, ["miss you"])) return ["Miss you too!", "❤️", "Can't wait to see you", "Miss you so much", "Soon! 🥰"]
  if (has(t, ["how are you", "how r u", "how are u", "how's it going", "hows it going", "wyd", "what are you doing"]))
    return ["I'm good, you?", "Doing great! You?", "All good 😊 You?", "Pretty good, wbu?", "Just chilling 😄", "Busy day! You?"]
  if (has(t, ["thank", "thanks", "thx", " ty", "appreciate"]))
    return ["You're welcome 😊", "Anytime!", "No problem!", "Happy to help!", "Of course! 🙌", "My pleasure!"]
  if (has(t, ["sorry", "my bad", "apolog"])) return ["It's okay!", "No worries 👍", "All good!", "Don't worry about it", "It happens 🙂"]
  if (has(t, ["congrat", "well done", "good job", "proud of you"]))
    return ["Thank you! 🎉", "Means a lot 🙏", "Thanks so much!", "You're too kind 😊", "Appreciate it!"]
  if (has(t, ["good night", "goodnight", "gn", "sweet dreams"]))
    return ["Goodnight 🌙", "Sweet dreams! 😴", "Night night!", "Sleep well! 💤", "See you tomorrow!"]
  if (has(t, ["bye", "see you", "see ya", "ttyl", "talk later", "catch you"]))
    return ["Bye! 👋", "Talk soon!", "Take care!", "See you! 😊", "Catch you later!", "Have a good one!"]
  if (has(t, ["good morning", "gm "]) || t === "gm")
    return ["Good morning! ☀️", "Morning! 😊", "Gm! How'd you sleep?", "Morning, have a great day!", "Rise and shine! 🌞"]
  if (/^(hi|hello|hey|yo|hii+|heyy+)\b/.test(t) || has(t, ["what's up", "whats up", "sup"]))
    return ["Hey! 👋", "Hi, how are you?", "Hello! 😊", "Hey, what's up?", "Heyy 🥰", "Hi there!"]
  if (has(t, ["ok", "okay", "k ", "cool", "alright", "fine"]) && raw.length <= 8)
    return ["👍", "Sounds good!", "Great!", "Cool 😎", "Perfect 👌", "Got it!"]

  // Questions → answer-shaped suggestions.
  const isQuestion =
    raw.endsWith("?") ||
    /^(what|why|how|when|where|who|which|are|do|does|did|can|could|would|will|is|should|have|has)\b/.test(t)
  if (isQuestion) {
    if (has(t, ["when", "what time", "free", "available", "meet", "tonight", "tomorrow"]))
      return ["Sounds good!", "What time works?", "I'll let you know", "Sure, let's do it!", "I'm free then 👍", "Can't, sorry"]
    return ["Yes, sure!", "No, sorry.", "Maybe 🤔", "Of course!", "Let me check", "I think so"]
  }

  // Generic safe fallbacks (will be upgraded by the semantic ranker).
  return ["Okay 👍", "Sounds good!", "Tell me more!", "Got it!", "Interesting!", "Haha 😄", "Nice!"]
}

// ── Semantic ranking (lazy model) ──────────────────────────────────────────

type Extractor = (text: string | string[], opts: any) => Promise<{ tolist: () => number[][] }>

let extractorPromise: Promise<Extractor> | null = null
let poolEmbeddings: number[][] | null = null

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers")
      // Pull the model from the HF CDN once, then it's cached by the browser.
      env.allowLocalModels = false
      const extractor = (await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")) as unknown as Extractor
      return extractor
    })()
  }
  return extractorPromise
}

async function embed(extractor: Extractor, text: string | string[]): Promise<number[][]> {
  const out = await extractor(text, { pooling: "mean", normalize: true })
  return out.tolist()
}

const dot = (a: number[], b: number[]) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/** Pick up to `max` diverse suggestions (skip near-duplicates / substrings). */
function diverse(sorted: { text: string }[], max: number): string[] {
  const out: string[] = []
  for (const { text } of sorted) {
    const key = lc(text).replace(/[^a-z]/g, "")
    if (out.some((o) => { const k = lc(o).replace(/[^a-z]/g, ""); return k === key || k.includes(key) || key.includes(k) })) continue
    out.push(text)
    if (out.length >= max) break
  }
  return out
}

/**
 * Semantic suggestions: rank the candidate pool by relevance to `lastIncoming`
 * using in-browser embeddings. Resolves after the model is ready (first call
 * triggers the one-time model download). Throws if the model can't load — the
 * caller should fall back to instantSuggestions().
 */
export async function rankSuggestions(lastIncoming: string, max = 3): Promise<string[]> {
  const query = (lastIncoming || "").trim()
  if (!query) return GREETING_SEEDS.slice(0, max)

  const extractor = await getExtractor()
  if (!poolEmbeddings) poolEmbeddings = await embed(extractor, CANDIDATE_POOL)
  const [q] = await embed(extractor, query)

  const scored = CANDIDATE_POOL.map((text, i) => ({ text, score: dot(q, poolEmbeddings![i]) }))
  scored.sort((a, b) => b.score - a.score)
  return diverse(scored, max)
}

/** Kick off the model download ahead of time (e.g. when a chat opens). */
export function warmUpSmartReply(): void {
  if (typeof window === "undefined") return
  void getExtractor().catch(() => {
    /* offline / unsupported — instant suggestions still work */
  })
}
