import { prisma } from "./prisma";
import { Post } from "@prisma/client";

async function attachRepliesToPosts(posts: Post[]): Promise<(Post & { replies: any[] })[]> {
    const allReplies = await prisma.reply.findMany({
        where: { postId: { in: posts.map(p => p.id) } },
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, username: true } },
            likes: true,
            reports: true,
            replyView: true,
        }
    });

    function buildReplyTree(postId: string, parentId: string | null): any[] {
        return allReplies
            .filter(reply => reply.postId === postId && reply.parentId === parentId)
            .map(reply => ({
                ...reply,
                replies: buildReplyTree(postId, reply.id)
            }));
    }

    return posts.map(post => ({
        ...post,
        replies: buildReplyTree(post.id, null)
    }));
}

async function getTotalPosts(): Promise<number> {
    return await prisma.post.count();
}

async function growthPosts(days: number = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const posts = await prisma.post.findMany({
        where: {
            createdAt: {
                gte: fromDate,
            },
        },
        select: {
            createdAt: true,
        },
    });

    const dailyGrowth: Record<string, number> = {};

    posts.forEach(post => {
        const date = post.createdAt.toISOString().split('T')[0];
        dailyGrowth[date] = (dailyGrowth[date] || 0) + 1;
    });

    const result: { date: string; count: number }[] = [];
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const formattedDate = date.toISOString().split('T')[0];

        result.push({
            date: formattedDate,
            count: dailyGrowth[formattedDate] || 0,
        });
    }

    return result;
}


async function createPost(data: Omit<Post, "id">): Promise<Post> {
    return await prisma.post.create({ data });
}

async function getPostById(id: string): Promise<(Post & { replies: any[] }) | null> {
    const post = await prisma.post.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, username: true } },
            likes: true,
            tags: { select: { tag: true } },
            reports: true,
            postView: true,
        }
    });

    if (!post) return null;

    const allReplies = await prisma.reply.findMany({
        where: { postId: id },
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, username: true } },
            likes: true,
            reports: true,
            replyView: true,
        }
    });

    function buildReplyTree(parentId: string | null): any[] {
        return allReplies
            .filter(reply => reply.parentId === parentId)
            .map(reply => ({
                ...reply,
                replies: buildReplyTree(reply.id)
            }));
    }

    return { ...post, replies: buildReplyTree(null) };
}


async function getPostWithRepliesQuery(id: string, skip = 0, take = 10) {
    return prisma.post.findUnique({
        where: { id: id },
        include: {
            user: true,
            tags: true,
            likes: true,
            reports: true,
            postView: true,
            replies: {
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: true,
                    likes: true,
                    reports: true,
                    replies: {
                        include: {
                            user: true,
                            replies: true
                        }
                    }
                }
            }
        }
    });
};

async function getPostByUser(userId: string): Promise<(Post & { replies: any[] })[]> {
    const posts = await prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, username: true } },
            likes: true,
            tags: { select: { tag: true } },
            reports: true,
            postView: true,
        }
    });

    return await attachRepliesToPosts(posts);
}


async function getPostByContent(content: string): Promise<(Post & { replies: any[] })[]> {
    const posts = await prisma.post.findMany({
        where: {
            OR: [
                { content: { contains: content, mode: "insensitive" } },
                { filteredContent: { contains: content, mode: "insensitive" } },
                { user: { username: { contains: content, mode: "insensitive" } } },
            ]
        },
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, username: true } },
            likes: true,
            tags: { select: { tag: true } },
            reports: true,
            postView: true,
        }
    });

    return await attachRepliesToPosts(posts);
}


async function getPostByTag(tag: string): Promise<(Post & { replies: any[] })[]> {
    const posts = await prisma.post.findMany({
        where: { tags: { some: { tag: { tag } } } },
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, username: true } },
            likes: true,
            tags: { select: { tag: true } },
            reports: true,
            postView: true,
        }
    });

    return await attachRepliesToPosts(posts);
}


async function updatePost(id: string, data: Partial<Omit<Post, "id">>): Promise<Post> {
    return await prisma.post.update({ where: { id }, data });
}

async function deletePost(id: string): Promise<Post> {
    return await prisma.post.delete({ where: { id } });
}

async function getAllPosts(skip = 0, take = 10): Promise<(Post & { replies: any[] })[]> {
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
            user: { select: { id: true, username: true } },
            likes: true,
            tags: { select: { tag: true } },
            reports: true,
            postView: true,
        }
    });

    return await attachRepliesToPosts(posts);
}

async function incrementPostViewOnce(postId: string, userId: string): Promise<void> {
    const existingView = await prisma.postView.findUnique({
        where: {
            postId_userId: {
                postId,
                userId
            }
        }
    });

    if (!existingView) {
        await prisma.postView.create({
            data: { postId, userId }
        });
    }
}

export { getTotalPosts, growthPosts, incrementPostViewOnce, createPost, getPostById, updatePost, deletePost, getAllPosts, getPostByUser, getPostWithRepliesQuery, getPostByTag, getPostByContent };
