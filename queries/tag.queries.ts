import { prisma } from "./prisma";

async function createTag(data: any) {
    return await prisma.tag.create({ data });
}

async function getTagById(id: string) {
    return await prisma.tag.findUnique({ where: { id } });
}

async function updateTag(id: string, data: any) {
    return await prisma.tag.update({ where: { id }, data });
}

async function deleteTag(id: string) {
    return await prisma.tag.delete({ where: { id } });
}

async function getTags() {
    return await prisma.tag.findMany();
}


export { createTag, getTagById, updateTag, deleteTag, getTags };