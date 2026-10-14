// @ts-nocheck
/**
 * build-data.mjs — BCA Question Explorer data pipeline.
 *
 * Mode B (preferred): questions.csv + papers_index.csv are the source of truth
 *                     (marks, section, paper id, scheme, semester per paper).
 * Mode A (fallback):  only 04_website_data.json is available.
 *
 * The cleaning / segmentation / tiering / keyword / report modules are shared;
 * only the loader differs. Never trusts `repeat_count`. Scheme is taken from
 * paper metadata, never inferred from the year.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'data')

const JSON_FILE = path.join(ROOT, '04_website_data.json')
const QUESTIONS_CSV = path.join(ROOT, 'questions.csv')
const PAPERS_CSV = path.join(ROOT, 'papers_index.csv')
const CATALOG_FILE = path.join(ROOT, 'src', 'data', 'catalog.json')

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex')
const shortId = (s) => sha1(s).slice(0, 10)
const uniq = (a) => [...new Set(a)]
const read = (p) => fs.readFileSync(p, 'utf8')

function seededRandom(seedStr) {
  let seed = parseInt(sha1(seedStr).slice(0, 8), 16) || 1
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

function sample(arr, n, seedStr) {
  const rnd = seededRandom(seedStr)
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

// ---------------------------------------------------------------------------
// CSV parser (handles quotes, embedded commas/newlines, BOM, CRLF)
// ---------------------------------------------------------------------------

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\r') {
      // ignore
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function csvToObjects(text, opts = {}) {
  const lines = opts.skipComments
    ? text.split(/\r?\n/).filter((l) => !l.trimStart().startsWith('#'))
    : null
  const clean = lines ? lines.join('\n') : text
  const rows = parseCsv(clean)
  if (rows.length === 0) return { cols: [], rows: [] }
  const cols = rows[0].map((c) => c.trim())
  const objs = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length === 1 && r[0].trim() === '') continue
    const o = {}
    cols.forEach((c, idx) => (o[c] = (r[idx] ?? '').trim()))
    objs.push(o)
  }
  return { cols, rows: objs }
}

// ---------------------------------------------------------------------------
// Text cleaning (rule 2)
// ---------------------------------------------------------------------------

const NOISE_PATTERNS = [
  /each question carries\s+\d+\s*marks?/gi,
  /answer any\s+(?:two|three|four|five|six|seven|\d+)\s+questions?/gi,
  /answer all questions?/gi,
  /\(\s*ceiling\s*:?\s*\d+\s*marks?\s*\)/gi,
  /\bpart\s+[a-d]\b/gi,
  /\(\s*short answer type\s*\)/gi,
  /\(\s*short essay questions?\s*\)/gi,
  /the correct answer carries\s+\d+/gi,
  /\(\s*\d+\s*[x×]\s*\d+\s*=\s*\d+\s*marks?\s*\)/gi,
  /\bprogramme\s*:?\s*cbcss\b/gi,
]

const MATH_ITALIC = /[\u{1D400}-\u{1D7FF}]/gu
const MATH_ITALIC_RUN = /([\u{1D400}-\u{1D7FF}])\1+/gu

function cleanText(raw) {
  if (raw == null) return ''
  let t = String(raw)
  // collapse doubled math-italic glyphs (𝑥𝑥 -> x) BEFORE NFKC
  t = t.replace(MATH_ITALIC_RUN, '$1')
  t = t.replace(MATH_ITALIC, (m) => m) // keep single math glyphs for NFKC
  // smart quotes -> ascii
  t = t.replace(/[\u2018\u2019\u201B\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"')
  t = t.normalize('NFKC')
  t = t.replace(/[\r\n]+/g, ' ').replace(/\u00A0/g, ' ')
  for (const re of NOISE_PATTERNS) t = t.replace(re, ' ')
  // paper / exam codes
  t = t.replace(/\b[A-Z]{1,2}\s?\d{4,6}\b/g, ' ')
  // OCR debris symbols
  t = t.replace(/[|»©¬`~^]/g, ' ')
  t = t.replace(/<n\s*S/gi, ' ')
  t = t.replace(/[⎡⎤⎢⎥⎣⎦]/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  t = trimJunk(t)
  return t
}

const OCR_CRUMBS = /^(?:an?|ne|ie|pe|ae|be|ce|de|se|te|ve|cc|ee|oo|of|on|to|as|at|in)$/i

function trimJunk(t) {
  let prev
  // drop a stray short token that sits after the final punctuation: "OOPs. ae"
  t = t.replace(/([.?!:])\s+[A-Za-z0-9]{1,3}$/, '$1').trim()
  t = t.replace(/[\s.;:,]+$/g, '')
  do {
    prev = t
    t = t.replace(/\s+(?:an?\s+\d{1,2}|\d{1,2})\s*$/i, '').trim()
    const m = t.match(/\s+(\S+)\s*$/)
    if (m && OCR_CRUMBS.test(m[1])) t = t.slice(0, m.index).trim()
    t = t.replace(/[\s.;:,]+$/g, '')
  } while (t !== prev)
  t = t.replace(/[\s.,;:'"\\/_()-]+$/g, '')
  return t.trim()
}

const TERMINAL = /[.?!:"']$/

// ---------------------------------------------------------------------------
// Variant parsing (rule 3/4)
// ---------------------------------------------------------------------------

function parseVariant(v) {
  const m = String(v).match(/^\s*\(\s*(\d{4})(?:\s*[^)]*)?\)\s*(.*)$/)
  if (m) return { year: parseInt(m[1], 10), text: cleanText(m[2]) }
  return { year: null, text: cleanText(v) }
}

// ---------------------------------------------------------------------------
// Classifiers (rules 7, 8, 14)
// ---------------------------------------------------------------------------

const COMMAND_START =
  /^(define|what|why|explain|write|differentiate|difference|distinguish|name|list|state|describe|compare|discuss|how|give|mention|calculate|solve|prepare|find|prove|derive|illustrate|elaborate|draw|sketch|construct|show|evaluate|obtain|compute|determine|short|note|advantages|disadvantages|limitations|objectives|features|types|functions|applications|uses|examples)\b/i

const ANY_COMMAND =
  /\b(explain|define|describe|write|differentiate|distinguish|compare|discuss|calculate|solve|evaluate|find|prove|derive|list|state|name|illustrate|elaborate|mention|prepare|compute|determine|obtain|draw|sketch|construct)\b/i

const SPECIAL_END = /\b(stands for|is called|are called|is :|is:)\s*$/i
const DANGLING_END = /\b(is|are|at|in|of|for|to|with|by|and|or|the|a|an|belong|belongs)\s*$/i
const BLANK = /(_{2,}|—{2,}|-{3,})/

function isQuickFact(text) {
  const t = text.trim()
  const words = t.split(/\s+/).filter(Boolean)
  if (/\(a\)/i.test(t) && /\(b\)/i.test(t)) {
    if (/\(c\)/i.test(t) || words.length <= 30) return true
  }
  if (BLANK.test(t)) return true
  if (SPECIAL_END.test(t)) return true
  if (COMMAND_START.test(t)) return false
  if (ANY_COMMAND.test(t)) return false
  if (TERMINAL.test(t)) return false
  if (DANGLING_END.test(t) && words.length <= 14) return true
  if (words.length <= 12) return true
  return false
}

function isMathGarbled(rawText, cleanedText) {
  const text = String(rawText || cleanedText || '')
  const sym = text.match(/[⎡⎤⎢⎥⎣⎦∫∑∼¬∧∨≤≥±×÷∞√²³]/g) || []
  const realWords = (text.match(/[A-Za-z]{3,}/g) || []).length
  if (sym.length > 0) {
    if (realWords < 4) return true
    const nonAlnum = (text.replace(/[A-Za-z0-9\s]/g, '')).length
    if (nonAlnum / Math.max(1, text.length) > 0.32) return true
  }
  // matrices with lost entries: "If A = and B = ." / "( ) ... ="
  const eqs = (text.match(/=/g) || []).length
  if (eqs >= 2 && /=\s*(and|[.,;]|\s*$)/i.test(text) && realWords < 6) return true
  // doubled math-italic artifacts surviving as "xx0, yy0" style
  if (/\b([a-z])\1\d/.test(text) && realWords < 6) return true
  // high punctuation ratio with few words
  const nonAlnum2 = (text.replace(/[A-Za-z0-9\s]/g, '')).length
  if (nonAlnum2 / Math.max(1, text.length) > 0.34 && realWords < 6) return true
  return false
}

function mathTopic(text) {
  const t = text.toLowerCase()
  if (/cayley|hamilton/.test(t)) return 'Cayley-Hamilton Theorem'
  if (/truth table/.test(t)) return 'Truth Tables'
  if (/\brank\b/.test(t)) return 'Rank of a Matrix'
  if (/eigen/.test(t)) return 'Eigen Values'
  if (/inverse|invert/.test(t)) return 'Matrix Inverse'
  if (/symmetric|skew/.test(t)) return 'Symmetric and Skew-Symmetric Matrices'
  if (/bisection/.test(t)) return 'Bisection Method'
  if (/newton/.test(t)) return 'Newton-Raphson Method'
  if (/simpson/.test(t)) return "Simpson's Rule"
  if (/trapezoidal/.test(t)) return 'Trapezoidal Rule'
  if (/euler/.test(t)) return 'Euler Method'
  if (/runge|kutta/.test(t)) return 'Runge-Kutta Method'
  if (/integrat|∫/.test(t)) return 'Integration'
  if (/derivative|differentiate|first principle/.test(t)) return 'Differentiation'
  if (/determinant/.test(t)) return 'Determinant'
  if (/table|data|sales|profit|cost|units/.test(t)) return 'Data-table problem'
  return 'Math / data-table problem'
}

const TRUNC_TERMINAL = /[.?!:]$/
const TRUNC_DANGLING = /\b(and|or|the|of|to|in|for|with|by|a|an|is|are|at|as)\s*$/i

function isTruncated(text) {
  if (TRUNC_DANGLING.test(text)) return true
  return text.length >= 90 && !TRUNC_TERMINAL.test(text)
}

// ---------------------------------------------------------------------------
// Key nouns + mixed-cluster detection (rules 9/10)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  `a an the and or but if then than that this these those of in on at to for with by from as into over under about between within without about above below up down out off is are was were be been being do does did have has had will would shall should can could may might must not no nor so such only own same too very s t just don now i you he she it we they them his her its their our your my me him us who whom which what when where why how any all each few more most other some such only both either neither each per etc eg ie vs via explain define write note short answer question questions marks mark explain briefly describe discuss list state name give mention differentiate difference differences distinguish compare contrast illustrate elaborate discuss advantages disadvantage limitations objectives features types functions applications uses example examples following steps process method methods algorithm diagram draw prove derive calculate solve find prepare compute determine show how why different differentiates detail details various types note short using based used also already given following define explain write state list name give find solve compute determine draw sketch construct writing purposes function part parts step steps point points question questions answer answers thing things example examples matters related general brief briefly meant.`
    .split(/\s+/)
    .filter(Boolean),
)

function keyNouns(text) {
  return uniq(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  )
}

function overlapRatio(a, b) {
  if (b.size === 0) return 1
  let inter = 0
  for (const w of b) if (a.has(w)) inter++
  return inter / b.size
}

function detectMixed(title, variants) {
  const titleNouns = new Set(keyNouns(title))
  if (variants.length === 0) return { mixed: false, related: [] }
  let low = 0
  const variantNounFreq = new Map()
  for (const v of variants) {
    const vn = new Set(keyNouns(v.text))
    if (vn.size === 0) continue
    if (overlapRatio(titleNouns, vn) < 0.3) low++
    for (const w of vn) if (!titleNouns.has(w)) variantNounFreq.set(w, (variantNounFreq.get(w) || 0) + 1)
  }
  const related = [...variantNounFreq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([w]) => w)
  // a competing topic that appears in >=2 variants but not in the title
  const competingTopic = related.length > 0
  const mixed = low > variants.length / 3 || competingTopic
  return { mixed, related }
}

// ---------------------------------------------------------------------------
// Keywords (rule 11)
// ---------------------------------------------------------------------------

function extractKeywords(clusters) {
  // term -> set of distinct years
  const years = new Map()
  for (const c of clusters) {
    const texts = [c.title, ...c.variants.map((v) => v.text)]
    const ys = c.yearsAsked
    for (const text of texts) {
      const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
      for (let i = 0; i < words.length; i++) {
        const w = words[i]
        if (w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w)) {
          const set = years.get(w) || new Set()
          ys.forEach((y) => set.add(y))
          years.set(w, set)
        }
        if (i + 1 < words.length) {
          const w2 = words[i + 1]
          if (
            w.length >= 3 &&
            w2.length >= 3 &&
            !STOPWORDS.has(w) &&
            !STOPWORDS.has(w2) &&
            !/^\d+$/.test(w) &&
            !/^\d+$/.test(w2)
          ) {
            const bigram = `${w} ${w2}`
            const set = years.get(bigram) || new Set()
            ys.forEach((y) => set.add(y))
            years.set(bigram, set)
          }
        }
      }
    }
  }
  return [...years.entries()]
    .map(([term, set]) => ({ term, yearCount: set.size }))
    .filter((k) => k.yearCount >= 2)
    .sort((a, b) => b.yearCount - a.yearCount || b.term.length - a.term.length || a.term.localeCompare(b.term))
    .slice(0, 15)
}

// ---------------------------------------------------------------------------
// Tiering (rule 5)
// ---------------------------------------------------------------------------

function tierForYears(n) {
  if (n >= 4) return 'must'
  if (n === 3) return 'high'
  if (n === 2) return 'frequent'
  return 'once'
}

const TIER_ORDER = { must: 0, high: 1, frequent: 2, once: 3 }

// ---------------------------------------------------------------------------
// Subject aliases (rule 12)
// ---------------------------------------------------------------------------

const SUBJECT_ALIASES = {
  'Problem Solving Using C 208': 'Problem Solving Using C',
  'Management Inf System': 'Management Information System (MIS)',
  'E Commerce': 'E-Commerce',
  'JAVA Programming': 'Java Programming',
}

function canonicalName(key) {
  return SUBJECT_ALIASES[key] || key
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

// ---------------------------------------------------------------------------
// Load catalog
// ---------------------------------------------------------------------------

const catalog = JSON.parse(read(CATALOG_FILE))
const catalogByCanonical = new Map()
for (const row of catalog.rows) {
  const canon = canonicalName(row.json_key)
  if (!catalogByCanonical.has(canon)) catalogByCanonical.set(canon, [])
  catalogByCanonical.get(canon).push(row)
}

// ---------------------------------------------------------------------------
// Load data (Mode A / B)
// ---------------------------------------------------------------------------

const json = JSON.parse(read(JSON_FILE))
const meta = { mode: 'A', catalogRows: catalog.rows.length }

let papersIndex = []
let questionRows = []
if (fs.existsSync(QUESTIONS_CSV) && fs.existsSync(PAPERS_CSV)) {
  meta.mode = 'B'
  papersIndex = csvToObjects(read(PAPERS_CSV)).rows
  questionRows = csvToObjects(read(QUESTIONS_CSV)).rows
}

function findCol(cols, ...names) {
  const lower = cols.map((c) => c.toLowerCase())
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase())
    if (i !== -1) return cols[i]
  }
  return null
}

// ---------------------------------------------------------------------------
// Build papers + questions (Mode B)
// ---------------------------------------------------------------------------

const report = {
  generatedAt: new Date().toISOString(),
  mode: meta.mode,
  subjectsBeforeMerge: 0,
  subjectsAfterMerge: 0,
  nameMergesApplied: [],
  totals: {},
  clustersByTier: { must: 0, high: 0, frequent: 0, once: 0 },
  hiddenOneYearItems: 0,
  quickFacts: 0,
  mathGarbled: 0,
  mixedClusters: 0,
  truncated: 0,
  subjectsWithLimitedData: 0,
  schemeUnknownYears: [],
  possibleReusedPapers: [],
  catalogMismatches: [],
  unmatchedVariantYears: {},
  notes: [],
}

let PAPERS = []
let QUESTIONS = []

if (meta.mode === 'B') {
  const pcols = Object.keys(papersIndex[0] || {})
  const pid = findCol(pcols, 'paper_id', 'paperid', 'id')
  const pprog = findCol(pcols, 'programme', 'scheme')
  const psem = findCol(pcols, 'semester', 'sem')
  const psubj = findCol(pcols, 'subject', 'normalized_subject')
  const pcode = findCol(pcols, 'course_code', 'course')
  const pyear = findCol(pcols, 'year')
  const pmonth = findCol(pcols, 'month')
  const pexam = findCol(pcols, 'exam_type')
  const pmax = findCol(pcols, 'max_marks')
  const pext = findCol(pcols, 'extract_method')
  const psrc = findCol(pcols, 'source_file')
  const pnq = findCol(pcols, 'n_questions')
  const prev = findCol(pcols, 'needs_review')
  const pnote = findCol(pcols, 'review_notes')

  PAPERS = papersIndex.map((r) => ({
    paperId: String(r[pid]),
    scheme: (r[pprog] || '').trim() || 'unknown',
    semester: r[psem] ? parseInt(r[psem], 10) : null,
    subjectKey: (r[psubj] || '').trim(),
    courseCode: (r[pcode] || '').trim(),
    year: r[pyear] ? parseInt(r[pyear], 10) : null,
    month: (r[pmonth] || '').trim(),
    examType: (r[pexam] || '').trim(),
    maxMarks: r[pmax] ? parseFloat(r[pmax]) : null,
    extractMethod: (r[pext] || '').trim(),
    sourceFile: (r[psrc] || '').trim(),
    nQuestions: r[pnq] ? parseInt(r[pnq], 10) : null,
    needsReview: String(r[prev]).toLowerCase() === 'true',
    reviewNotes: (r[pnote] || '').trim(),
  }))

  const qcols = Object.keys(questionRows[0] || {})
  const qpid = findCol(qcols, 'paper_id')
  const qsubj = findCol(qcols, 'subject')
  const qyear = findCol(qcols, 'year')
  const qsem = findCol(qcols, 'semester')
  const qprog = findCol(qcols, 'programme', 'scheme')
  const qsec = findCol(qcols, 'section')
  const qmarks = findCol(qcols, 'marks')
  const qtext = findCol(qcols, 'question_text', 'text')
  const qnum = findCol(qcols, 'question_number')
  const qext = findCol(qcols, 'extract_method')
  const qsrc = findCol(qcols, 'source_file')

  QUESTIONS = questionRows.map((r) => ({
    paperId: String(r[qpid]),
    subjectKey: (r[qsubj] || '').trim(),
    year: r[qyear] ? parseInt(r[qyear], 10) : null,
    semester: r[qsem] ? parseInt(r[qsem], 10) : null,
    scheme: (r[qprog] || '').trim(),
    section: (r[qsec] || '').trim(),
    marks: r[qmarks] ? parseFloat(r[qmarks]) : null,
    text: (r[qtext] || '').trim(),
    qnumber: (r[qnum] || '').trim(),
    extractMethod: (r[qext] || '').trim(),
    sourceFile: (r[qsrc] || '').trim(),
  }))
}

// ---------------------------------------------------------------------------
// Build canonical subject list (merge aliases)
// ---------------------------------------------------------------------------

report.subjectsBeforeMerge = Object.keys(json).length

const subjectMap = new Map() // canonical -> { key(s), clusters(JSON), papers, questions }
function ensureSubject(canon) {
  if (!subjectMap.has(canon)) {
    subjectMap.set(canon, { canon, keys: new Set(), rawClusters: [], papers: [], questions: [] })
  }
  return subjectMap.get(canon)
}

for (const key of Object.keys(json)) {
  const canon = canonicalName(key)
  const s = ensureSubject(canon)
  s.keys.add(key)
  s.rawClusters.push(...json[key].repeated_questions.map((c) => ({ ...c, _srcKey: key })))
}

for (const p of PAPERS) {
  const canon = canonicalName(p.subjectKey)
  const s = ensureSubject(canon)
  s.keys.add(p.subjectKey)
  s.papers.push(p)
}
for (const q of QUESTIONS) {
  const canon = canonicalName(q.subjectKey)
  const s = ensureSubject(canon)
  s.keys.add(q.subjectKey)
  s.questions.push(q)
}

report.subjectsAfterMerge = subjectMap.size
for (const [k, v] of Object.entries(SUBJECT_ALIASES)) {
  if (Object.prototype.hasOwnProperty.call(json, k)) {
    report.nameMergesApplied.push({ from: k, to: v })
  }
}

// ---------------------------------------------------------------------------
// Segments (syllabus segment layer)
// ---------------------------------------------------------------------------

function schemeLabelFor(canon, semester, scheme) {
  const rows = (catalogByCanonical.get(canon) || []).filter((r) => r.sem === semester)
  if (rows.length === 0) return scheme
  if (scheme === 'FYUGP') {
    const r = rows.find((x) => /fyugp/i.test(x.scheme)) || rows.find((x) => /fyugp/i.test(x.scheme))
    return r ? r.scheme : scheme
  }
  const r = rows.find((x) => !/fyugp/i.test(x.scheme) && x.scheme.toUpperCase().includes('CBCSS'))
  return r ? r.scheme : rows[0].scheme
}

function buildSegments(subject) {
  const groups = new Map()
  for (const p of subject.papers) {
    const key = `${p.semester}|${p.scheme}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }
  const segments = []
  for (const [key, ps] of groups) {
    const [semStr, scheme] = key.split('|')
    const semester = semStr === 'null' ? null : parseInt(semStr, 10)
    const years = uniq(ps.map((p) => p.year).filter(Boolean)).sort((a, b) => a - b)
    const slug = slugify(subject.canon)
    const id = `${slug}-s${semester ?? 'x'}-${(scheme || 'unknown').toLowerCase()}`
    segments.push({
      id,
      semester,
      scheme,
      schemeLabel: schemeLabelFor(subject.canon, semester, scheme),
      years,
      paperCount: ps.length,
      questionCount: ps.reduce((n, p) => n + (p.nQuestions || 0), 0),
      limited: ps.length < 3,
      courses: uniq(ps.map((p) => p.courseCode).filter(Boolean)),
    })
  }
  segments.sort((a, b) => (a.years[0] || 0) - (b.years[0] || 0))
  return segments
}

// year -> segment ids present for this subject
function segmentIdsForYear(subject, segments, year) {
  const ids = new Set()
  for (const p of subject.papers) {
    if (p.year === year) {
      const seg = segments.find((s) => s.semester === p.semester && s.scheme === p.scheme)
      if (seg) ids.add(seg.id)
    }
  }
  return [...ids]
}

// ---------------------------------------------------------------------------
// Marks lookup (Mode B)
// ---------------------------------------------------------------------------

function normKey(t) {
  return t
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildMarksLookup(subject) {
  const map = new Map()
  for (const q of subject.questions) {
    const k = normKey(cleanText(q.text))
    if (!k) continue
    if (!map.has(k)) map.set(k, [])
    map.get(k).push({ marks: q.marks, paperId: q.paperId })
  }
  return map
}

function lookupMarks(lookup, text) {
  const k = normKey(text)
  if (!k) return []
  if (lookup.has(k)) return lookup.get(k)
  // prefix fallback
  const out = []
  if (k.length >= 15) {
    for (const [key, vals] of lookup) {
      if (key.startsWith(k.slice(0, 24)) || k.startsWith(key.slice(0, 24))) out.push(...vals)
    }
  }
  return out
}

function median(nums) {
  const a = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n)).sort((x, y) => x - y)
  if (a.length === 0) return null
  return a[Math.floor(a.length / 2)]
}

// ---------------------------------------------------------------------------
// Build clusters
// ---------------------------------------------------------------------------

function buildSubjectDetail(subject) {
  const segments = buildSegments(subject)
  const marksLookup = buildMarksLookup(subject)
  const subjectSlug = slugify(subject.canon)

  // ambiguous years: year present in more than one segment
  const schemeUnknownYears = []
  const allYears = uniq(subject.papers.map((p) => p.year).filter(Boolean)).sort((a, b) => a - b)
  for (const y of allYears) {
    const ids = segmentIdsForYear(subject, segments, y)
    if (ids.length > 1) schemeUnknownYears.push(y)
  }
  for (const y of schemeUnknownYears) {
    report.schemeUnknownYears.push({ subject: subject.canon, year: y })
  }

  const limited = subject.papers.length > 0 && subject.papers.length < 3

  const clusters = []
  for (const c of subject.rawClusters) {
    const rawMain = String(c.main_question || '').trim()
    let title = cleanText(rawMain)

    const rawVariants = Array.isArray(c.variants) ? c.variants : []
    const parsed = rawVariants.map(parseVariant).filter((v) => v.text)
    // dedupe same year + same normalized text
    const seen = new Set()
    const variants = []
    for (const v of parsed) {
      const k = `${v.year}|${v.text.toLowerCase()}`
      if (seen.has(k)) continue
      seen.add(k)
      variants.push(v)
    }
    if (!title && variants.length) title = variants[0].text

    // years asked: authoritative from `years` string + variant prefixes
    const yearStr = String(c.years || '')
    const fromYears = (yearStr.match(/\d{4}/g) || []).map(Number)
    const fromVariants = variants.map((v) => v.year).filter(Boolean)
    const yearsAsked = uniq([...fromYears, ...fromVariants]).sort((a, b) => a - b)

    // per-segment years
    const yearsBySegment = {}
    let unmatched = 0
    for (const y of yearsAsked) {
      const ids = segmentIdsForYear(subject, segments, y)
      if (ids.length === 0) {
        unmatched++
        continue
      }
      for (const id of ids) {
        if (!yearsBySegment[id]) yearsBySegment[id] = []
        yearsBySegment[id].push(y)
      }
    }
    if (unmatched > 0) {
      if (!report.unmatchedVariantYears[subject.canon]) report.unmatchedVariantYears[subject.canon] = 0
      report.unmatchedVariantYears[subject.canon] += unmatched
    }

    const tier = tierForYears(yearsAsked.length)
    const tierBySegment = {}
    for (const [id, ys] of Object.entries(yearsBySegment)) tierBySegment[id] = tierForYears(ys.length)

    // flags
    const mathGarbled =
      isMathGarbled(rawMain, title) ||
      parsed.some((v) => isMathGarbled(v.text, v.text))
    const truncated = isTruncated(title)

    const { mixed, related } = detectMixed(title, variants)
    let titleIsTopic = false
    let topicLabel = null
    if (mathGarbled) {
      titleIsTopic = true
      topicLabel = mathTopic(title + ' ' + variants.map((v) => v.text).join(' '))
    } else if (mixed) {
      titleIsTopic = true
      const primary = keyNouns(title)[0]
      const cap = primary ? primary[0].toUpperCase() + primary.slice(1) : 'Related topic'
      topicLabel = related.length ? `${cap}: ${related.join(', ')}` : title
    }

    const variantTexts = [title, ...variants.map((v) => v.text)]
    const quickCount = variantTexts.filter((t) => isQuickFact(t)).length
    const type = isQuickFact(title)
      ? 'quickfact'
      : quickCount >= 2 && quickCount / variantTexts.length > 0.6
        ? 'quickfact'
        : 'descriptive'

    // marks (Mode B)
    const markVals = []
    for (const t of variantTexts) {
      for (const m of lookupMarks(marksLookup, t)) if (typeof m.marks === 'number') markVals.push(m.marks)
    }
    const marks = median(markVals)
    const marksKnown = marks != null

    const id = `${subjectSlug}:${shortId(`${subjectSlug}|${title.toLowerCase()}|${yearsAsked.join(',')}`)}`

    clusters.push({
      id,
      title: title || rawMain || 'Untitled question',
      titleIsTopic,
      topicLabel,
      mixedCluster: mixed,
      relatedTerms: related,
      type,
      mathGarbled,
      truncated,
      yearsAsked,
      tier,
      tierBySegment,
      yearsBySegment,
      variants,
      marks,
      marksKnown,
      rawMain,
      rawVariants,
    })

    // report counters
    report.clustersByTier[tier]++
    if (tier === 'once') report.hiddenOneYearItems++
    if (type === 'quickfact') report.quickFacts++
    if (mathGarbled) report.mathGarbled++
    if (mixed) report.mixedClusters++
    if (truncated) report.truncated++
  }

  // sort clusters: tier then years desc then title
  clusters.sort(
    (a, b) =>
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
      b.yearsAsked.length - a.yearsAsked.length ||
      a.title.localeCompare(b.title),
  )

  // possible reused papers (rule 15): a large share of repeats are the SAME
  // two years with IDENTICAL wording (main wording repeated verbatim).
  let possibleReusedPapers = false
  const twoYearClusters = clusters.filter(
    (c) => uniq(c.variants.map((v) => v.year).filter(Boolean)).length === 2,
  )
  if (twoYearClusters.length >= 4) {
    const pairCounts = new Map()
    for (const c of twoYearClusters) {
      const pk = c.variants.map((v) => v.year).filter(Boolean).sort().join(',')
      pairCounts.set(pk, (pairCounts.get(pk) || 0) + 1)
    }
    const dominant = Math.max(...pairCounts.values())
    const strongReuse = twoYearClusters.filter((c) => {
      const withYears = c.variants.filter((v) => v.year)
      if (withYears.length < 2) return false
      const norms = uniq(withYears.map((v) => normKey(v.text)))
      return norms.length === 1 && norms[0] === normKey(c.title)
    }).length
    if (dominant / twoYearClusters.length > 0.55 && strongReuse / twoYearClusters.length > 0.5) {
      possibleReusedPapers = true
    }
  }
  if (possibleReusedPapers) {
    report.possibleReusedPapers.push(subject.canon)
    report.notes.push(`${subject.canon}: many repeats are two-year pairs with identical wording — may come from reused papers.`)
  }

  const keywords = extractKeywords(clusters)

  const years = allYears
  const yearStart = years.length ? years[0] : null
  const yearEnd = years.length ? years[years.length - 1] : null

  const counts = { must: 0, high: 0, frequent: 0, once: 0 }
  for (const c of clusters) counts[c.tier]++

  const detail = {
    slug: subjectSlug,
    name: subject.canon,
    keys: [...subject.keys],
    semesters: uniq(subject.papers.map((p) => p.semester).filter(Boolean)).sort((a, b) => a - b),
    schemes: uniq(subject.papers.map((p) => p.scheme).filter(Boolean)),
    years,
    yearStart,
    yearEnd,
    paperCount: subject.papers.length,
    questionCount: subject.questions.length,
    limited,
    possibleReusedPapers,
    schemeUnknownYears,
    segments,
    keywords,
    counts,
    clusters,
  }
  return detail
}

const subjectDetails = []
for (const subject of subjectMap.values()) {
  if (subject.rawClusters.length === 0 && subject.papers.length === 0) continue
  subjectDetails.push(buildSubjectDetail(subject))
}

subjectDetails.sort((a, b) => {
  const sa = a.semesters[0] ?? 99
  const sb = b.semesters[0] ?? 99
  return sa - sb || a.name.localeCompare(b.name)
})

// Documentation claims the JSON contradicts — trusted the JSON, flagged here.
report.dataDiscrepancies = []
{
  const bav = subjectDetails.find((d) => d.name === 'Basics of Audio and Video')
  if (bav && !bav.possibleReusedPapers) {
    report.dataDiscrepancies.push(
      'Basics of Audio and Video: docs claim many 2016/2017 identical repeats, but the JSON clusters are mostly single-year items. Trusted the JSON; no "reused papers" badge shown.',
    )
  }
  const cn = subjectDetails.find((d) => d.name === 'Computer Networks')
  if (cn) {
    report.dataDiscrepancies.push(
      `Computer Networks: catalog implies 356 questions, the JSON/CSV data has ${cn.questionCount}. Prefer computed counts.`,
    )
  }
}
report.notes.push(...report.dataDiscrepancies)

// ---------------------------------------------------------------------------
// Subject summaries + search index
// ---------------------------------------------------------------------------

const subjectSummaries = subjectDetails.map((d) => ({
  slug: d.slug,
  name: d.name,
  semesters: d.semesters,
  schemes: d.schemes,
  years: d.years,
  yearStart: d.yearStart,
  yearEnd: d.yearEnd,
  paperCount: d.paperCount,
  questionCount: d.questionCount,
  clusterCount: d.clusters.length,
  mustCount: d.counts.must,
  highCount: d.counts.high,
  frequentCount: d.counts.frequent,
  onceCount: d.counts.once,
  limited: d.limited,
  possibleReusedPapers: d.possibleReusedPapers,
  hasMultipleSegments: d.segments.length > 1,
  schemeUnknownYears: d.schemeUnknownYears,
  topKeywords: d.keywords.slice(0, 8).map((k) => k.term),
}))

// totals
const allPapersYears = PAPERS.map((p) => p.year).filter(Boolean)
const totals = {
  subjects: subjectDetails.length,
  papers: PAPERS.length,
  questions: QUESTIONS.length,
  clusters: subjectDetails.reduce((n, d) => n + d.clusters.length, 0),
  papersText: PAPERS.filter((p) => p.extractMethod === 'text').length,
  papersOcr: PAPERS.filter((p) => p.extractMethod === 'ocr').length,
  needsReview: PAPERS.filter((p) => p.needsReview).length,
  yearStart: allPapersYears.length ? Math.min(...allPapersYears) : null,
  yearEnd: allPapersYears.length ? Math.max(...allPapersYears) : null,
}
totals.yearCount = totals.yearStart && totals.yearEnd ? totals.yearEnd - totals.yearStart + 1 : 0
report.totals = totals

const index = {
  meta: {
    generatedAt: report.generatedAt,
    mode: meta.mode,
    totals,
    disclaimer:
      'Unofficial student resource. Extracted from past papers (some OCR). Not affiliated with Calicut University.',
  },
  subjects: subjectSummaries,
}

// search index: one doc per cluster + one per subject
const searchDocs = []
for (const s of subjectSummaries) {
  searchDocs.push({
    id: `subj:${s.slug}`,
    subjectSlug: s.slug,
    subject: s.name,
    title: s.name,
    keywords: (s.topKeywords || []).join(' '),
    tier: '',
    type: 'subject',
  })
}
for (const d of subjectDetails) {
  for (const c of d.clusters) {
    searchDocs.push({
      id: c.id,
      subjectSlug: d.slug,
      subject: d.name,
      title: c.titleIsTopic && c.topicLabel ? c.topicLabel : c.title,
      keywords: [...(c.relatedTerms || []), ...(c.mixedCluster ? [c.title] : [])].join(' '),
      tier: c.tier,
      type: c.type,
    })
  }
}

// ---------------------------------------------------------------------------
// Catalog mismatch report
// ---------------------------------------------------------------------------

function sumBySemester(pred) {
  const out = {}
  for (const p of PAPERS) {
    if (!pred(p)) continue
    const k = `${p.semester}`
    out[k] = (out[k] || 0) + 1
  }
  return out
}

const semCounts = sumBySemester(() => true)
const semCountsScheme = {}
for (const p of PAPERS) {
  const k = `${p.semester}|${p.scheme}`
  semCountsScheme[k] = (semCountsScheme[k] || 0) + 1
}
for (const [sem, hint] of Object.entries(catalog.paperCountsBySemester)) {
  const actual = semCounts[sem] || 0
  if (actual !== hint.total) {
    report.catalogMismatches.push({ type: 'papers-by-semester', semester: sem, catalog: hint.total, computed: actual })
  }
  const fyugp = semCountsScheme[`${sem}|FYUGP`] || 0
  const cbcss = semCountsScheme[`${sem}|CBCSS`] || 0
  if (fyugp !== hint.FYUGP || cbcss !== hint.CBCSS) {
    report.catalogMismatches.push({
      type: 'papers-by-semester-scheme',
      semester: sem,
      catalog: { CBCSS: hint.CBCSS, FYUGP: hint.FYUGP },
      computed: { CBCSS: cbcss, FYUGP: fyugp },
    })
  }
}

// per-subject mismatches (catalog rows summed across a subject's syllabi)
const byCanon = new Map()
for (const row of catalog.rows) {
  const canon = canonicalName(row.json_key)
  const agg = byCanon.get(canon) || { papers: 0, questions: 0 }
  agg.papers += row.papers
  agg.questions += row.questions
  byCanon.set(canon, agg)
}
for (const [canon, agg] of byCanon) {
  const d = subjectDetails.find((x) => x.name === canon)
  if (!d) {
    report.catalogMismatches.push({ type: 'catalog-subject-missing', subject: canon })
    continue
  }
  if (agg.papers !== d.paperCount) {
    report.catalogMismatches.push({ type: 'papers', subject: canon, catalog: agg.papers, computed: d.paperCount })
  }
  if (agg.questions !== d.questionCount) {
    report.catalogMismatches.push({
      type: 'questions',
      subject: canon,
      catalog: agg.questions,
      computed: d.questionCount,
    })
  }
}

report.subjectsWithLimitedData = subjectDetails.filter((d) => d.limited).map((d) => d.name).length

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------

fs.mkdirSync(OUT_DIR, { recursive: true })

fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index))
fs.writeFileSync(path.join(OUT_DIR, 'search-index.json'), JSON.stringify({ documents: searchDocs }))

for (const d of subjectDetails) {
  fs.writeFileSync(path.join(OUT_DIR, `${d.slug}.json`), JSON.stringify(d))
}

// report samples
const samples = {}
for (const d of subjectDetails) {
  samples[d.name] = sample(d.clusters, 5, d.slug).map((c) => ({
    title: c.titleIsTopic ? c.topicLabel : c.title,
    tier: c.tier,
    years: c.yearsAsked,
    type: c.type,
    mathGarbled: c.mathGarbled,
    mixed: c.mixedCluster,
  }))
}
report.samples = samples

fs.writeFileSync(path.join(OUT_DIR, 'build-report.json'), JSON.stringify(report, null, 2))

// ---------------------------------------------------------------------------
// Console report
// ---------------------------------------------------------------------------

const line = (s = '') => console.log(s)
line('================ BCA QUESTION EXPLORER — BUILD REPORT ================')
line(`mode: ${meta.mode}  |  generated: ${report.generatedAt}`)
line('')
line(`subjects: ${report.subjectsBeforeMerge} before merge -> ${report.subjectsAfterMerge} after (${report.nameMergesApplied.length} merges)`)
for (const m of report.nameMergesApplied) line(`   merge: "${m.from}" -> "${m.to}"`)
line('')
line(`papers: ${totals.papers}   questions: ${totals.questions}   clusters: ${totals.clusters}`)
line(`years: ${totals.yearStart}-${totals.yearEnd} (${totals.yearCount} calendar years)`)
line(`text-layer papers: ${totals.papersText}   OCR papers: ${totals.papersOcr}   flagged for review: ${totals.needsReview}`)
line('')
line(`clusters by tier:  Must Study(4+)=${report.clustersByTier.must}  High(3)=${report.clustersByTier.high}  Frequent(2)=${report.clustersByTier.frequent}  Asked once(1)=${report.clustersByTier.once}`)
line(`hidden one-year items: ${report.hiddenOneYearItems}`)
line(`quick facts: ${report.quickFacts}   math-garbled: ${report.mathGarbled}   mixed clusters: ${report.mixedClusters}   truncated: ${report.truncated}`)
line(`subjects with limited data (<3 papers): ${report.subjectsWithLimitedData}`)
line(`scheme-unknown (overlapping) years: ${report.schemeUnknownYears.length}`)
for (const s of report.schemeUnknownYears.slice(0, 20)) line(`   ${s.subject}: ${s.year}`)
line(`possible reused papers: ${report.possibleReusedPapers.join(', ') || 'none'}`)
line('')
line('data discrepancies (docs vs JSON):')
for (const d of report.dataDiscrepancies || []) line(`   - ${d}`)
line('')
line(`catalog mismatches: ${report.catalogMismatches.length}`)
for (const m of report.catalogMismatches.slice(0, 40)) {
  line(`   ${JSON.stringify(m)}`)
}
line('')
line(`subjects with variant years not matched to a paper: ${Object.keys(report.unmatchedVariantYears).length}`)
for (const [k, v] of Object.entries(report.unmatchedVariantYears).slice(0, 20)) line(`   ${k}: ${v}`)
line('')
line('sample cleaned clusters (5 random per subject):')
for (const [name, arr] of Object.entries(samples)) {
  line(`-- ${name}`)
  for (const c of arr) {
    line(`     [${c.tier}] ${c.years.join(',')} ${c.type}${c.mathGarbled ? ' math' : ''}${c.mixed ? ' mixed' : ''} :: ${c.title}`)
  }
}
line('======================================================================')
line(`wrote ${subjectDetails.length} subject files + index.json + search-index.json + build-report.json to public/data/`)
