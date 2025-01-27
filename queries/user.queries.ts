import { prisma } from "./prisma";

// userCrud.js

async function createUser(userData: any) {
    const user = await prisma.user.create({
        data: userData,
    });
    return user;
}

async function getUserById(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    return user;
}

async function updateUser(userId: string, updatedUserData: any) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: updatedUserData,
    });
    return user;
}

async function deleteUser(userId: string) {
    const user = await prisma.user.delete({
        where: { id: userId },
    });
    return user;
}

async function getUsers() {
    const users = await prisma.user.findMany({
    });
    return users;
}
export { getUsers, createUser, getUserById, updateUser, deleteUser };