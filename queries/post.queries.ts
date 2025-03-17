import { prisma } from "./prisma";
import { Post } from "@prisma/client";

async function createPost(data: Omit<Post, "id">): Promise<Post> {
    return await prisma.post.create({ data });
}

async function getPostById(id: string): Promise<Post | null> {
    return await prisma.post.findUnique(
        {
            where: { id },
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

        },

    );
}

async function getPostWithRepliesQuery(id: string, skip = 0, take = 10) {
    return prisma.post.findUnique({
        where: { id: id },
        include: {
            user: true,
            tags: true,
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

async function getPostByContent(content: string): Promise<Post[]> {
    return await prisma.post.findMany({
        where: {
            OR: [
                {
                    content: {
                        contains: content,
                        mode: "insensitive"
                    }
                },
                {
                    filteredContent: {
                        contains: content,
                        mode: "insensitive"
                    }
                }
            ]
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

async function getPostByTag(tag: string): Promise<Post[]> {
    return await prisma.post.findMany({
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


async function updatePost(id: string, data: Partial<Omit<Post, "id">>): Promise<Post> {
    return await prisma.post.update({ where: { id }, data });
}

async function deletePost(id: string): Promise<Post> {
    return await prisma.post.delete({ where: { id } });
}

async function getAllPosts(skip = 0, take = 10): Promise<Post[]> {
    return await prisma.post.findMany({
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

export { createPost, getPostById, updatePost, deletePost, getAllPosts, getPostWithRepliesQuery, getPostByTag, getPostByContent };
