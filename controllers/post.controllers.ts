import { postQueries } from "../queries";
import e, { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import { boyerMooreFilter } from "../algoritma/filterTeks";
export async function createPostHandler(req: Request, res: Response): Promise<void> {
    try {
        const postData = req.body;
        postData.content = (await boyerMooreFilter(postData.content)).filteredText;
        const newPost = await postQueries.createPost(postData);
        res.status(201).json({
            status: "success",
            message: 'Post created successfully',
            post: newPost
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getPostByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const post = await postQueries.getPostById(req.params.postId);
        if (!post) {
            throw new CustomError(404, 'Post not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Post found',
            post
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updatePostHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedPostData = req.body;
        const updatedPost = await postQueries.updatePost(req.params.postId, updatedPostData);
        if (!updatedPost) {
            throw new CustomError(404, 'Post not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Post updated successfully',
            post: updatedPost
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deletePostHandler(req: Request, res: Response): Promise<void> {
    try {
        const post = await postQueries.deletePost(req.params.postId);
        if (!post) {
            throw new CustomError(404, 'Post not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Post deleted successfully',
            post
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getAllPostsHandler(req: Request, res: Response): Promise<void> {
    try {
        const posts = await postQueries.getAllPosts();
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

