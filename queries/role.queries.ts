import { prisma } from "./prisma";

async function createRole(data: any) {
    return await prisma.role.create({ data });
}

async function getRoleById(id: string) {
    return await prisma.role.findUnique({ where: { id } });
}

async function getRoleByName(name: string) {
    return await prisma.role.findFirst({ where: { name } });
}

async function updateRole(id: string, data: any) {
    return await prisma.role.update({ where: { id }, data });
}

async function deleteRole(id: string) {
    return await prisma.role.delete({ where: { id } });
}

async function getRoles() {
    return await prisma.role.findMany();
}

export { createRole, getRoleById, updateRole, deleteRole, getRoles, getRoleByName };
