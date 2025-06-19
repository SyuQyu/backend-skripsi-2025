import { listBadWordsQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function createBadWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const badWordData = req.body;
        const newBadWord = await listBadWordsQueries.createListBadWord(badWordData);
        res.status(201).json({
            status: "success",
            message: 'Bad word created successfully',
            badWord: newBadWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getBadWordByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const badWord = await listBadWordsQueries.getListBadWordById(req.params.badWordId);
        if (!badWord) {
            throw new CustomError(404, 'Bad word not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Bad word found',
            badWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateBadWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedBadWordData = req.body;
        const updatedBadWord = await listBadWordsQueries.updateListBadWord(req.params.badWordId, updatedBadWordData);
        if (!updatedBadWord) {
            throw new CustomError(404, 'Bad word not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Bad word updated successfully',
            badWord: updatedBadWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteBadWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const deletedBadWord = await listBadWordsQueries.deleteListBadWord(req.params.badWordId);
        if (!deletedBadWord) {
            throw new CustomError(404, 'Bad word not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Bad word deleted successfully',
            badWord: deletedBadWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function listBadWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        // Extract pagination parameters from query
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        // Pastikan nilai pagination valid
        if (page < 1 || limit < 1) {
            res.status(400).json({
                status: "error",
                message: "Page and limit must be positive numbers"
            });
            return;
        }

        // Langsung menggunakan page dan limit (tidak perlu hitung skip di sini)
        const badWords = await listBadWordsQueries.getListBadWords(page, limit);

        // Get total count for pagination metadata
        const totalCount = await listBadWordsQueries.getListBadWordsCount();
        const totalPages = Math.ceil(totalCount / limit);

        // Tambahkan logging untuk debugging
        console.log(`Controller: Retrieved ${badWords.length} records for page ${page}, total: ${totalCount}`);

        res.status(200).json({
            status: "success",
            message: badWords.length > 0 ? 'Bad words found' : 'No bad words found for this page',
            pagination: {
                page,
                limit,
                totalItems: totalCount,
                totalPages
            },
            badWords
        });
    } catch (error: any) {
        console.error("Error in listBadWordsHandler:", error);
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message || "Failed to retrieve bad words list"
        });
    }
}

export async function getAllBadWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const badWords = await listBadWordsQueries.getListBadWords();
        res.status(200).json({
            status: "success",
            message: 'All bad words found',
            badWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getBadWordByWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const badWord = await listBadWordsQueries.getBadWordByWord(req.params.word);
        if (!badWord) {
            throw new CustomError(404, 'Bad word not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Bad word found',
            badWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getBadWordByWordNotExactHandler(req: Request, res: Response): Promise<void> {
    try {
        // Extract search word from params
        const { word } = req.params;

        // Extract pagination parameters from query
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        // Pastikan nilai pagination valid
        if (page < 1 || limit < 1) {
            res.status(400).json({
                status: "error",
                message: "Page and limit must be positive numbers"
            });
            return;
        }

        // Langsung menggunakan page dan limit (tidak perlu hitung skip di sini)
        const badWords = await listBadWordsQueries.getBadWordByWordNotExact(word, page, limit);

        // Get total count for pagination metadata
        const totalCount = await listBadWordsQueries.getBadWordByWordNotExactCount(word);
        const totalPages = Math.ceil(totalCount / limit);

        // Tambahkan logging untuk debugging
        console.log(`Controller: Retrieved ${badWords.length} records containing "${word}" for page ${page}, total: ${totalCount}`);

        res.status(200).json({
            status: "success",
            message: badWords.length > 0 ? 'Bad words found' : 'No bad words found matching your search',
            pagination: {
                page,
                limit,
                totalItems: totalCount,
                totalPages
            },
            badWords
        });
    } catch (error: any) {
        console.error("Error in getBadWordByWordNotExactHandler:", error);
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message || "Failed to search bad words"
        });
    }
}