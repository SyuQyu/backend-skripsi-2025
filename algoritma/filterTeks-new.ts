import { performance } from 'perf_hooks'
import { PrismaClient } from '@prisma/client'
import { getCommonWords } from '../queries/commonWords.queries'
import fetch from 'node-fetch' // pastikan sudah install: npm install node-fetch

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
 * Output: { normalized_badword: { primary: string, all: string[] } }
 */
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

/**
 * Mengambil daftar kata umum yang sering terdeteksi sebagai false positive dari database.
 * Kata-kata ini akan diperlakukan khusus dalam algoritma deteksi.
 */
async function getCommonWordsSet(): Promise<Set<string>> {
    try {
        // Ambil data dari database
        const commonWordsList = await getCommonWords();

        // Konversi ke set untuk pencarian yang lebih cepat
        const wordSet = new Set<string>();

        for (const item of commonWordsList) {
            const normalized = normalizeWord(item.word);
            if (normalized.length > 0) {
                wordSet.add(normalized);
            }
        }

        // Tambahkan kata-kata umum default jika database kosong
        if (wordSet.size === 0) {
            return new Set([
                'kasian', 'sia', 'ti', 'menye', 'item', 'bodo', 'hati',
                'nakal', 'makan', 'tidak', 'pasang', 'kasih'
            ]);
        }

        return wordSet;
    } catch (error) {
        console.error('Error fetching common words:', error);
        // Fallback ke daftar default jika terjadi error
        return new Set([
            'kasian', 'sia', 'ti', 'menye', 'item', 'bodo', 'hati',
            'nakal', 'makan', 'tidak', 'pasang', 'kasih'
        ]);
    }
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
    pattern: string,
    commonWordsSet: Set<string>
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

            // Cek apakah kata ini merupakan bagian dari kata yang lebih besar
            // Jika ya, dan kata itu ada di daftar kata umum, lewati
            if (commonWordsSet.has(pattern) && isPartOfLargerWord(origText, start, end)) {
                i += pattern.length;
                continue;
            }

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
 * Memeriksa apakah sebuah kata merupakan bagian dari kata yang lebih besar
 * dengan melihat konteks sebelum dan sesudahnya
 */
function isPartOfLargerWord(text: string, start: number, end: number): boolean {
    // Cek apakah ada karakter alfanumerik langsung sebelum atau sesudah kata
    // yang menunjukkan itu bagian dari kata yang lebih besar
    const prevChar = start > 0 ? text[start - 1] : '';
    const nextChar = end < text.length ? text[end] : '';

    return /[a-zA-Z0-9]/.test(prevChar) || /[a-zA-Z0-9]/.test(nextChar);
}

/**
 * Membuat regular expression fuzzy dari pattern.
 * Setiap karakter di pattern boleh dipisahkan karakter lain (misal: "bad" -> /b.*a.*d/i).
 */
function buildFuzzyRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const fuzzyPattern = escaped.split('').join('.*')
    return new RegExp(`\\b${fuzzyPattern}\\b`, 'i') // Tambahkan word boundary
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

/**
 * Verifikasi apakah kata yang ditemukan benar-benar kata kasar atau false positive
 */
function verifyMatch(token: string, pattern: string, commonWordsSet: Set<string>): boolean {
    // Jika pattern ada di daftar kata umum dan tidak persis sama dengan token, 
    // anggap sebagai false positive
    if (commonWordsSet.has(pattern) && normalizeWord(token) !== pattern) {
        return false;
    }

    // Tambahan: jika pattern terlalu pendek, harus sama persis dengan token
    if (pattern.length <= 2 && normalizeWord(token) !== pattern) {
        return false;
    }

    return true;
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
 * @param showMultipleReplacements (opsional) Apakah menampilkan semua kata pengganti
 * @returns Hasil filter, daftar kata yang difilter, statistik, dan akurasi deteksi (jika ada)
 */
export async function boyerMooreFilter(
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
    filteredBeforeAI: string
    filteredAI: string
    durationMs: number
    detectionAccuracy?: number
    detectedTrueArr?: string[]
    detectedTrueCount?: number
    paraphrased?: boolean
}> {
    const startTime = performance.now()

    // Ambil daftar kata kasar dari DB
    const badWords = await getBadWordsFromDB()
    // Ambil daftar kata umum dari DB
    const commonWordsSet = await getCommonWordsSet()
    // Normalisasi teks dan mapping ke posisi asli
    const { normalized: normalizedText, mapping: normToOrig } = getNormalizationMapping(text)

    type Match = {
        original: string
        replacement: string
        replacements: string[]
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
        // Skip kata yang terlalu pendek atau umum - cegah false positive
        if (pattern.length < 2) continue;

        const replacement = badWords[pattern].primary
        const replacements = badWords[pattern].all
        const bmMatches = boyerMooreSearch(normalizedText, text, normToOrig, pattern, commonWordsSet)

        for (const match of bmMatches) {
            // Verifikasi tambahan untuk mencegah false positive
            if (!verifyMatch(match.rawWord, pattern, commonWordsSet)) continue;

            matches.push({
                original: pattern,
                replacement,
                replacements,
                start: match.start,
                end: match.end,
                rawWord: match.rawWord,
            })
        }
    }

    // Step 2 - Pencarian fuzzy regex pada setiap token (kata)
    const checkedFuzzyKeys = new Set<string>()
    for (const pattern in badWords) {
        // Fuzzy search hanya untuk kata yang lebih panjang
        if (pattern.length < 4) continue;
        // Skip kata-kata umum dalam fuzzy search karena rawan false positive
        if (commonWordsSet.has(pattern)) continue;

        const replacement = badWords[pattern].primary
        const replacements = badWords[pattern].all
        const fuzzyRx = buildFuzzyRegex(pattern)

        for (const { token, start, end } of tokens) {
            // Skip jika token sudah tercakup dalam match sebelumnya
            if (matches.some((m) => m.start <= start && m.end >= end)) continue;

            const key = `${pattern}@${start}`
            if (checkedFuzzyKeys.has(key)) continue;
            checkedFuzzyKeys.add(key)

            const normalizedToken = normalizeWord(token)
            // Skip jika token terlalu pendek
            if (normalizedToken.length < pattern.length) continue;

            // Gunakan regex yang sudah ditambahkan word boundary
            if (fuzzyRx.test(normalizedToken)) {
                // Tambahan verifikasi untuk mengurangi false positive
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

    // === Parafrase AI ===
    let paraphrased = false
    let paraphrasedResult = result
    if (filtered.length > 0) {
        try {
            // Ambil kalimat yang mengandung kata kasar
            type SentenceSpan = { start: number; end: number }
            const sentenceSpans: SentenceSpan[] = []
            for (const f of filtered) {
                const { start: sentStart, end: sentEnd } = extractSentence(result, f.start, f.end)
                sentenceSpans.push({ start: sentStart, end: sentEnd })
            }
            // Merge overlapping spans
            sentenceSpans.sort((a, b) => a.start - b.start)
            const mergedSpans: SentenceSpan[] = []
            for (const span of sentenceSpans) {
                if (mergedSpans.length === 0 || span.start > mergedSpans[mergedSpans.length - 1].end) {
                    mergedSpans.push({ ...span })
                } else {
                    mergedSpans[mergedSpans.length - 1].end = Math.max(
                        mergedSpans[mergedSpans.length - 1].end,
                        span.end
                    )
                }
            }
            // Parafrase tiap kalimat dengan Wikidepia/IndoT5-base-paraphrase
            const paraphrasedSentences = await Promise.all(
                mergedSpans.map(s => paraphraseWithPython(result.slice(s.start, s.end)))
            )
            // Replace kalimat asli dengan hasil parafrase
            let resultText = ''
            let cursor = 0
            for (let i = 0; i < mergedSpans.length; i++) {
                const span = mergedSpans[i]
                resultText += result.slice(cursor, span.start)
                resultText += paraphrasedSentences[i]
                cursor = span.end
            }
            resultText += result.slice(cursor)
            paraphrasedResult = resultText
            paraphrased = true
        } catch (error) {
            console.error('Error during paraphrasing:', error)
            paraphrased = false
        }
    }

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
            replacements: showMultipleReplacements ? f.replacements : undefined,
            position: f.start,
            rawWord: f.rawWord,
        })),
        filtered: paraphrasedResult,
        filteredText: paraphrasedResult,
        filteredBeforeAI: result,
        filteredAI: paraphrasedResult,
        bannedWords: filtered.map((f) => f.original),
        replacementWords: filtered.map((f) => f.replacement),
        allReplacementWords: showMultipleReplacements ? filtered.map((f) => f.replacements) : undefined,
        durationMs: durationMs,
        detectionAccuracy: detectionAccuracy,
        detectedTrueArr,
        detectedTrueCount,
        paraphrased
    }
}
// Parafrase teks
// Fungsi parafrase menggunakan endpoint Flask API di localhost
async function paraphraseWithPython(text: string): Promise<string> {
    console.log('Paraphrasing text:', text);
    try {
        // Batasi panjang teks sesuai batasan Flask API
        if (text.length > 500) return text;
        const response = await fetch(
            `${process.env.BACKEND_AI_URL}/paraphrase`,
            // `http://localhost:8000/paraphrase`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
        const data = await response.json();
        console.log('Paraphrase response:', data);
        if (data.result) return data.result;
        return text;
    } catch (err) {
        console.error('Python paraphrase error:', err);
        return text;
    }
}

// Ambil kalimat penuh yang mengandung kata kasar
function extractSentence(text: string, startIdx: number, endIdx: number): { sentence: string, start: number, end: number } {
    let sentStart = text.lastIndexOf('.', startIdx - 1)
    sentStart = sentStart === -1 ? 0 : sentStart + 1
    let sentEnd = text.indexOf('.', endIdx)
    sentEnd = sentEnd === -1 ? text.length : sentEnd + 1
    const sentence = text.slice(sentStart, sentEnd).trim()
    return { sentence, start: sentStart, end: sentEnd }
}