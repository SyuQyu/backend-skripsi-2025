import { prisma } from "./prisma";

async function createImage(data: any) {
    return await prisma.image.create({ data });
}

async function getImageById(id: string) {
    return await prisma.image.findUnique({ where: { id } });
}

async function updateImage(id: string, data: any) {
    return await prisma.image.update({ where: { id }, data });
}

async function deleteImage(id: string) {
    return await prisma.image.delete({ where: { id } });
}

async function getImages() {
    return await prisma.image.findMany();
}

export { createImage, getImageById, updateImage, deleteImage, getImages };