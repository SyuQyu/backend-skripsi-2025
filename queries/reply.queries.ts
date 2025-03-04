import { prisma } from "./prisma";

async function createReply(data: any) {
    return prisma.reply.create({
        data: {
            ...data,
            parentId: data?.parentId || null,
        }
    });
};

async function getReplyWithNestedRepliesQuery(replyId: string, depth = 1) {
    const includeNestedReplies: any = (depth: number) => {
        if (depth === 0) return false;
        return {
            user: true,
            replies: includeNestedReplies(depth - 1)
        };
    };

    return prisma.reply.findUnique({
        where: { id: replyId },
        include: {
            user: true,
            replies: includeNestedReplies(depth)
        }
    });
};

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