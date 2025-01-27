import { tagQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function createTagHandler(req: Request, res: Response): Promise<void> {
    try {
        const tagData = req.body;
        const newTag = await tagQueries.createTag(tagData);
        res.status(201).json({
            status: "success",
            message: 'Tag created successfully',
            tag: newTag
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getTagByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const tag = await tagQueries.getTagById(req.params.tagId);
        if (!tag) {
            throw new CustomError(404, 'Tag not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Tag found',
            tag
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateTagHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedTagData = req.body;
        const updatedTag = await tagQueries.updateTag(req.params.tagId, updatedTagData);
        if (!updatedTag) {
            throw new CustomError(404, 'Tag not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Tag updated successfully',
            tag: updatedTag
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteTagHandler(req: Request, res: Response): Promise<void> {
    try {
        const tag = await tagQueries.deleteTag(req.params.tagId);
        if (!tag) {
            throw new CustomError(404, 'Tag not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Tag deleted successfully',
            tag
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getAllTagsHandler(req: Request, res: Response): Promise<void> {
    try {
        const tags = await tagQueries.getTags();
        res.status(200).json({
            status: "success",
            message: 'Tags found',
            tags
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

