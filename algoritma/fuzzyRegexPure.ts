import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Ambil bad words dari DB tanpa normalisasi
async function getBadWordsFromDB(): Promise<Record<string, string>> {
    const badWordsList = await prisma.badWord.findMany({ include: { goodWords: true } })
    const badWords: Record<string, string> = {}
    for (const item of badWordsList) {
        // Tidak ada normalisasi, gunakan kata asli
        const word = item.word
        if (word.length < 2) continue
        const replacement = item.goodWords.length > 0 ? item.goodWords[0].word : item.word
        badWords[word] = replacement
    }
    return badWords
}

// Fuzzy regex builder tanpa normalisasi
function buildFuzzyRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const fuzzyPattern = escaped.split('').join('.*')
    return new RegExp(`\\b${fuzzyPattern}\\b`, 'i')
}

/**
 * Jalankan filter hanya dengan fuzzy regex (tanpa normalisasi, tanpa commonWords).
 * @param text Teks yang akan difilter
 * @returns Hasil filter dan daftar kata yang difilter
 */
export async function fuzzyRegexPureFilter(
    text: string,
    trueBadWords?: string[]
): Promise<{
    status: string
    original: string
    filteredWords: { original: string; replacement: string; position: number; rawWord: string }[]
    filtered: string
    bannedWords: string[]
    replacementWords: string[]
    filteredText: string
    durationMs: number
    detectionAccuracy?: number
    detectedTrueArr?: string[]
    detectedTrueCount?: number
}> {
    const startTime = performance.now()
    const badWords = await getBadWordsFromDB()

    type Match = {
        original: string
        replacement: string
        start: number
        end: number
        rawWord: string
    }

    const matches: Match[] = []
    const wordRegex = /\b\w+\b/g
    const tokens: { token: string; start: number; end: number }[] = []
    let m
    while ((m = wordRegex.exec(text)) !== null) {
        tokens.push({ token: m[0], start: m.index, end: m.index + m[0].length })
    }

    const checkedFuzzyKeys = new Set<string>()
    for (const pattern in badWords) {
        if (pattern.length < 4) continue;
        const replacement = badWords[pattern]
        const fuzzyRx = buildFuzzyRegex(pattern)
        for (const { token, start, end } of tokens) {
            if (matches.some((m) => m.start <= start && m.end >= end)) continue;
            const key = `${pattern}@${start}`
            if (checkedFuzzyKeys.has(key)) continue;
            checkedFuzzyKeys.add(key)
            // Tidak ada normalisasi pada token
            if (token.length < pattern.length) continue;
            if (fuzzyRx.test(token)) {
                matches.push({ original: pattern, replacement, start, end, rawWord: token })
            }
        }
    }

    // Hapus overlap match, hanya ambil yang pertama
    matches.sort((a, b) => a.start - b.start)
    const filtered: Match[] = []
    let lastEnd = -1
    for (const m of matches) {
        if (m.start >= lastEnd) {
            filtered.push(m)
            lastEnd = m.end
        }
    }

    // Membuat teks hasil filter dengan penggantian kata
    let result = ''
    let idx = 0
    for (const f of filtered) {
        result += text.slice(idx, f.start)
        result += f.replacement
        idx = f.end
    }
    result += text.slice(idx)

    // Hitung akurasi deteksi jika diberikan ground-truth
    let detectionAccuracy: number | undefined = undefined
    let detectedTrueArr: string[] = []
    let detectedTrueCount = 0
    if (trueBadWords && trueBadWords.length > 0) {
        const detected = filtered.map(f => f.original);
        detectedTrueArr = trueBadWords.filter(word => detected.includes(word));
        detectedTrueCount = detectedTrueArr.length;
        detectionAccuracy = Number(((detectedTrueCount / trueBadWords.length) * 100).toFixed(2));
    }

    const endTime = performance.now()
    const durationMs = Math.round(endTime - startTime)

    return {
        status: 'success',
        original: text,
        filteredWords: filtered.map((f) => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord,
        })),
        filtered: result,
        filteredText: result,
        bannedWords: filtered.map((f) => f.original),
        replacementWords: filtered.map((f) => f.replacement),
        durationMs,
        detectionAccuracy,
        detectedTrueArr,
    }
}