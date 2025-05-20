import { postQueries, tagQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import { boyerMooreFilter } from "../algoritma/filterTeks-new";

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
        const { filteredText, durationMs } = await boyerMooreFilter(content);
        // Buat post baru
        const newPost = await postQueries.createPost({
            ...postData,
            content,
            filteredContent: filteredText,
            durationFilteredContent: durationMs
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

export async function checkWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const { text } = req.body;
        console.log(req.body);
        if (!text) {
            res.status(400).json({
                status: "error",
                message: "Text is required"
            });
            return;
        }

        // Gunakan fungsi Boyer-Moore untuk memfilter kata
        const { filteredText, filteredWords, durationMs } = await boyerMooreFilter(text);
        const bannedWords = filteredWords.map(word => word.original);
        const replacementWords = filteredWords.map(word => word.replacement);

        res.status(200).json({
            status: "success",
            original: text,
            filteredWords: filteredWords,
            filtered: filteredText,
            bannedWords: bannedWords,
            replacementWords: replacementWords,
            durationMs: `${durationMs}ms`
        });
    } catch (error: any) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}

// export async function checkWordHandler(req: Request, res: Response): Promise<void> {
//     try {
//         const { text } = req.body;
//         if (!text) {
//             res.status(400).json({
//                 status: "error",
//                 message: "Text is required"
//             });
//             return;
//         }

//         // Data dummy ground-truth boleh diubah/diparameterkan sesuai kebutuhan kasus
//         const groundTruth = ["bangsat", "babi", "anjing"];

//         // Run deteksi dari berbagai mode
//         const bm = await boyerMooreFilter(text, groundTruth);
//         const fuzzy = await boyerMooreWithFuzzy(text, groundTruth);
//         const normal = await boyerMooreWithNormalization(text, groundTruth);
//         const only = await boyerMooreOnly(text, groundTruth);

//         // Kumpulan banned/replacement untuk comparasi mudah (pakai dari bm)
//         const bannedWords = bm.filteredWords.map(word => word.original);
//         const replacementWords = bm.filteredWords.map(word => word.replacement);

//         res.status(200).json({
//             status: "success",
//             message: "Filtered text with various strategies",
//             summary: {
//                 input: text,
//                 bannedWords,
//                 replacementWords
//             },
//             results: {
//                 boyerMooreFull: {
//                     filteredText: bm.filteredText,
//                     countFilteredWords: bm.filteredWords.length,
//                     filteredWords: bm.filteredWords,
//                     detectedTrueArr: bm.detectedTrueArr,
//                     detectedTrueCount: bm.detectedTrueCount,
//                     detectionAccuracy: bm.detectionAccuracy,
//                     durationMs: bm.durationMs
//                 },
//                 fuzzyOnly: {
//                     filteredText: fuzzy.filteredText,
//                     countFilteredWords: fuzzy.filteredWords.length,
//                     filteredWords: fuzzy.filteredWords,
//                     detectedTrueArr: fuzzy.detectedTrueArr,
//                     detectedTrueCount: fuzzy.detectedTrueCount,
//                     detectionAccuracy: fuzzy.detectionAccuracy,
//                     durationMs: fuzzy.durationMs
//                 },
//                 normalizationOnly: {
//                     filteredText: normal.filteredText,
//                     countFilteredWords: normal.filteredWords.length,
//                     filteredWords: normal.filteredWords,
//                     detectedTrueArr: normal.detectedTrueArr,
//                     detectedTrueCount: normal.detectedTrueCount,
//                     detectionAccuracy: normal.detectionAccuracy,
//                     durationMs: normal.durationMs
//                 },
//                 boyerMooreDirectOnly: {
//                     filteredText: only.filteredText,
//                     countFilteredWords: only.filteredWords.length,
//                     filteredWords: only.filteredWords,
//                     detectedTrueArr: only.detectedTrueArr,
//                     detectedTrueCount: only.detectedTrueCount,
//                     detectionAccuracy: only.detectionAccuracy,
//                     durationMs: only.durationMs
//                 }
//             }
//         });
//     } catch (error: any) {
//         res.status(500).json({
//             status: "error",
//             message: error.message
//         });
//     }
// }

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

export async function getPostByUserHandler(req: Request, res: Response): Promise<void> {
    try {
        const posts = await postQueries.getPostByUser(req.params.userId);
        res.status(200).json({
            status: "success",
            message: "Posts found for user",
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

export async function incrementPostViewHandler(req: Request, res: Response): Promise<void> {
    try {
        const { postId, userId } = req.body;

        if (!postId || !userId) {
            throw new CustomError(400, 'postId and userId are required');
        }

        await postQueries.incrementPostViewOnce(postId, userId);

        res.status(200).json({
            status: "success",
            message: "View count incremented (if not already viewed by this user)"
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}
