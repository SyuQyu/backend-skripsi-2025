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

async function getLikesByParentId(id: string, type: string) {
    if (type === 'post') {
        return await prisma.like.findMany({ where: { postId: id } });
    } else {
        return await prisma.like.findMany({ where: { replyId: id } });
    }
}

async function getLikesByUserId(userId: string) {
    return await prisma.like.findMany({ where: { userId } });
}

async function updateLike(id: string, data: any) {
    return await prisma.like.update({ where: { id }, data });
}

export { createLike, getLikeById, deleteLike, getLikes, updateLike, getLikesByParentId, getLikesByUserId };