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
        // Ambil kata sopan pertama (jika ada), jika tidak, gunakan kata aslinya
        const replacement = badWordItem.goodWords.length > 0 ? badWordItem.goodWords[0].word : badWordItem.word;
        badWords[badWordItem.word] = replacement;
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

    // Ubah angka menjadi huruf yang sesuai
    word = word.replace(/[013457]/g, char => charMap[char] || char);

    // // Hapus pengulangan huruf berlebihan kecuali untuk kata yang memang memiliki huruf ganda
    // const exceptions = Object.keys(badWords).map(w => w.replace(/(.)\1/g, "$1$1"));
    // for (const exception of exceptions) {
    //     if (word.includes(exception)) return word;
    // }
    // return word.replace(/(.)\1{2,}/g, "$1");

    // Hapus pengulangan huruf berlebihan (contoh: goooobloooook -> goblok)
    return word.replace(/(.)\1{2,}/g, "$1");
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
    let badWords = await getBadWordsFromDB(); // Ambil daftar kata kasar dari database
    let filteredText = text;
    let filteredWords: { original: string; replacement: string; position: number }[] = [];

    for (const badWord in badWords) {
        const replacement = badWords[badWord];
        const normalizedBadWord = normalizeWord(badWord);
        const badCharTable = buildBadCharacterTable(normalizedBadWord);
        let index = 0;

        while (index <= filteredText.length - normalizedBadWord.length) {
            let matchIndex = normalizedBadWord.length - 1;
            let subText = filteredText.substring(index, index + normalizedBadWord.length);
            let normalizedSubText = normalizeWord(subText);

            while (matchIndex >= 0 && normalizedBadWord[matchIndex] === normalizedSubText[matchIndex]) {
                matchIndex--;
            }

            if (matchIndex < 0) {
                filteredWords.push({ original: badWord, replacement, position: index });
                filteredText =
                    filteredText.substring(0, index) +
                    replacement +
                    filteredText.substring(index + normalizedBadWord.length);
                index += replacement.length;
            } else {
                const badCharShift = badCharTable[filteredText[index + matchIndex]] || normalizedBadWord.length;
                index += Math.max(1, badCharShift);
            }
        }
    }
    return { filteredText, filteredWords };
}

// Contoh penggunaan
// (async () => {
//     const text = "Dasar kamu goblok dan anjing!";
//     const result = await boyerMooreFilter(text);
//     console.log(result);
// })();
