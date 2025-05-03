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


async function getRepliesByTag(tag: string): Promise<any[]> {
    return await prisma.reply.findMany({
        where: {
            tags: {
                some: {
                    tag: {
                        tag: tag
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                }
            },
            likes: true,
            tags: {
                select: {
                    tag: true
                }
            },
            reports: true,
            replyView: true,
            replies: {
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                        }
                    },
                    likes: true,
                    reports: true,
                    replies: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                }
                            },
                            replies: true,
                            likes: true,
                            reports: true,
                        }
                    }
                }
            }
        }
    });
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

async function getReplies(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return await prisma.reply.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                }
            },
            likes: true,
            tags: {
                select: {
                    tag: true
                }
            },
            reports: true,
            replyView: true,
            replies: {
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                        }
                    },
                    likes: true,
                    reports: true,
                    replies: true
                }
            }
        }
    });
}
async function getRepliesByPostId(postId: string) {
    return await prisma.reply.findMany({ where: { postId } });
}

async function incrementReplyViewOnce(replyId: string, userId: string): Promise<void> {
    const existing = await prisma.replyView.findFirst({
        where: { replyId, userId }
    });

    if (!existing) {
        await prisma.replyView.create({
            data: { replyId, userId }
        });
    }
}


export { createReply, incrementReplyViewOnce, getReplyById, updateReply, deleteReply, getReplies, getRepliesByPostId, getRepliesByTag };