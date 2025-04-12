import { prisma } from "./prisma";

async function createReport(data: any) {
    return await prisma.report.create({ data });
}

async function getReportById(id: string) {
    return await prisma.report.findUnique({
        where: { id },
        include: {
            post: true,
            reply: true,
            user: true
        }
    });
}

async function updateReport(id: string, data: any) {
    return await prisma.report.update({ where: { id }, data });
}

async function deleteReport(id: string) {
    return await prisma.report.delete({ where: { id } });
}

async function getReports() {
    return await prisma.report.findMany({
        include: {
            post: true,
            reply: true,
            user: true
        }
    });
}

async function getReportsByPostId(postId: string) {
    return await prisma.report.findMany({ where: { postId } });
}

async function getReportsByReplyId(replyId: string) {
    return await prisma.report.findMany({ where: { replyId } });
}

export {
    createReport,
    getReportById,
    updateReport,
    deleteReport,
    getReports,
    getReportsByPostId,
    getReportsByReplyId
};
