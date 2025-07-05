// Import Prisma Client untuk berinteraksi dengan database
import { PrismaClient } from '@prisma/client';

// Membuat instance PrismaClient
const prisma = new PrismaClient();

/**
 * Mengambil daftar kata kasar dari database dan menormalisasi sebelum digunakan.
 * 
 * @returns {Promise<Record<string, string>>} - Objek yang berisi pasangan kata kasar dan penggantinya.
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
/**
 * Memfilter teks dari kata kasar dengan memperhatikan kata yang telah dinormalisasi
 * dan mengganti hanya kata yang sesuai, serta melacak kata asli yang dimasukkan pengguna.
 * 
 * @param {string} text - Teks yang akan difilter dari kata kasar.
 * @returns {Promise<{ filteredText: string; filteredWords: { original: string; replacement: string; position: number, rawWord: string }[] }>}
 */
export async function boyerMooreFilter(text: string): Promise<{
    filteredText: string;
    filteredWords: {
        original: string;
        replacement: string;
        position: number;
        rawWord: string; // Kata asli dari teks user (seperti "4njing")
    }[];
}> {
    // Ambil daftar kata kasar dan penggantinya dari database (sudah dinormalisasi)
    const badWords = await getBadWordsFromDB();

    // Pisahkan teks berdasarkan batas kata (spasi, tanda baca tetap dipertahankan)
    const words = text.split(/\b/);

    // Untuk menyimpan teks setelah kata kasar diganti
    let filteredText = "";

    // Untuk menyimpan kata-kata kasar yang terdeteksi beserta info lengkapnya
    let filteredWords: {
        original: string;
        replacement: string;
        position: number;
        rawWord: string;
    }[] = [];

    // Hitung posisi karakter berjalan agar bisa melacak posisi kata kasar dalam teks
    let currentIndex = 0;

    // Proses tiap potongan kata
    for (const word of words) {
        const normalized = normalizeWord(word); // Normalisasi potongan kata

        // Jika hasil normalisasi cocok dengan kata kasar
        if (badWords[normalized]) {
            const replacement = badWords[normalized]; // Ambil kata pengganti dari DB

            // Tambahkan data ke filteredWords (dengan kata asli sebelum normalisasi)
            filteredWords.push({
                original: normalized,      // Kata kasar hasil normalisasi, misal: "anjing"
                replacement: replacement.primary,  // Kata pengganti, misal: "kurang ajar"
                position: currentIndex,    // Posisi kata dalam teks asli
                rawWord: word              // Kata asli dalam teks pengguna, misal: "4njing"
            });

            // Tambahkan kata pengganti ke teks hasil filter
            filteredText += replacement.primary;
        } else {
            // Jika bukan kata kasar, tambahkan apa adanya
            filteredText += word;
        }

        // Update posisi berjalan berdasarkan panjang kata
        currentIndex += word.length;
    }

    // Kembalikan teks hasil filter dan daftar kata-kata yang diganti
    return {
        filteredText,
        filteredWords
    };
}

