import { prisma } from "./prisma";
import { GoodWord } from "@prisma/client";
/**
 * Membuat good word baru dan langsung menghubungkannya ke bad word tertentu.
 * Jika good word sudah ada, hanya buat relasi jika belum ada.
 */
async function createGoodWord({ word, badWordId }: { word: string; badWordId: string }) {
    // Cari atau buat good word
    let goodWord = await prisma.goodWord.findFirst({ where: { word: word.trim() } });
    if (!goodWord) {
        goodWord = await prisma.goodWord.create({ data: { word: word.trim() } });
    }

    // Cek apakah relasi sudah ada
    const existingMapping = await prisma.badWordGoodWord.findFirst({
        where: {
            badWordId,
            goodWordId: goodWord.id
        }
    });

    // Jika belum ada relasi, buat relasi
    if (!existingMapping) {
        await prisma.badWordGoodWord.create({
            data: {
                badWordId,
                goodWordId: goodWord.id
            }
        });
    }

    return goodWord;
}

async function getGoodWordById(id: string) {
    return await prisma.goodWord.findUnique({ where: { id } });
}

/**
 * Update good word dan jika ada badWordId, update juga relasi many-to-many-nya.
 * Jika relasi belum ada, akan dibuat.
 */
async function updateGoodWord(id: string, data: { word?: string; badWordId?: string }) {
    // Update kata baik (jika ada perubahan word)
    let updatedGoodWord = await prisma.goodWord.update({
        where: { id },
        data: data.word ? { word: data.word } : {}
    });

    // Jika ada badWordId, pastikan relasi many-to-many sudah ada
    if (data.badWordId) {
        const existingMapping = await prisma.badWordGoodWord.findFirst({
            where: {
                badWordId: data.badWordId,
                goodWordId: id
            }
        });
        if (!existingMapping) {
            await prisma.badWordGoodWord.create({
                data: {
                    badWordId: data.badWordId,
                    goodWordId: id
                }
            });
        }
    }

    return updatedGoodWord;
}

async function deleteGoodWord(id: string) {
    return await prisma.goodWord.delete({ where: { id } });
}

async function getGoodWords() {
    const goodWords = await prisma.goodWord.findMany({
        include: {
            mappings: {
                include: {
                    badWord: true
                }
            }
        }
    });

    // Setiap kombinasi goodWord dan badWord jadi satu objek terpisah
    return goodWords.flatMap(gw =>
        gw.mappings.map(m => ({
            id: gw.id,
            goodWord: gw.word,
            badWordId: m.badWord.id,
            badWord: m.badWord.word,
            createdAt: gw.createdAt,
            updatedAt: gw.updatedAt
        }))
    );
}

/**
 * Bulk insert kata baik (GoodWord) tanpa duplikat
 */
async function bulkCreateGoodWords(words: string[]) {
    const insertedWords: any[] = [];
    // Ambil semua kata baik yang sudah ada
    const allGoodWords = await prisma.goodWord.findMany({ select: { id: true, word: true } });
    const goodWordSet = new Set(allGoodWords.map(item => item.word.trim().toLowerCase()));

    for (const word of words) {
        const key = word.trim().toLowerCase();
        if (!goodWordSet.has(key)) {
            const goodWord = await prisma.goodWord.create({ data: { word } });
            goodWordSet.add(key);
            insertedWords.push(goodWord);
        }
    }

    return {
        count: insertedWords.length,
        insertedWords
    };
}

async function getGoodWordByWord(word: string) {
    return await prisma.goodWord.findFirst({ where: { word } });
}

/**
 * Bulk insert kata kasar dan kata baik sesuai skema many-to-many:
 * - Tidak duplikat kata kasar (ListBadWords)
 * - Tidak duplikat kata baik (GoodWord)
 * - Tidak duplikat relasi (BadWordGoodWord)
 */
async function blukCreateGoodBadWords(wordPairs: { word: string; substitute: string }[]) {
    const insertedMappings: any[] = [];

    // Ambil semua kata kasar & kata baik yang sudah ada
    const allBadWords = await prisma.badWord.findMany({ select: { id: true, word: true } });
    const allGoodWords = await prisma.goodWord.findMany({ select: { id: true, word: true } });
    const allMappings = await prisma.badWordGoodWord.findMany({ select: { badWordId: true, goodWordId: true } });

    const badWordMap = new Map(allBadWords.map(item => [item.word.trim().toLowerCase(), item.id]));
    const goodWordMap = new Map(allGoodWords.map(item => [item.word.trim().toLowerCase(), item.id]));
    const mappingSet = new Set(allMappings.map(m => `${m.badWordId}|${m.goodWordId}`));

    for (const { word, substitute } of wordPairs) {
        const badWordKey = word.trim().toLowerCase();
        let badWordId = badWordMap.get(badWordKey);

        // Jika kata kasar belum ada, insert dan update map
        if (!badWordId) {
            const badWord = await prisma.badWord.create({
                data: { word }
            });
            badWordId = badWord.id;
            badWordMap.set(badWordKey, badWordId);
        }

        // Cek kata baik global, jika belum ada insert ke DB (tabel GoodWord)
        const goodWordKey = substitute.trim().toLowerCase();
        let goodWordId: string | undefined = goodWordMap.get(goodWordKey);
        if (!goodWordId) {
            const goodWord = await prisma.goodWord.create({
                data: { word: substitute }
            });
            goodWordId = goodWord.id;
            goodWordMap.set(goodWordKey, goodWordId);
        }

        // Cek relasi many-to-many (BadWordGoodWord)
        const mappingKey = `${badWordId}|${goodWordId}`;
        if (mappingSet.has(mappingKey)) {
            // Sudah ada, skip insert relasi
            continue;
        }

        // Insert relasi many-to-many
        const mapping = await prisma.badWordGoodWord.create({
            data: {
                badWordId: badWordId,
                goodWordId: goodWordId
            }
        });
        mappingSet.add(mappingKey);
        insertedMappings.push(mapping);
    }

    return {
        count: insertedMappings.length,
        insertedWords: insertedMappings
    };
}

export {
    createGoodWord,
    bulkCreateGoodWords,
    getGoodWordById,
    updateGoodWord,
    deleteGoodWord,
    getGoodWords,
    blukCreateGoodBadWords,
    getGoodWordByWord
};