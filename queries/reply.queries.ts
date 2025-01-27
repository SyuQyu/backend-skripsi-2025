import { prisma } from "./prisma";

async function createReply(data: any) {
    return await prisma.reply.create({ data });
}

async function getReplyById(id: string) {
    return await prisma.reply.findUnique({ where: { id } });
}

async function updateReply(id: string, data: any) {
    return await prisma.reply.update({ where: { id }, data });
}

async function deleteReply(id: string) {
    return await prisma.reply.delete({ where: { id } });
}

async function getReplies() {
    return await prisma.reply.findMany();
}

async function getRepliesByPostId(postId: string) {
    return await prisma.reply.findMany({ where: { postId } });
}

export { createReply, getReplyById, updateReply, deleteReply, getReplies, getRepliesByPostId };