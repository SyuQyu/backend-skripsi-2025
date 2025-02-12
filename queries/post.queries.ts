import { prisma } from "./prisma";
import { Post } from "@prisma/client";

async function createPost(data: Omit<Post, "id">): Promise<Post> {
    return await prisma.post.create({ data });
}

async function getPostById(id: string): Promise<Post | null> {
    return await prisma.post.findUnique({ where: { id } });
}

async function getPostWithRepliesQuery(id: string, skip = 0, take = 10) {
    return prisma.post.findUnique({
        where: { id: id },
        include: {
            user: true,
            tag: true,
            likes: true,
            reports: true,
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


async function updatePost(id: string, data: Partial<Omit<Post, "id">>): Promise<Post> {
    return await prisma.post.update({ where: { id }, data });
}

async function deletePost(id: string): Promise<Post> {
    return await prisma.post.delete({ where: { id } });
}

async function getAllPosts(skip = 0, take = 10): Promise<Post[]> {
    return await prisma.post.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                }
            },
            likes: true,
            tag: true,
            reports: true,
            replies: {
                skip,
                take,
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

export { createPost, getPostById, updatePost, deletePost, getAllPosts, getPostWithRepliesQuery };
