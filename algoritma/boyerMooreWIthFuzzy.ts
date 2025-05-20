import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import os from 'os';

function getMemoryUsage() { /* ...Sama seperti kode aslinya... */ }
function getCpuUsage() { /* ...Sama seperti kode aslinya... */ }

async function getBadWordsFromDB() {
    const badWordsList = await prisma.listBadWords.findMany({ include: { goodWords: true } })
    const badWords: Record<string, string> = {}
    for (const item of badWordsList) {
        const replacement = item.goodWords.length > 0 ? item.goodWords[0].word : item.word
        badWords[item.word] = replacement
    }
    return badWords
}

function buildFuzzyRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const fuzzyPattern = escaped.split('').join('.*')
    return new RegExp(fuzzyPattern, 'i')
}

export async function boyerMooreWithFuzzy(
    text: string,
    trueBadWords?: string[]
) {
    const startTime = performance.now()
    const initialMemory = getMemoryUsage();
    const initialCpu = getCpuUsage();

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
        detectedTrueArr,         // Daftar trueBadWords yang berhasil terdeteksi
        detectedTrueCount,       // Jumlah trueBadWords yang berhasil terdeteksi
        totalDetectedCount,      // Total kata kasar yang terdeteksi (dari DB)
        detectionAccuracy        // Persentase trueBadWords yang berhasil terdeteksi
    }
}