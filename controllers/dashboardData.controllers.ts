import { postQueries, roleQueries, userQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function getTotalUsersHandler(req: Request, res: Response): Promise<void> {
    try {
        const totalUsers = await userQueries.getTotalUsers();
        res.status(200).json({
            status: "success",
            message: 'Total users retrieved successfully',
            data: totalUsers
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getTotalPostsHandler(req: Request, res: Response): Promise<void> {
    try {
        const totalPosts = await postQueries.getTotalPosts();
        res.status(200).json({
            status: "success",
            message: 'Total posts retrieved successfully',
            data: totalPosts
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}


export async function growthUserHandler(req: Request, res: Response): Promise<void> {
    const daysParam = parseInt(req.query.days as string, 10);
    const days = Math.min(isNaN(daysParam) ? 30 : daysParam, 365);

    try {
        const growthUsers = await userQueries.growthUsers(days);
        res.status(200).json({
            status: "success",
            message: "User growth data retrieved successfully",
            data: growthUsers,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function growthPostHandler(req: Request, res: Response): Promise<void> {
    const daysParam = parseInt(req.query.days as string, 10);
    const days = Math.min(isNaN(daysParam) ? 30 : daysParam, 365);

    try {
        const growthPosts = await postQueries.growthPosts(days);
        res.status(200).json({
            status: "success",
            message: "Post growth data retrieved successfully",
            data: growthPosts,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}
