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
        const badWords = await listBadWordsQueries.getListBadWords();
        res.status(200).json({
            status: "success",
            message: 'Bad words found',
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