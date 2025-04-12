import { likeQuries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function createLikeHandler(req: Request, res: Response): Promise<void> {
    try {
        const likeData = req.body;
        let newLike;
        if (likeData.type === 'post') {
            newLike = await likeQuries.createLike({
                userId: likeData.userId,
                postId: likeData.postId,
            });
        } else {
            newLike = await likeQuries.createLike({
                userId: likeData.userId,
                replyId: likeData.replyId,
            });
        }
        res.status(201).json({
            status: "success",
            message: 'Like created successfully',
            like: newLike
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getLikeByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const like = await likeQuries.getLikeById(req.params.likeId);
        if (!like) {
            throw new CustomError(404, 'Like not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Like found',
            like
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateLikeHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedLikeData = req.body;
        const updatedLike = await likeQuries.updateLike(req.params.likeId, updatedLikeData);
        if (!updatedLike) {
            throw new CustomError(404, 'Like not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Like updated successfully',
            like: updatedLike
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteLikeHandler(req: Request, res: Response): Promise<void> {
    try {
        const deletedLike = await likeQuries.deleteLike(req.params.likeId);
        if (!deletedLike) {
            throw new CustomError(404, 'Like not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Like deleted successfully',
            like: deletedLike
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getAllLikesHandler(req: Request, res: Response): Promise<void> {
    try {
        const likes = await likeQuries.getLikes();
        res.status(200).json({
            status: "success",
            message: 'Likes found',
            likes
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getLikesByParentIdHandler(req: Request, res: Response): Promise<void> {
    console.log("Request URL:", req.originalUrl); // Output: "/post/123" atau "/reply/123"
    console.log("Route Path:", req.path); // Output: "/post/123" atau "/reply/123"

    try {
        const type = req.path.includes('/post/') ? 'post' : 'reply';
        const likes = await likeQuries.getLikesByParentId(req.params.parentId, type);

        res.status(200).json({
            status: "success",
            message: `Likes found for ${type}`,
            likes
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getLikesByUserIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const likes = await likeQuries.getLikesByUserId(req.params.userId);
        res.status(200).json({
            status: "success",
            message: 'Likes found',
            likes
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}