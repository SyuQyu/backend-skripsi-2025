import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import os from 'os';

function getMemoryUsage() { /* ... */ }
function getCpuUsage() { /* ... */ }
function expandToWord(
    text: string,
    startIdx: number,
    endIdx: number
): { start: number; end: number; rawWord: string } {
    while (startIdx > 0 && /[a-zA-Z0-9]/.test(text[startIdx - 1])) startIdx--
    while (endIdx < text.length && /[a-zA-Z0-9]/.test(text[endIdx])) endIdx++
    return { start: startIdx, end: endIdx, rawWord: text.slice(startIdx, endIdx) }
}

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

const badCharCache = new Map<string, Record<string, number>>()
function buildBadCharacterTable(pattern: string): Record<string, number> {
    if (badCharCache.has(pattern)) return badCharCache.get(pattern)!
    const table: Record<string, number> = {}
    for (let i = 0; i < pattern.length - 1; i++) {
        table[pattern[i]] = pattern.length - 1 - i
    }
    badCharCache.set(pattern, table)
    return table
}


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

export async function boyerMooreWithNormalization(
    text: string,
    trueBadWords?: string[]
) {
    const startTime = performance.now()
    const initialMemory = getMemoryUsage();
    const initialCpu = getCpuUsage();

    const badWords = await getBadWordsFromDB()
    const { normalized: normalizedText, mapping: normToOrig } = getNormalizationMapping(text)
    const matches: any[] = []

    for (const pattern in badWords) {
        const replacement = badWords[pattern]
        const bmMatches = boyerMooreSearch(normalizedText, text, normToOrig, pattern)
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

    // --- Penambahan fitur analisis deteksi ground-truth ---
    let detectedTrueCount = 0
    let totalDetectedCount = filtered.length
    let detectedTrueArr: string[] = []
    if (trueBadWords && trueBadWords.length > 0) {
        // Deteksi dengan normalisasi juga agar adil
        const norm = (w: string) => normalizeWord(w)
        const trueSet = new Set(trueBadWords.map(norm))
        const detected = new Set(filtered.map(f => f.original))
        detectedTrueArr = Array.from(trueSet).filter(word => detected.has(word))
        detectedTrueCount = detectedTrueArr.length
    }
    // Opsional: detectionAccuracy (berapa % trueBadWords yang terdeteksi)
    let detectionAccuracy: number | undefined = undefined
    if (trueBadWords && trueBadWords.length > 0) {
        detectionAccuracy = Number(((detectedTrueCount / trueBadWords.length) * 100).toFixed(2))
    }

    const endTime = performance.now()
    const durationMs = Math.round(endTime - startTime)
    const finalMemory = getMemoryUsage();
    const finalCpu = getCpuUsage();

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
        memoryUsage: { initialMemory, finalMemory },
        cpuUsage: { initialCpu, finalCpu },
        // --- HASIL TAMBAHAN ---
        trueBadWords,
        detectedTrueArr,        // Kata di trueBadWords yang benar-benar terdeteksi
        detectedTrueCount,      // Jumlah trueBadWords yang terdeteksi
        totalDetectedCount,     // Jumlah total kata kasar yang terdeteksi (dari DB)
        detectionAccuracy       // % dari trueBadWords yang terdeteksi
    }
}