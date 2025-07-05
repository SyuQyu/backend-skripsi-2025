import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'
import { getCommonWords } from '../queries/commonWords.queries'

const prisma = new PrismaClient()

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

async function getBadWordsFromDB(): Promise<Record<string, { primary: string, all: string[] }>> {
    // Ambil semua relasi many-to-many antara kata kasar dan kata baik
    const badWordGoodWords = await prisma.badWordGoodWord.findMany({
        include: {
            badWord: true,
            goodWord: true
        }
    });

    // Map badword (sudah dinormalisasi) ke goodword (simpan semua padanan)
    const badWords: Record<string, { primary: string, all: string[] }> = {};
    for (const rel of badWordGoodWords) {
        const normalized = normalizeWord(rel.badWord.word);
        // Hanya tambahkan kata dengan panjang minimal tertentu untuk menghindari false positive
        if (normalized.length < 2) continue;

        // Inisialisasi jika belum ada
        if (!badWords[normalized]) {
            badWords[normalized] = { primary: rel.goodWord.word, all: [rel.goodWord.word] };
        } else {
            // Tambahkan ke daftar jika belum ada
            if (!badWords[normalized].all.includes(rel.goodWord.word)) {
                badWords[normalized].all.push(rel.goodWord.word);
            }
        }
    }

    // Jika ada badword tanpa padanan, tambahkan dirinya sendiri sebagai pengganti
    const allBadWords = await prisma.badWord.findMany();
    for (const item of allBadWords) {
        const normalized = normalizeWord(item.word);
        if (normalized.length < 2) continue;
        if (!badWords[normalized]) {
            badWords[normalized] = { primary: item.word, all: [item.word] };
        }
    }
    return badWords;
}

async function getCommonWordsSet(): Promise<Set<string>> {
    try {
        const commonWordsList = await getCommonWords();
        const wordSet = new Set<string>();
        for (const item of commonWordsList) {
            const normalized = normalizeWord(item.word);
            if (normalized.length > 0) {
                wordSet.add(normalized);
            }
        }
        if (wordSet.size === 0) {
            return new Set([
                'kasian', 'sia', 'ti', 'menye', 'item', 'bodo', 'hati',
                'nakal', 'makan', 'tidak', 'pasang', 'kasih'
            ]);
        }
        return wordSet;
    } catch (error) {
        console.error('Error fetching common words:', error);
        return new Set([
            'kasian', 'sia', 'ti', 'menye', 'item', 'bodo', 'hati',
            'nakal', 'makan', 'tidak', 'pasang', 'kasih'
        ]);
    }
}

function buildFuzzyRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const fuzzyPattern = escaped.split('').join('.*')
    return new RegExp(`\\b${fuzzyPattern}\\b`, 'i')
}

function verifyMatch(token: string, pattern: string, commonWordsSet: Set<string>): boolean {
    if (commonWordsSet.has(pattern) && normalizeWord(token) !== pattern) {
        return false;
    }
    if (pattern.length <= 2 && normalizeWord(token) !== pattern) {
        return false;
    }
    return true;
}

/**
 * Jalankan filter hanya dengan fuzzy regex (tanpa Boyer-Moore).
 * @param text Teks yang akan difilter
 * @param trueBadWords Daftar kata kasar ground-truth untuk evaluasi akurasi
 * @param showMultipleReplacements Apakah menampilkan semua kata pengganti
 * @returns Hasil filter dan daftar kata yang difilter
 */
export async function fuzzyRegexOnlyFilter(
    text: string,
    trueBadWords?: string[],
    showMultipleReplacements: boolean = false
): Promise<{
    status: string
    original: string
    filteredWords: {
        original: string;
        replacement: string;
        replacements?: string[];
        position: number;
        rawWord: string
    }[]
    filtered: string
    bannedWords: string[]
    replacementWords: string[]
    allReplacementWords?: string[][]
    filteredText: string
    durationMs: number
    detectionAccuracy?: number
    detectedTrueArr?: string[]
    detectedTrueCount?: number
}> {
    const startTime = performance.now()
    const badWords = await getBadWordsFromDB()
    const commonWordsSet = await getCommonWordsSet()

    type Match = {
        original: string
        replacement: string
        replacements: string[]
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
        if (commonWordsSet.has(pattern)) continue;
        const replacement = badWords[pattern].primary
        const replacements = badWords[pattern].all
        const fuzzyRx = buildFuzzyRegex(pattern)
        for (const { token, start, end } of tokens) {
            if (matches.some((m) => m.start <= start && m.end >= end)) continue;
            const key = `${pattern}@${start}`
            if (checkedFuzzyKeys.has(key)) continue;
            checkedFuzzyKeys.add(key)
            const normalizedToken = normalizeWord(token)
            if (normalizedToken.length < pattern.length) continue;
            if (fuzzyRx.test(normalizedToken)) {
                if (!verifyMatch(token, pattern, commonWordsSet)) continue;
                matches.push({
                    original: pattern,
                    replacement,
                    replacements,
                    start,
                    end,
                    rawWord: token
                })
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
        const normalizeArr = (arr: string[]) => arr.map(w => normalizeWord(w));
        const detected = filtered.map(f => f.original);
        const normalizedDetected = normalizeArr(detected);
        const normalizedTrue = normalizeArr(trueBadWords);
        detectedTrueArr = normalizedTrue.filter(word => normalizedDetected.includes(word));
        detectedTrueCount = detectedTrueArr.length;
        detectionAccuracy = Number(((detectedTrueCount / normalizedTrue.length) * 100).toFixed(2));
    }

    const endTime = performance.now()
    const durationMs = Math.round(endTime - startTime)

    return {
        status: 'success',
        original: text,
        filteredWords: filtered.map((f) => ({
            original: f.original,
            replacement: f.replacement,
            replacements: showMultipleReplacements ? f.replacements : undefined,
            position: f.start,
            rawWord: f.rawWord,
        })),
        filtered: result,
        filteredText: result,
        bannedWords: filtered.map((f) => f.original),
        replacementWords: filtered.map((f) => f.replacement),
        allReplacementWords: showMultipleReplacements ? filtered.map((f) => f.replacements) : undefined,
        durationMs,
        detectionAccuracy,
        detectedTrueArr,
        detectedTrueCount
    }
}