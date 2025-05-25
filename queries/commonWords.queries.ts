import { prisma } from './prisma'

async function createCommonWord(word: string) {
    return await prisma.commonWord.create({ data: { word } });
}

async function getCommonWordById(id: number) {
    return await prisma.commonWord.findUnique({ where: { id } });
}

async function updateCommonWord(id: number, word: string) {
    return await prisma.commonWord.update({
        where: { id },
        data: { word }
    });
}

async function deleteCommonWord(id: number) {
    return await prisma.commonWord.delete({ where: { id } });
}

async function getCommonWords() {
    return await prisma.commonWord.findMany();
}

async function getCommonWordByWord(word: string) {
    return await prisma.commonWord.findUnique({ where: { word } });
}

export {
    createCommonWord,
    getCommonWordById,
    updateCommonWord,
    deleteCommonWord,
    getCommonWords,
    getCommonWordByWord
}
