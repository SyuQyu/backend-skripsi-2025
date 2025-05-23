import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

/**
 * Mengubah kata menjadi bentuk normal (lowercase, ganti karakter mirip, hapus non-huruf).
 * Contoh: "b4d" -> "bad"
 */
function normalizeWord(word: string): string {
    const charMap: Record<string, string> = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
    }
    return word
        .toLowerCase()
        .replace(/[013457]/g, (ch) => charMap[ch] || ch)
        .replace(/[^a-z]/g, '')
}

/**
 * Menghasilkan versi normalisasi dari teks beserta mapping posisi karakter aslinya.
 * Berguna untuk menghubungkan hasil pencarian ke posisi asli di teks.
 */
function getNormalizationMapping(text: string) {
    const charMap: Record<string, string> = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
    }
    let normalized = ''
    let mapping: number[] = []
    for (let i = 0; i < text.length; ++i) {
        let ch = text[i].toLowerCase()
        if (charMap[ch]) ch = charMap[ch]
        if (!/[a-z]/.test(ch)) continue
        normalized += ch
        mapping.push(i)
    }
    return { normalized, mapping }
}

/**
 * Mengambil daftar kata kasar dari database, lalu menormalisasi dan mengambil kata pengganti.
 * Output: { normalized_badword: replacement }
 */
async function getBadWordsFromDB(): Promise<Record<string, string>> {
    const badWordsList = await prisma.listBadWords.findMany({ include: { goodWords: true } })
    const badWords: Record<string, string> = {}
    for (const item of badWordsList) {
        const normalized = normalizeWord(item.word)
        const replacement = item.goodWords.length > 0 ? item.goodWords[0].word : item.word
        badWords[normalized] = replacement
    }
    return badWords
}

const badCharCache = new Map<string, Record<string, number>>()

/**
 * Membuat tabel karakter buruk untuk algoritma Boyer-Moore.
 * Mempercepat pencarian substring dengan mengatur seberapa jauh pencarian bisa melompat.
 */
function buildBadCharacterTable(pattern: string): Record<string, number> {
    if (badCharCache.has(pattern)) return badCharCache.get(pattern)!
    const table: Record<string, number> = {}
    for (let i = 0; i < pattern.length - 1; i++) {
        table[pattern[i]] = pattern.length - 1 - i
    }
    badCharCache.set(pattern, table)
    return table
}

/**
 * Melakukan pencarian substring menggunakan algoritma Boyer-Moore pada teks yang sudah dinormalisasi.
 * Mengembalikan posisi dan kata asli yang cocok.
 */
function boyerMooreSearch(
    haystack: string,
    origText: string,
    origMapping: number[],
    pattern: string
): Array<{ start: number; end: number; pattern: string; rawWord: string }> {
    const results: Array<{ start: number; end: number; pattern: string; rawWord: string }> = []
    const badCharTable = buildBadCharacterTable(pattern)
    let i = 0

    while (i <= haystack.length - pattern.length) {
        let j = pattern.length - 1
        while (j >= 0 && haystack[i + j] === pattern[j]) {
            j--
        }
        if (j < 0) {
            const origStart = origMapping[i]
            const origEnd = origMapping[i + pattern.length - 1] + 1
            const { start, end, rawWord } = expandToWord(origText, origStart, origEnd)
            results.push({ start, end, pattern, rawWord })
            i += pattern.length
        } else {
            const shiftChar = haystack[i + j]
            const shiftValue = badCharTable[shiftChar] ?? pattern.length
            i += shiftValue
        }
    }
    return results
}

/**
 * Membuat regular expression fuzzy dari pattern.
 * Setiap karakter di pattern boleh dipisahkan karakter lain (misal: "bad" -> /b.*a.*d/i).
 */
function buildFuzzyRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const fuzzyPattern = escaped.split('').join('.*')
    return new RegExp(fuzzyPattern, 'i')
}

/**
 * Memperluas posisi start dan end agar mencakup seluruh kata (bukan hanya substring).
 * Berguna untuk mengganti seluruh kata di teks asli.
 */
function expandToWord(
    text: string,
    startIdx: number,
    endIdx: number
): { start: number; end: number; rawWord: string } {
    while (startIdx > 0 && /[a-zA-Z0-9]/.test(text[startIdx - 1])) startIdx--
    while (endIdx < text.length && /[a-zA-Z0-9]/.test(text[endIdx])) endIdx++
    return { start: startIdx, end: endIdx, rawWord: text.slice(startIdx, endIdx) }
}

// ---------------------
// FUNGSI UTAMA DENGAN DETECTION ACCURACY
// ---------------------

/**
 * Fungsi utama untuk filter kata kasar pada teks.
 * - Menggunakan algoritma Boyer-Moore dan fuzzy regex.
 * - Mengganti kata kasar dengan kata pengganti.
 * - Menghitung akurasi deteksi jika diberikan ground-truth.
 * @param text Teks yang akan difilter
 * @param trueBadWords (opsional) Daftar kata kasar ground-truth untuk evaluasi akurasi
 * @returns Hasil filter, daftar kata yang difilter, statistik, dan akurasi deteksi (jika ada)
 */
export async function boyerMooreFilter(
    text: string,
    trueBadWords?: string[] // Tambahkan parameter ini
): Promise<{
    status: string
    original: string
    filteredWords: { original: string; replacement: string; position: number; rawWord: string }[]
    filtered: string
    bannedWords: string[]
    replacementWords: string[]
    filteredText: string
    durationMs: number
    // memoryUsage: any
    // cpuUsage: any
    detectionAccuracy?: number
    detectedTrueArr?: string[]
    detectedTrueCount?: number
}> {
    const startTime = performance.now()

    // Ambil daftar kata kasar dari DB
    const badWords = await getBadWordsFromDB()
    // Normalisasi teks dan mapping ke posisi asli
    const { normalized: normalizedText, mapping: normToOrig } = getNormalizationMapping(text)

    type Match = {
        original: string
        replacement: string
        start: number
        end: number
        rawWord: string
    }

    const matches: Match[] = []

    // Tokenisasi kata pada teks asli
    const wordRegex = /\b\w+\b/g
    const tokens: { token: string; start: number; end: number }[] = []
    let m
    while ((m = wordRegex.exec(text)) !== null) {
        tokens.push({ token: m[0], start: m.index, end: m.index + m[0].length })
    }

    // Step 1 - Pencarian dengan Boyer-Moore pada teks normalisasi
    for (const pattern in badWords) {
        const replacement = badWords[pattern]
        const bmMatches = boyerMooreSearch(normalizedText, text, normToOrig, pattern)
        console.log('bmMatches', bmMatches, replacement, pattern)
        for (const match of bmMatches) {
            matches.push({
                original: pattern,
                replacement,
                start: match.start,
                end: match.end,
                rawWord: match.rawWord,
            })
        }
    }

    // Step 2 - Pencarian fuzzy regex pada setiap token (kata)
    const checkedFuzzyKeys = new Set<string>()
    for (const pattern in badWords) {
        const replacement = badWords[pattern]
        if (pattern.length < 3) continue

        const fuzzyRx = buildFuzzyRegex(pattern)

        for (const { token, start, end } of tokens) {
            if (matches.some((m) => m.start <= start && m.end >= end)) continue
            const key = `${pattern}@${start}`
            if (checkedFuzzyKeys.has(key)) continue
            checkedFuzzyKeys.add(key)
            const normalizedToken = normalizeWord(token)
            if (normalizedToken.length < pattern.length) continue
            if (fuzzyRx.test(normalizedToken)) {
                matches.push({ original: pattern, replacement, start, end, rawWord: token })
            }
        }
    }

    // Menghapus overlap match, hanya ambil yang pertama
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

    const endTime = performance.now()
    const durationMs = Math.round(endTime - startTime)

    // ----- DETECTION ACCURACY -----
    let detectionAccuracy: number | undefined = undefined
    let detectedTrueArr: string[] = []
    let detectedTrueCount = 0
    if (trueBadWords && trueBadWords.length > 0) {
        // Normalisasi agar perbandingan adil (baik di DB maupun input ground truth)
        const normalizeArr = (arr: string[]) => arr.map(w => normalizeWord(w));
        const detected = filtered.map(f => f.original);
        const normalizedDetected = normalizeArr(detected);
        const normalizedTrue = normalizeArr(trueBadWords);

        // Hitung banyak ground-truth bad words yang sukses terdeteksi
        detectedTrueArr = normalizedTrue.filter(word => normalizedDetected.includes(word));
        detectedTrueCount = detectedTrueArr.length;
        detectionAccuracy = Number(((detectedTrueCount / normalizedTrue.length) * 100).toFixed(2));
    }

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
        durationMs: durationMs,
        detectionAccuracy: detectionAccuracy,
        detectedTrueArr,
        detectedTrueCount
    }
}