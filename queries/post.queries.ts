import { prisma } from "./prisma";
import { Post } from "@prisma/client";

async function createPost(data: Omit<Post, "id">): Promise<Post> {
    return await prisma.post.create({ data });
}

async function getPostById(id: string): Promise<Post | null> {
    return await prisma.post.findUnique({ where: { id } });
}

async function updatePost(id: string, data: Partial<Omit<Post, "id">>): Promise<Post> {
    return await prisma.post.update({ where: { id }, data });
}

async function deletePost(id: string): Promise<Post> {
    return await prisma.post.delete({ where: { id } });
}

async function getAllPosts(): Promise<Post[]> {
    return await prisma.post.findMany();
}

export { createPost, getPostById, updatePost, deletePost, getAllPosts };
