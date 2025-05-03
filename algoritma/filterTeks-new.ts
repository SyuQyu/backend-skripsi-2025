import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Melakukan normalisasi kata:
 * - Angka l33t diubah ke huruf (contoh: 4 -> a, 3 -> e, dsb)
 * - Semua huruf diubah menjadi lowercase
 * - Hanya karakter a-z yang diambil (karakter non-alfabet dihapus)
 */
function normalizeWord(word: string): string {
    const charMap: Record<string, string> = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't'
    };
    return word
        .toLowerCase()
        .replace(/[013457]/g, char => charMap[char] || char) // Ganti angka l33t dengan huruf
        .replace(/[^a-z]/g, ""); // Hapus karakter non-alfabet
}

/**
 * Menghasilkan:
 * - normalized: hasil normalisasi seluruh teks (semua karakter diubah)
 * - mapping: array yang memetakan index pada normalized ke index teks aslinya,
 *   agar tahu di mana posisi kata asli pada kalimat.
 */
function getNormalizationMapping(text: string) {
    const charMap: Record<string, string> = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't'
    };
    let normalized = '';
    let mapping: number[] = [];
    for (let i = 0; i < text.length; ++i) {
        let ch = text[i].toLowerCase();
        if (charMap[ch]) ch = charMap[ch]; // Ganti angka l33t dengan huruf
        if (!/[a-z]/.test(ch)) continue; // Abaikan karakter non-alfabet
        normalized += ch;
        mapping.push(i); // Simpan index asli
    }
    return { normalized, mapping };
}

/**
 * Mengambil daftar badwords dari database menggunakan Prisma.
 * Hasil berupa objek dengan format { normalized_badword: replacement }.
 */
async function getBadWordsFromDB(): Promise<Record<string, string>> {
    const badWordsList = await prisma.listBadWords.findMany({ include: { goodWords: true } });
    const badWords: Record<string, string> = {};
    for (const item of badWordsList) {
        const normalized = normalizeWord(item.word); // Normalisasi kata kasar
        const replacement = item.goodWords.length > 0 ? item.goodWords[0].word : item.word; // Ambil kata pengganti
        badWords[normalized] = replacement;
    }
    return badWords;
}

/**
 * Membuat tabel shift Boyer-Moore (bad character table).
 * Tabel ini digunakan untuk mempercepat pencarian pola dalam algoritma Boyer-Moore.
 */
function buildBadCharacterTable(pattern: string): Record<string, number> {
    const table: Record<string, number> = {};
    const len = pattern.length;
    for (let i = 0; i < len - 1; i++) {
        table[pattern[i]] = len - 1 - i; // Hitung jarak shift untuk setiap karakter
    }
    return table;
}

/**
 * Fungsi pencarian kemunculan substring (pattern) dalam haystack normalized
 * Menggunakan algoritma Boyer-Moore (bad character rule).
 * Mengembalikan array match: { start, end, pattern, rawWord }
 */
function boyerMooreSearch(
    haystack: string,
    origText: string,
    origMapping: number[],
    pattern: string
): Array<{ start: number; end: number; pattern: string; rawWord: string }> {
    const results: Array<{ start: number; end: number; pattern: string; rawWord: string }> = [];
    const badCharTable = buildBadCharacterTable(pattern);
    let i = 0;

    while (i <= haystack.length - pattern.length) {
        let j = pattern.length - 1;
        // console.log(`[BM] Pattern "${pattern}" - Cek di index normalized: ${i} (window: "${haystack.slice(i, i + pattern.length)}")`);
        while (j >= 0 && haystack[i + j] === pattern[j]) {
            // console.log(`    [BM]   Karakter cocok "${haystack[i + j]}" di posisi pattern ${j}`);
            j--;
        }
        if (j < 0) {
            // Cocok, mapping ke posisi asli
            const origStart = origMapping[i];
            const origEnd = origMapping[i + pattern.length - 1] + 1;
            const { start, end, rawWord } = expandToWord(origText, origStart, origEnd);
            // console.log(`[BM] >> Match ditemukan untuk "${pattern}" di teks asli index: [${start}-${end}], kata: "${rawWord}"`);
            results.push({ start, end, pattern, rawWord });
            i += pattern.length;
        } else {
            const shiftChar = haystack[i + j];
            const shiftValue = badCharTable[shiftChar] ?? pattern.length;
            // console.log(
            //     `[BM]   Tidak cocok pada posisi pattern ${j}. Karakter "${shiftChar}" menyebabkan shift: ${shiftValue}`
            // );
            i += shiftValue;
        }
    }
    return results;
}
/**
 * Membangun regex fuzzy (toleran):
 * Setiap huruf dalam pola diizinkan memiliki jeda antar huruf,
 * sehingga pola seperti "b*a*n*g*s*a*t" tetap cocok.
 */
function buildFuzzyRegex(pattern: string): RegExp {
    // Contoh: "bangsat" menjadi "b+.*?a+.*?n+.*?g+.*?s+.*?a+.*?t+"
    let rx = pattern.split('').map(ch => ch + '+.*?').join('');
    return new RegExp(rx, 'i'); // Case-insensitive
}

/**
 * Memperluas rentang ke "satu kata" (token) pada teks asli.
 * Rentang diperluas ke depan dan belakang hingga mencakup semua huruf/digit.
 */
function expandToWord(text: string, startIdx: number, endIdx: number): { start: number, end: number, rawWord: string } {
    while (startIdx > 0 && /[a-zA-Z0-9]/.test(text[startIdx - 1])) startIdx--; // Mundur hingga awal kata
    while (endIdx < text.length && /[a-zA-Z0-9]/.test(text[endIdx])) endIdx++; // Maju hingga akhir kata
    return { start: startIdx, end: endIdx, rawWord: text.slice(startIdx, endIdx) };
}

/**
 * Fungsi utama untuk memfilter teks.
 */
export async function boyerMooreFilter(
    text: string
): Promise<{
    status: string;
    original: string;
    filteredWords: { original: string; replacement: string; position: number; rawWord: string }[];
    filtered: string;
    bannedWords: string[];
    replacementWords: string[];
    filteredText: string;
}> {
    // Ambil daftar badwords dan kata pengganti dari database
    const badWords = await getBadWordsFromDB();

    // Normalisasi seluruh teks untuk algoritma Boyer-Moore
    const { normalized: normalizedText, mapping: normToOrig } = getNormalizationMapping(text);

    type Match = {
        original: string;
        replacement: string;
        start: number;
        end: number;
        rawWord: string;
    };
    const matches: Match[] = [];

    // --- STEP 1: Pencarian dengan Boyer-Moore pada teks hasil normalisasi ---
    for (const pattern in badWords) {
        const replacement = badWords[pattern];
        const matchesBm = boyerMooreSearch(
            normalizedText,
            text,
            normToOrig,
            pattern
        );
        for (const m of matchesBm) {
            matches.push({ original: pattern, replacement, start: m.start, end: m.end, rawWord: m.rawWord });
        }
    }

    // --- STEP 2a: Fuzzy regex pada tiap kata asli di teks ---
    const checkedFuzzyTokens = new Set<string>();
    const wordRegex = /\b\w+\b/g; // Regex untuk mendeteksi kata
    for (const badPattern in badWords) {
        const replacement = badWords[badPattern];
        const fuzzyRx = buildFuzzyRegex(badPattern); // Buat regex fuzzy
        let matchArr;
        while ((matchArr = wordRegex.exec(text)) !== null) {
            const token = matchArr[0];
            const tokenStart = matchArr.index;
            const tokenEnd = tokenStart + token.length;
            // Abaikan jika overlap sudah dideteksi
            if (matches.some(m => m.start <= tokenStart && m.end >= tokenEnd)) continue;
            const fuzzyKey = badPattern + '@' + tokenStart;
            if (checkedFuzzyTokens.has(fuzzyKey)) continue;
            checkedFuzzyTokens.add(fuzzyKey);
            if (fuzzyRx.test(token)) {
                matches.push({
                    original: badPattern,
                    replacement,
                    start: tokenStart,
                    end: tokenEnd,
                    rawWord: token,
                });
            }
        }
    }

    // --- STEP 2b: Fuzzy regex pada token hasil normalisasi ---
    for (const badPattern in badWords) {
        const replacement = badWords[badPattern];
        const fuzzyRx = buildFuzzyRegex(badPattern);
        let matchArr;
        while ((matchArr = wordRegex.exec(text)) !== null) {
            const token = matchArr[0];
            const tokenStart = matchArr.index;
            const tokenEnd = tokenStart + token.length;
            if (matches.some(m => m.start <= tokenStart && m.end >= tokenEnd)) continue;
            const tokenNorm = normalizeWord(token);
            if (tokenNorm.length < badPattern.length) continue; // Abaikan jika token terlalu pendek
            if (fuzzyRx.test(tokenNorm)) {
                matches.push({
                    original: badPattern,
                    replacement,
                    start: tokenStart,
                    end: tokenEnd,
                    rawWord: token,
                });
            }
        }
    }

    // Hapus overlap, ambil hanya yang pertama dalam rentang hasil
    matches.sort((a, b) => a.start - b.start);
    const filtered: Match[] = [];
    let lastEnd = -1;
    for (const match of matches) {
        if (match.start >= lastEnd) {
            filtered.push(match);
            lastEnd = match.end;
        }
    }

    // Susun hasil teks dengan kata kasar diganti kata pengganti
    let result = '';
    let idx = 0;
    for (const f of filtered) {
        result += text.slice(idx, f.start); // Tambahkan teks sebelum kata kasar
        result += f.replacement; // Tambahkan kata pengganti
        idx = f.end;
    }
    result += text.slice(idx); // Tambahkan sisa teks

    return {
        status: "success",
        original: text,
        filteredWords: filtered.map(f => ({
            original: f.original,
            replacement: f.replacement,
            position: f.start,
            rawWord: f.rawWord
        })),
        filtered: result,
        filteredText: result,
        bannedWords: filtered.map(f => f.original),
        replacementWords: filtered.map(f => f.replacement)
    };
}