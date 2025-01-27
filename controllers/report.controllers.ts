import { reportQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function createReportHandler(req: Request, res: Response): Promise<void> {
    try {
        const reportData = req.body;
        const newReport = await reportQueries.createReport(reportData);
        res.status(201).json({
            status: "success",
            message: 'Report created successfully',
            report: newReport
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getReportByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const report = await reportQueries.getReportById(req.params.reportId);
        if (!report) {
            throw new CustomError(404, 'Report not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Report found',
            report
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateReportHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedReportData = req.body;
        const updatedReport = await reportQueries.updateReport(req.params.reportId, updatedReportData);
        if (!updatedReport) {
            throw new CustomError(404, 'Report not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Report updated successfully',
            report: updatedReport
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteReportHandler(req: Request, res: Response): Promise<void> {
    try {
        const report = await reportQueries.deleteReport(req.params.reportId);
        if (!report) {
            throw new CustomError(404, 'Report not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Report deleted successfully'
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getReportsHandler(req: Request, res: Response): Promise<void> {
    try {
        const reports = await reportQueries.getReports();
        res.status(200).json({
            status: "success",
            message: 'Reports found',
            reports
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getReportsByPostIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const reports = await reportQueries.getReportsByPostId(req.params.postId);
        res.status(200).json({
            status: "success",
            message: 'Reports found',
            reports
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}