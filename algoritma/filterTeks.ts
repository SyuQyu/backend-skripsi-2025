import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mengambil daftar kata kasar dan kata penggantinya dari database.
 * @returns Promise<Record<string, string>> - Objek dengan format { badWord: goodWord }
 */
async function getBadWordsFromDB(): Promise<Record<string, string>> {
    const badWordsList = await prisma.listBadWords.findMany({
        include: {
            goodWords: true,
        },
    });

    let badWords: Record<string, string> = {};

    for (const badWordItem of badWordsList) {
        const normalizedWord = normalizeWord(badWordItem.word);
        const replacement = badWordItem.goodWords.length > 0 ? badWordItem.goodWords[0].word : badWordItem.word;
        badWords[normalizedWord] = replacement; // Simpan kata kasar dalam bentuk normalisasi
    }

    return badWords;
}

/**
 * Menormalisasi kata dengan mengganti angka menjadi huruf dan menghapus pengulangan berlebihan.
 * @param word Kata yang akan dinormalisasi.
 * @returns Kata yang telah dinormalisasi.
 */
function normalizeWord(word: string): string {
    const charMap: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };

    word = word.toLowerCase().replace(/[013457]/g, char => charMap[char] || char);

    // Menghapus semua angka tambahan yang tidak diubah sebelumnya
    word = word.replace(/\d+/g, "");

    // Menghapus huruf berulang lebih dari 2 kali berturut-turut
    // return word.replace(/(.)\1{2,}/g, "$1$1");
    return word.replace(/(.)\1+/g, "$1");
}

/**
 * Membuat tabel karakter buruk untuk heuristik "Bad Character" dalam algoritma Boyer-Moore.
 * @param pattern Pola kata kasar yang ingin difilter.
 * @returns Tabel karakter buruk sebagai objek.
 */
function buildBadCharacterTable(pattern: string): Record<string, number> {
    const table: Record<string, number> = {};
    const patternLength = pattern.length;
    for (let i = 0; i < patternLength - 1; i++) {
        table[pattern[i]] = patternLength - 1 - i;
    }
    return table;
}

/**
 * Memfilter teks menggunakan algoritma Boyer-Moore untuk mengganti kata kasar dengan kata yang lebih sopan.
 * @param text Teks yang akan difilter.
 * @returns Promise<{ filteredText: string; filteredWords: { original: string; replacement: string; position: number }[] }>
 */
export async function boyerMooreFilter(text: string): Promise<{ filteredText: string; filteredWords: { original: string; replacement: string; position: number }[] }> {
    let badWords = await getBadWordsFromDB(); // Sudah dalam bentuk normalisasi
    let filteredText = text;
    let filteredWords: { original: string; replacement: string; position: number }[] = [];

    let normalizedText = normalizeWord(text); // Normalisasi teks sebelum difilter
    console.log(normalizedText);
    for (const badWord in badWords) {
        const replacement = badWords[badWord];
        const badCharTable = buildBadCharacterTable(badWord);
        let index = 0;

        while (index <= normalizedText.length - badWord.length) {
            let matchIndex = badWord.length - 1;
            let subText = normalizedText.substring(index, index + badWord.length);

            while (matchIndex >= 0 && badWord[matchIndex] === subText[matchIndex]) {
                matchIndex--;
            }

            if (matchIndex < 0) {
                filteredWords.push({ original: badWord, replacement, position: index });

                // Cari bagian asli yang sesuai dalam teks original
                const originalSubText = text.substring(index, index + badWord.length);
                filteredText = filteredText.replace(originalSubText, replacement);
                index += replacement.length;
            } else {
                const badCharShift = badCharTable[normalizedText[index + matchIndex]] || badWord.length;
                index += Math.max(1, badCharShift);
            }
        }
    }
    return { filteredText, filteredWords };
}

// Contoh penggunaan
// (async () => {
//     const text = "Dasar kamu g0b0lk dan 4anj1ing!";
//     const result = await boyerMooreFilter(text);
//     console.log(result);
// })();
