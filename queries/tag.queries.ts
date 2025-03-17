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

async function getPopularTags() {
    return await prisma.tag.findMany({
        orderBy: {
            posts: {
                _count: 'desc',
            },
        },
        take: 5,
    });
}

async function getTagByName(name: string) {
    return await prisma.tag.findFirst({ where: { tag: name } });
}

/**
 * ✅ Fungsi untuk menghubungkan Post dan Tag di tabel PostTag
 */
async function createPostTag(postId: string, tagId: string) {
    return await prisma.postTag.create({
        data: {
            postId,
            tagId,
        },
    });
}


export { createTag, getTagById, updateTag, deleteTag, getTags, getTagByName, createPostTag, getPopularTags };