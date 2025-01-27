import { prisma } from "./prisma";

async function createLike(data: any) {
    return await prisma.like.create({ data });
}

async function getLikeById(id: string) {
    return await prisma.like.findUnique({ where: { id } });
}

async function deleteLike(id: string) {
    return await prisma.like.delete({ where: { id } });
}

async function getLikes() {
    return await prisma.like.findMany();
}

export { createLike, getLikeById, deleteLike, getLikes };