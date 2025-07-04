import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function getBadWordsFromDB() {
    // Ambil semua relasi kata kasar dan kata baik (many-to-many)
    const badWordGoodWords = await prisma.badWordGoodWord.findMany({
        include: {
            badWord: true,
            goodWord: true
        }
    });

    // Map badword ke goodword (ambil satu padanan utama untuk setiap badword)
    const badWords: Record<string, string> = {};
    for (const rel of badWordGoodWords) {
        const bad = rel.badWord.word;
        const good = rel.goodWord.word;
        // Jika sudah ada, jangan timpa (ambil padanan pertama saja)
        if (!badWords[bad]) {
            badWords[bad] = good;
        }
    }
    // Jika ada badword tanpa padanan, tambahkan dirinya sendiri sebagai pengganti
    const allBadWords = await prisma.badWord.findMany();
    for (const item of allBadWords) {
        if (!badWords[item.word]) {
            badWords[item.word] = item.word;
        }
    }
    return badWords;
}

/**
 * Membuat regular expression fuzzy dari pattern.
 * Setiap karakter di pattern boleh dipisahkan karakter lain (misal: "bad" -> /b.*a.*d/i).
 */
function buildFuzzyRegex(pattern: string): RegExp {
    try {
        // Escape each character individually before joining with .*
        const fuzzyPattern = pattern
            .split('')
            .map(char => {
                // Escape special regex characters
                if (/[-/\\^$*+?.()|[\]{}]/.test(char)) {
                    return '\\' + char;
                }
                return char;
            })
            .join('.*');

        return new RegExp(`\\b${fuzzyPattern}\\b`, 'i');
    } catch (error) {
        console.error(`Invalid regex pattern for: ${pattern}`, error);
        // Fallback to exact match if regex creation fails
        return new RegExp(`\\b${pattern}\\b`, 'i');
    }
}

export async function boyerMooreWithFuzzy(
    text: string,
    trueBadWords?: string[]
) {
    const startTime = performance.now()

    const badWords = await getBadWordsFromDB()
    const matches: any[] = []

    // Tokenisasi kata (per word, tanpa normalisasi)
    const wordRegex = /\b\w+\b/g
    const tokens: { token: string; start: number; end: number }[] = []
    let m
    while ((m = wordRegex.exec(text)) !== null)
        tokens.push({ token: m[0], start: m.index, end: m.index + m[0].length })

    // Fuzzy regex di setiap token
    for (const pattern in badWords) {
        const replacement = badWords[pattern]
        if (pattern.length < 3) continue
        const fuzzyRx = buildFuzzyRegex(pattern)
        for (const { token, start, end } of tokens) {
            if (token.length < pattern.length) continue
            if (fuzzyRx.test(token)) {
                matches.push({ original: pattern, replacement, start, end, rawWord: token })
            }
        }
    }

    // Remove overlap sederhana
    matches.sort((a, b) => a.start - b.start)
    const filtered: typeof matches = []
    let lastEnd = -1
    for (const m of matches) {
        if (m.start >= lastEnd) {
            filtered.push(m)
            lastEnd = m.end
        }
    }

    let result = ''
    let idx = 0
    for (const f of filtered) {
        result += text.slice(idx, f.start)
        result += f.replacement
        idx = f.end
    }
    result += text.slice(idx)

    // --- Tambahan analisis true detected ---
    let detectedTrueCount = 0
    let totalDetectedCount = filtered.length
    let detectedTrueArr: string[] = []
    if (trueBadWords && trueBadWords.length > 0) {
        // Hanya unique untuk trueBadWords
        const trueWords = new Set(trueBadWords.map(w => w.toLowerCase()))
        const detected = new Set(filtered.map(f => f.original.toLowerCase()))
        detectedTrueArr = Array.from(trueWords).filter(word => detected.has(word))
        detectedTrueCount = detectedTrueArr.length
    }
    // Opsional detectionAccuracy (%) juga bisa dihitung:
    let detectionAccuracy: number | undefined = undefined
    if (trueBadWords && trueBadWords.length > 0) {
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
        durationMs: durationMs,
        trueBadWords,
        detectedTrueArr,         // Daftar trueBadWords yang berhasil terdeteksi
        detectedTrueCount,       // Jumlah trueBadWords yang berhasil terdeteksi
        totalDetectedCount,      // Total kata kasar yang terdeteksi (dari DB)
        detectionAccuracy        // Persentase trueBadWords yang berhasil terdeteksi
    }
}