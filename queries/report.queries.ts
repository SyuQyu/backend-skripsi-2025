import { prisma } from "./prisma";

async function createReport(data: any) {
    return await prisma.report.create({ data });
}

async function getReportById(id: string) {
    return await prisma.report.findUnique({ where: { id } });
}

async function updateReport(id: string, data: any) {
    return await prisma.report.update({ where: { id }, data });
}

async function deleteReport(id: string) {
    return await prisma.report.delete({ where: { id } });
}

async function getReports() {
    return await prisma.report.findMany();
}

export { createReport, getReportById, updateReport, deleteReport, getReports };