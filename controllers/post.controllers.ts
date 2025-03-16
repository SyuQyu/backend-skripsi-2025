import { postQueries, tagQueries } from "../queries";
import e, { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import { boyerMooreFilter } from "../algoritma/filterTeks";

export async function createPostHandler(req: Request, res: Response): Promise<void> {
    try {
        const { content, ...postData } = req.body;
        const tags = content.match(/#[\w]+/g) || [];
        const cleanTags = tags.map((tag: string) => tag.substring(1)); // Hapus #

        // Cek apakah tag sudah ada di database, jika belum buat baru
        const tagRecords = await Promise.all(
            cleanTags.map(async (tagName: string) => {
                let tag = await tagQueries.getTagByName(tagName);
                if (!tag) {
                    tag = await tagQueries.createTag({ tag: tagName });
                }
                return tag.id;
            })
        );

        // Filterisasi konten dengan Boyer-Moore
        const { filteredText } = await boyerMooreFilter(content);

        // Buat post baru
        const newPost = await postQueries.createPost({
            ...postData,
            content,
            filteredContent: filteredText,
        });

        // Hubungkan post dengan tags
        await Promise.all(tagRecords.map(tagId => tagQueries.createPostTag(newPost.id, tagId)));

        res.status(201).json({
            status: "success",
            message: "Post created successfully",
            post: newPost,
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
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
        const { content, ...updatedPostData } = req.body;

        console.log(req.body);
        const { filteredText } = await boyerMooreFilter(content);

        const updatedPost = await postQueries.updatePost(req.params.postId, {
            ...updatedPostData,
            content,
            filteredContent: filteredText
        });

        if (!updatedPost) {
            throw new CustomError(404, "Post not found");
        }

        res.status(200).json({
            status: "success",
            message: "Post updated successfully",
            post: updatedPost,
            filteredContent: updatedPost.filteredContent
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
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

export async function getPostByContentHandler(req: Request, res: Response): Promise<void> {
    try {
        const posts = await postQueries.getPostByContent(req.params.content);
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

export async function getPostByTagHandler(req: Request, res: Response): Promise<void> {
    try {
        const posts = await postQueries.getPostByTag(req.params.tag);
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

