/**
 * Client-side GIF safety guards for the Giphy picker. GIFs can only enter a chat by
 * being picked from search/trending results, so controlling what those results contain
 * controls what is sendable. Three layers work together:
 *   1. Giphy `rating` cap on the request (see lib/giphy GIPHY_MAX_RATING) — server-side.
 *   2. `isCleanGifRating` — drop any returned item whose own rating is above the cap
 *      (defense-in-depth in case the request cap is ever bypassed/ignored).
 *   3. `isBlockedGifQuery` — refuse to even search for explicit terms.
 *
 * These are advisory/preventive on the client. For absolute parity with text/media
 * (server-enforced consent) a server backstop on the GIF URL would be the next step.
 */

/** Ratings allowed through to the user (Giphy: g, pg, pg-13, r). */
const ALLOWED_GIF_RATINGS = new Set(["g", "pg", "y"]) // "y" = Giphy's youngest tier

/** True when a returned Giphy item is within the allowed (clean) rating tier. */
export function isCleanGifRating(item: { rating?: string | null }): boolean {
  // Missing rating → treat as not-clean (fail closed) so unrated items don't slip.
  if (!item || !item.rating) return false
  return ALLOWED_GIF_RATINGS.has(item.rating.toLowerCase())
}

/**
 * Explicit/sexual search terms we refuse to query Giphy for. Kept focused on adult
 * content (not general profanity) so ordinary expressive searches still work. Matched
 * as whole words against a normalized query so "scunthorpe"-type false positives are
 * avoided.
 */
/**
 * Unambiguous explicit STEMS — matched as a SUBSTRING anywhere in the query, so every
 * inflection/variant/typo-with-extra-letters and multi-word form is caught:
 *   "porn"→ porno/pornhub/pornography, "boob"→ boobs/boobies/bigboobs,
 *   "masturbat"→ masturbate/masturbation, "sextape"/"sexvideo", etc.
 * Only include stems long+specific enough that they don't collide with clean words.
 */
const BLOCKED_STEMS = [
  // porn / sites / general adult
  "porn", "p0rn", "pr0n", "xxx", "nsfw", "rule34", "onlyfans", "playboy",
  "brazzers", "pornhub", "xvideos", "xnxx", "redtube", "youporn", "spankbang",
  "xrated", "smut", "softcore", "raunchy", "risque", "centerfold",
  // anime adult
  "hentai", "ahegao", "ecchi", "oppai", "doujin", "futanari", "yaoi", "lewd",
  // nudity / body (explicit)
  "naked", "nude", "nudi", "nudism", "nudist", "topless", "braless", "booba",
  "busty", "boob", "nipple", "nipslip", "areola", "cameltoe", "upskirt",
  "downblouse", "pussy", "vagina", "vulva", "labia", "clitoris", "clit",
  "penis", "phallus", "scrotum", "testicl", "ballsack",
  // acts
  "masturbat", "blowjob", "blowie", "handjob", "footjob", "titjob", "rimjob",
  "fingerbang", "cumshot", "cumming", "cumslut", "creampie", "creampie",
  "deepthroat", "gangbang", "bukkake", "bukake", "fellatio", "cunnilingus",
  "ejaculat", "foreplay", "facefuck", "throatfuck", "buttfuck", "analsex",
  "buttsex", "doggystyle", "fisting", "threesome", "foursome", "orgasm", "orgy",
  // fetish / kink
  "bdsm", "bondage", "fetish", "dominatrix", "femdom", "kinkster", "spank",
  "grope", "fondle", "voyeur", "swinger", "cuckold", "hotwife", "footfetish",
  "feetpic", "gloryhole", "lingerie", "thong", "twerk", "striptease", "stripper",
  // toys / arousal
  "dildo", "buttplug", "vibrator", "fleshlight", "strapon", "hardon", "boner",
  "erection", "horndog", "nympho",
  // people / commerce
  "milf", "gilf", "whore", "slut", "skank", "harlot", "thot", "camgirl",
  "camwhore", "pornstar", "sexworker", "prostitut", "brothel", "callgirl",
  "gigolo", "coomer", "gooning", "fapping",
  // illegal — always blocked
  "incest", "molest", "pedophil", "loli", "shota", "jailbait",
  // misc / euphemism / multi-word forms
  "erotic", "kamasutra", "sextape", "sexvideo", "sexcam", "sexchat", "sexting",
  "s3x", "seggs", "secks",
  // hindi / hinglish (no English-word collision)
  "bhosdi", "bhosda", "bhosadi", "chudai", "chinal", "randibaaz",
]

/**
 * Sexual stems that are common WORD PREFIXES — matched only at the START of a token
 * so we block "sex/sexy/sexual/sexyy" and "booty/bootylicious" WITHOUT nuking benign
 * words that merely contain them (essex, sussex, booties≈boots, hornet, thickness…).
 */
const PREFIX_STEMS = ["sex", "horny", "booty", "thicc"]

/**
 * High-collision short words — matched WHOLE-WORD ONLY to dodge Scunthorpe-style false
 * positives (class/assist/analysis/cocktail/title/button/cucumber/document/grapes/
 * therapist/torpedo/uranus/Ford Escort/Gandhi/Brandi/blunder/parachute…).
 */
const EXACT_WORDS = new Set([
  // english
  "ass", "asses", "asshole", "assholes", "anal", "anus", "bunghole", "cum",
  "cock", "cocks", "tit", "tits", "titty", "titties", "butt", "butts", "cunt",
  "cunts", "dick", "dicks", "fuck", "fucks", "fucking", "fuk", "fap", "thots",
  "coom", "jizz", "jerkoff", "wank", "wanker", "schlong", "twat",
  "rape", "raped", "rapes", "raping", "rapist", "rapists", "pedo",
  // hindi / hinglish (whole-word to avoid Gandhi/Brandi/parachute/blunder)
  "randi", "chut", "chutiya", "chutiye", "lund", "lauda", "laude", "gaand",
  "gand", "gandu", "chod", "chode", "chodu", "bsdk", "madarchod", "behenchod",
  "bhenchod", "bhadwa", "bhadwe", "gashti", "kutiya",
])

/** Normalize: lowercase, then split on any non-alphanumeric run into clean tokens. */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * True when a GIF search references explicit content and must be refused.
 *
 * Three tiers: whole-word for ambiguous short words, prefix for word-leading stems,
 * and substring (over both each token AND the space-collapsed query) for the
 * unambiguous stems — the last is what catches partial / variant / multi-word forms.
 */
export function isBlockedGifQuery(query: string): boolean {
  if (!query || !query.trim()) return false
  const tokens = tokenize(query)
  if (tokens.length === 0) return false

  // 1) Exact ambiguous words.
  if (tokens.some((t) => EXACT_WORDS.has(t))) return true

  // 2) Prefix stems (block "sexy", keep "essex").
  if (tokens.some((t) => PREFIX_STEMS.some((s) => t.startsWith(s)))) return true

  // 3) Substring stems — across each token and the collapsed query ("big boobs").
  const collapsed = tokens.join("")
  return BLOCKED_STEMS.some((s) => collapsed.includes(s) || tokens.some((t) => t.includes(s)))
}
