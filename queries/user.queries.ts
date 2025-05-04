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

async function growthUsers(days: number = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const users = await prisma.user.findMany({
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

    users.forEach(user => {
        const date = user.createdAt.toISOString().split('T')[0];
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

async function getTotalUsers() {
    const totalUsers = await prisma.user.count();
    return totalUsers;
}

async function resetPassword(userId: string, password: string) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { password },
    });
    return user;
}

async function getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
        where: { username },
        include: {
            role: {
                select: {
                    name: true
                }
            }
        },
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

async function updateFirstLogin(userId: string) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { firstLogin: false },
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

async function updateRefreshToken(userId: string, refreshToken: string) {
    return await prisma.user.update({ where: { id: userId }, data: { refreshToken } });
}

async function getUserByRefreshToken(refreshToken: string) {
    return await prisma.user.findFirst({
        where: {
            refreshToken: refreshToken
        }
    });
}

// Cek username atau email sudah ada
async function isUsernameExists(username: string) {
    const user = await prisma.user.findUnique({ where: { username } });
    return !!user;
}
async function isEmailExists(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return !!user;
}



export { isEmailExists, isUsernameExists, growthUsers, getTotalUsers, getUsers, resetPassword, createUser, getUserById, updateUser, deleteUser, getUserByUsername, updateRefreshToken, getUserByRefreshToken, updateFirstLogin };