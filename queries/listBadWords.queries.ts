import { prisma } from "./prisma";

async function createListBadWord(data: any) {
    return await prisma.listBadWords.create({ data });
}

async function getListBadWordById(id: string) {
    return await prisma.listBadWords.findUnique({ where: { id } });
}

async function updateListBadWord(id: string, data: any) {
    return await prisma.listBadWords.update({ where: { id }, data });
}

async function deleteListBadWord(id: string) {
    return await prisma.listBadWords.delete({ where: { id } });
}

async function getListBadWords(page: number = 1, limit: number = 10) {
    // Pastikan page minimal 1 dan limit minimal 1
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    // Hitung skip dengan benar
    const skip = (safePage - 1) * safeLimit;
    console.log(`Fetching bad words: page=${safePage}, limit=${safeLimit}, skip=${skip}`);
    return await prisma.listBadWords.findMany({
        skip,
        take: limit,
    });
}

async function getListBadWordsWithoutPagination() {
    return await prisma.listBadWords.findMany();
}

async function getListBadWordsCount() {
    return await prisma.listBadWords.count();
}

async function getBadWordByWord(word: string) {
    return await prisma.listBadWords.findFirst({ where: { word } });
}

async function getBadWordByWordNotExact(word: string, page: number = 1, limit: number = 10) {
    // Pastikan page minimal 1 dan limit minimal 1
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    // Hitung skip dengan benar
    const skip = (safePage - 1) * safeLimit;
    console.log(`Searching bad words with term "${word}": page=${safePage}, limit=${safeLimit}, skip=${skip}`);

    return await prisma.listBadWords.findMany({
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
    return await prisma.listBadWords.count({
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
