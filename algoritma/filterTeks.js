// Daftar kata kasar dan pengganti sopannya
const badWords = {
    "goblok": "bodoh",
    "anjing": "kurang ajar",
    "bangsat": "tidak sopan",
    "tolol": "kurang pintar",
    "asu": "nakal"
};

// Fungsi untuk membuat tabel shift (Bad Character Heuristic)
function buildBadCharacterTable(pattern) {
    const table = {};
    const patternLength = pattern.length;

    for (let i = 0; i < patternLength - 1; i++) {
        table[pattern[i]] = patternLength - 1 - i;
    }

    // Visualisasi tabel
    console.log(`\nBad Character Table for "${pattern}":`);
    console.table(table);

    return table;
}

// Fungsi Boyer-Moore untuk mencari dan mengganti kata kasar
function boyerMooreFilter(text, badWords) {
    let replacedWords = [];

    for (const badWord in badWords) {
        const replacement = badWords[badWord];
        const badCharTable = buildBadCharacterTable(badWord);
        let index = 0;

        while (index <= text.length - badWord.length) {
            let matchIndex = badWord.length - 1;

            while (matchIndex >= 0 && badWord[matchIndex] === text[index + matchIndex]) {
                matchIndex--;
            }

            if (matchIndex < 0) {
                // Ganti kata kasar dengan kata sopan
                text = text.substring(0, index) + replacement + text.substring(index + badWord.length);
                replacedWords.push({ original: badWord, replacement: replacement, position: index });
                index += replacement.length; // Geser index setelah penggantian
            } else {
                const badCharShift = badCharTable[text[index + matchIndex]] || badWord.length;
                index += Math.max(1, badCharShift);
            }
        }
    }

    console.log("Replaced Words:", replacedWords);
    return text;
}

// Contoh penggunaan
const inputText = "Dasar kamu goblok dan asu!";
const filteredText = boyerMooreFilter(inputText, badWords);

console.log(filteredText); // Output: "Dasar kamu bodoh dan nakal!"

/* Cara Kerja Algoritma Boyer-Moore:
1. **Bad Character Heuristic**: Algoritma membuat tabel karakter buruk dari pola (kata kasar) untuk menentukan seberapa jauh pola dapat digeser jika terjadi ketidakcocokan.
2. **Pencocokan dari Kanan ke Kiri**: Algoritma memeriksa karakter dari akhir pola ke awal. Jika ada ketidakcocokan, algoritma menggunakan tabel untuk menentukan langkah geser.
3. **Penggantian Kata**: Jika pola cocok sepenuhnya dengan bagian dari teks, kata tersebut diganti dengan kata yang lebih sopan, dan pencarian dilanjutkan.
*/
