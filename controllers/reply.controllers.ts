import { replyQueries, tagQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import { boyerMooreFilter } from "../algoritma/filterTeks";

export async function createReplyHandler(req: Request, res: Response): Promise<void> {
    try {
        const { content, ...replyData } = req.body;
        const tags = content.match(/#[\w]+/g) || [];
        const cleanTags = tags.map((tag: string) => tag.substring(1)); // Remove #

        // Check if the tag exists in the database, if not create a new one
        const tagRecords = await Promise.all(
            cleanTags.map(async (tagName: string) => {
                let tag = await tagQueries.getTagByName(tagName);
                if (!tag) {
                    tag = await tagQueries.createTag({ tag: tagName });
                }
                return tag.id;
            })
        );

        // Filter content using Boyer-Moore algorithm
        const { filteredText } = await boyerMooreFilter(content);

        // Create new reply
        const newReply = await replyQueries.createReply({
            ...replyData,
            content,
            filteredContent: filteredText,
        });

        // Associate reply with tags
        await Promise.all(tagRecords.map(tagId => tagQueries.createReplyTag(newReply.id, tagId)));

        res.status(201).json({
            status: "success",
            message: "Reply created successfully",
            reply: newReply,
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
            status: "error",
            message: error.message
        });
    }
}


export async function getReplyByTagHandler(req: Request, res: Response): Promise<void> {
    try {
        const posts = await replyQueries.getRepliesByTag(req.params.tag);
        res.status(200).json({
            status: "success",
            message: 'Posts found',
            posts
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}


export async function getReplyByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const reply = await replyQueries.getReplyById(req.params.replyId);
        if (!reply) {
            throw new CustomError(404, 'Reply not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Reply found',
            reply
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateReplyHandler(req: Request, res: Response): Promise<void> {
    try {
        const { content, ...updatedReplyData } = req.body;

        console.log(req.body);
        const { filteredText } = await boyerMooreFilter(content);

        const updatedReply = await replyQueries.updateReply(req.params.replyId, {
            ...updatedReplyData,
            content,
            filteredContent: filteredText
        });

        if (!updatedReply) {
            throw new CustomError(404, "Reply not found");
        }

        res.status(200).json({
            status: "success",
            message: "Reply updated successfully",
            reply: updatedReply
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
            status: "error",
            message: error.message
        });
    }
}


export async function deleteReplyHandler(req: Request, res: Response): Promise<void> {
    try {
        const reply = await replyQueries.deleteReply(req.params.replyId);
        if (!reply) {
            throw new CustomError(404, 'Reply not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Reply deleted successfully',
            reply
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getRepliesByPostIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const replies = await replyQueries.getRepliesByPostId(req.params.postId);
        if (!replies) {
            throw new CustomError(404, 'Replies not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Replies found',
            replies
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function incrementReplyViewHandler(req: Request, res: Response): Promise<void> {
    try {
        const { replyId, userId } = req.body;

        if (!replyId || !userId) {
            throw new CustomError(400, 'replyId and userId are required');
        }

        await replyQueries.incrementReplyViewOnce(replyId, userId);

        res.status(200).json({
            status: "success",
            message: "Reply view count incremented (if not already viewed by this user)"
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}