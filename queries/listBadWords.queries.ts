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

async function getListBadWords() {
    return await prisma.listBadWords.findMany();
}

export {
    createListBadWord,
    getListBadWordById,
    updateListBadWord,
    deleteListBadWord,
    getListBadWords,
};
