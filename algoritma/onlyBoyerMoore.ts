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
) {
    while (startIdx > 0 && /[a-zA-Z0-9]/.test(text[startIdx - 1])) startIdx--
    while (endIdx < text.length && /[a-zA-Z0-9]/.test(text[endIdx])) endIdx++
    return { start: startIdx, end: endIdx, rawWord: text.slice(startIdx, endIdx) }
}

async function getBadWordsFromDB() {
    // Ambil semua relasi many-to-many antara kata kasar dan kata baik
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

function boyerMooreSearch(haystack: string, origText: string, pattern: string) {
    const results = []
    const badCharTable = buildBadCharacterTable(pattern)
    let i = 0
    while (i <= haystack.length - pattern.length) {
        let j = pattern.length - 1
        while (j >= 0 && haystack[i + j] === pattern[j]) j--
        if (j < 0) {
            const origStart = i
            const origEnd = i + pattern.length
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

export async function boyerMooreOnly(
    text: string,
    trueBadWords?: string[]
) {
    const startTime = performance.now()
    const initialMemory = getMemoryUsage();
    const initialCpu = getCpuUsage();

    const badWords = await getBadWordsFromDB()
    const matches: any[] = []

    // Direct Boyer-Moore (no normalization, no fuzzy)
    for (const pattern in badWords) {
        const replacement = badWords[pattern]
        const bmMatches = boyerMooreSearch(text, text, pattern)
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

    // Replaces without overlap: simple (urutan urut)
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
        // Berapa dari ground-truth yang sukses terdeteksi (no normalization)
        // Hanya unique, gunakan Set agar double-count (misal "bangsat" 2x) dihitung 1
        const trueWords = new Set(trueBadWords.map(w => w.toLowerCase()))
        const detected = new Set(filtered.map(f => f.original.toLowerCase()))
        detectedTrueArr = Array.from(trueWords).filter(word => detected.has(word))
        detectedTrueCount = detectedTrueArr.length
    }

    // Tambahan: detection accuracy persentase
    let detectionAccuracy: number | undefined = undefined
    if (trueBadWords && trueBadWords.length > 0) {
        detectionAccuracy = Number(((detectedTrueCount / trueBadWords.length) * 100).toFixed(2));
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
        trueBadWords,
        detectedTrueArr,         // Daftar trueBadWords yang benar-benar terdeteksi
        detectedTrueCount,       // Jumlah trueBadWords yang ditemukan
        totalDetectedCount,      // Total kata terdeteksi (dari DB)
        detectionAccuracy        // % ground-truth terdeteksi
    }
}