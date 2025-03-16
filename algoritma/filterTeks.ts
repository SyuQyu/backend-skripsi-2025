// Import Prisma Client untuk berinteraksi dengan database
import { PrismaClient } from '@prisma/client';

// Membuat instance PrismaClient
const prisma = new PrismaClient();

/**
 * Mengambil daftar kata kasar dari database dan menormalisasi sebelum digunakan.
 * 
 * @returns {Promise<Record<string, string>>} - Objek yang berisi pasangan kata kasar dan penggantinya.
 */
async function getBadWordsFromDB(): Promise<Record<string, string>> {
    // Mengambil data dari tabel listBadWords dengan relasi ke goodWords
    const badWordsList = await prisma.listBadWords.findMany({
        include: {
            goodWords: true, // Mengambil daftar kata pengganti jika ada
        },
    });

    // Inisialisasi objek untuk menyimpan kata kasar dan penggantinya
    let badWords: Record<string, string> = {};

    // Iterasi setiap kata kasar yang diambil dari database
    for (const badWordItem of badWordsList) {
        // Normalisasi kata kasar agar lebih mudah dicocokkan
        const normalizedWord = normalizeWord(badWordItem.word);

        // Jika ada kata pengganti, gunakan kata pertama dari daftar goodWords
        // Jika tidak ada, gunakan kata aslinya sebagai pengganti (artinya tidak diganti)
        const replacement = badWordItem.goodWords.length > 0 ? badWordItem.goodWords[0].word : badWordItem.word;

        // Simpan hasil normalisasi dalam objek
        badWords[normalizedWord] = replacement;
    }

    return badWords; // Mengembalikan daftar kata kasar yang telah diproses
}

/**
 * Menormalisasi kata dengan mengganti angka menjadi huruf dan menghapus pengulangan huruf yang berlebihan.
 * 
 * @param {string} word - Kata yang akan dinormalisasi.
 * @returns {string} - Kata yang telah dinormalisasi.
 */
function normalizeWord(word: string): string {
    // Peta konversi angka menjadi huruf yang memiliki bentuk serupa
    const charMap: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };

    // Konversi angka ke huruf berdasarkan peta di atas
    word = word.toLowerCase().replace(/[013457]/g, char => charMap[char] || char);

    // Hapus angka yang tidak masuk dalam pemetaan
    word = word.replace(/\d+/g, "");

    // Hapus huruf yang berulang lebih dari satu kali secara berturut-turut
    return word.replace(/(.)\1+/g, "$1");
}

/**
 * Membuat tabel "bad character" untuk algoritma Boyer-Moore, 
 * yang digunakan untuk mempercepat pencocokan pola dalam teks.
 * 
 * @param {string} pattern - Kata atau pola yang akan dicari dalam teks.
 * @returns {Record<string, number>} - Tabel yang menyimpan jarak dari karakter terakhir dalam pola.
 */
function buildBadCharacterTable(pattern: string): Record<string, number> {
    const table: Record<string, number> = {}; // Inisialisasi tabel karakter buruk
    const patternLength = pattern.length; // Panjang pola

    // Mengisi tabel dengan posisi dari karakter unik dalam pattern
    for (let i = 0; i < patternLength - 1; i++) {
        table[pattern[i]] = patternLength - 1 - i; // Menyimpan jarak dari akhir pola
    }

    return table; // Mengembalikan tabel karakter buruk
}

/**
 * Memfilter teks dari kata kasar menggunakan algoritma Boyer-Moore,
 * hanya mengganti kata kasar yang berdiri sendiri.
 * 
 * @param {string} text - Teks yang akan difilter.
 * @returns {Promise<{ filteredText: string; filteredWords: { original: string; replacement: string; position: number }[] }>}
 *          - Teks hasil filter dan daftar kata yang diganti beserta posisinya.
 */
export async function boyerMooreFilter(text: string): Promise<{ filteredText: string; filteredWords: { original: string; replacement: string; position: number }[] }> {
    // Ambil daftar kata kasar yang telah dinormalisasi dari database
    let badWords = await getBadWordsFromDB();

    // Simpan teks hasil filter (awalnya sama dengan teks asli)
    let filteredText = text;

    // Simpan daftar kata yang telah difilter
    let filteredWords: { original: string; replacement: string; position: number }[] = [];

    // Normalisasi teks sebelum dilakukan pencarian kata kasar
    let normalizedText = normalizeWord(text);

    // Iterasi setiap kata kasar yang ada dalam daftar
    for (const badWord in badWords) {
        const replacement = badWords[badWord]; // Ambil kata pengganti

        // Buat ekspresi reguler untuk mencocokkan kata secara utuh (\b menandai batas kata)
        const regex = new RegExp(`\\b${badWord}\\b`, 'gi');

        let match;
        // Loop untuk mencari semua kecocokan dalam teks
        while ((match = regex.exec(normalizedText)) !== null) {
            // Simpan informasi kata yang diganti
            filteredWords.push({
                original: badWord,
                replacement,
                position: match.index
            });

            // Ambil kata asli dari teks (tanpa normalisasi)
            const originalSubText = text.substring(match.index, match.index + badWord.length);

            // Ganti kata kasar dengan kata pengganti
            filteredText = filteredText.replace(originalSubText, replacement);
        }
    }

    // Mengembalikan hasil filter dan daftar kata yang diganti
    return { filteredText, filteredWords };
}
