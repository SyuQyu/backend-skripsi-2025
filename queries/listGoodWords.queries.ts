import { prisma } from "./prisma";
import { ListGoodWords } from "@prisma/client";

async function createListGoodWord(data: Omit<ListGoodWords, "id">) {
    return await prisma.listGoodWords.create({ data });
}

async function getListGoodWordById(id: string) {
    return await prisma.listGoodWords.findUnique({ where: { id } });
}

async function updateListGoodWord(id: string, data: any) {
    return await prisma.listGoodWords.update({ where: { id }, data });
}

async function deleteListGoodWord(id: string) {
    return await prisma.listGoodWords.delete({ where: { id } });
}

async function getListGoodWords() {
    return await prisma.listGoodWords.findMany();
}

export { createListGoodWord, getListGoodWordById, updateListGoodWord, deleteListGoodWord, getListGoodWords };
