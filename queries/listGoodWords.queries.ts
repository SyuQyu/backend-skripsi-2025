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
    return await prisma.listGoodWords.findMany({
        include: {
            badWord: {
                select: {
                    id: true,
                    word: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }
        }
    });
}

async function blukCreateGoodBadWords(wordPairs: { word: string; substitute: string }[]) {
    const insertedWords: any[] = [];

    for (const { word, substitute } of wordPairs) {
        // Check if bad word exists
        let badWord = await prisma.listBadWords.findFirst({
            where: { word }
        });

        // If not, create it
        if (!badWord) {
            badWord = await prisma.listBadWords.create({
                data: { word }
            });
        }

        // Check if the good word for this bad word already exists
        const existing = await prisma.listGoodWords.findFirst({
            where: {
                word: substitute,
                badWordId: badWord.id
            }
        });

        // If not exists, insert
        if (!existing) {
            const newGoodWord = await prisma.listGoodWords.create({
                data: {
                    word: substitute,
                    badWordId: badWord.id
                }
            });
            insertedWords.push(newGoodWord);
        }
    }

    return {
        count: insertedWords.length,
        insertedWords
    };
}

async function getGoodWordbyWord(word: string) {
    return await prisma.listGoodWords.findFirst({ where: { word } });
}

export { createListGoodWord, blukCreateGoodBadWords, getListGoodWordById, updateListGoodWord, deleteListGoodWord, getListGoodWords, getGoodWordbyWord };
