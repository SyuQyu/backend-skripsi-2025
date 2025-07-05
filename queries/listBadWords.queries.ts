import { prisma } from "./prisma";

async function createListBadWord(data: any) {
    return await prisma.badWord.create({ data });
}

async function getListBadWordById(id: string) {
    return await prisma.badWord.findUnique({ where: { id } });
}

async function updateListBadWord(id: string, data: any) {
    return await prisma.badWord.update({ where: { id }, data });
}

async function deleteListBadWord(id: string) {
    return await prisma.badWord.delete({ where: { id } });
}

async function getListBadWords(page: number = 1, limit: number = 10) {
    // Pastikan page minimal 1 dan limit minimal 1
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    // Hitung skip dengan benar
    const skip = (safePage - 1) * safeLimit;
    console.log(`Fetching bad words: page=${safePage}, limit=${safeLimit}, skip=${skip}`);
    return await prisma.badWord.findMany({
        skip,
        take: limit,
    });
}

async function getListBadWordsWithoutPagination() {
    return await prisma.badWord.findMany();
}

async function getListBadWordsCount() {
    return await prisma.badWord.count();
}

async function getBadWordByWord(word: string) {
    return await prisma.badWord.findFirst({ where: { word } });
}

async function getBadWordByWordNotExact(word: string, page: number = 1, limit: number = 10) {
    // Pastikan page minimal 1 dan limit minimal 1
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    // Hitung skip dengan benar
    const skip = (safePage - 1) * safeLimit;
    console.log(`Searching bad words with term "${word}": page=${safePage}, limit=${safeLimit}, skip=${skip}`);

    return await prisma.badWord.findMany({
        where: {
            word: {
                contains: word,
                mode: 'insensitive',
            },
        },
        skip,
        take: safeLimit,
        orderBy: {
            id: 'asc', // Consistent ordering
        },
    });
}

async function getBadWordByWordNotExactCount(word: string) {
    return await prisma.badWord.count({
        where: {
            word: {
                contains: word,
                mode: 'insensitive',
            },
        },
    });
}


export {
    createListBadWord,
    getListBadWordById,
    updateListBadWord,
    deleteListBadWord,
    getListBadWords,
    getBadWordByWord,
    getListBadWordsCount,
    getListBadWordsWithoutPagination,
    getBadWordByWordNotExact,
    getBadWordByWordNotExactCount
};
