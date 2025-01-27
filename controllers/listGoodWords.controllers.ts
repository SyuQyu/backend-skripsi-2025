import { listGoodWordsQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function createListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWordsData = req.body;
        const newListGoodWords = await listGoodWordsQueries.createListGoodWord(listGoodWordsData);
        res.status(201).json({
            status: "success",
            message: 'ListGoodWords created successfully',
            listGoodWords: newListGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getListGoodWordsByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWords = await listGoodWordsQueries.getListGoodWordById(req.params.listGoodWordsId);
        if (!listGoodWords) {
            throw new CustomError(404, 'ListGoodWords not found');
        }
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords found',
            listGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedListGoodWordsData = req.body;
        const updatedListGoodWords = await listGoodWordsQueries.updateListGoodWord(req.params.listGoodWordsId, updatedListGoodWordsData);
        if (!updatedListGoodWords) {
            throw new CustomError(404, 'ListGoodWords not found');
        }
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords updated successfully',
            listGoodWords: updatedListGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const deletedListGoodWords = await listGoodWordsQueries.deleteListGoodWord(req.params.listGoodWordsId);
        if (!deletedListGoodWords) {
            throw new CustomError(404, 'ListGoodWords not found');
        }
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords deleted successfully',
            listGoodWords: deletedListGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message

        });
    }
}

export async function listAllListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWords = await listGoodWordsQueries.getListGoodWords();
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords found',
            listGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getGoodWordbyWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const goodWord = await listGoodWordsQueries.getGoodWordbyWord(req.params.word);
        if (!goodWord) {
            throw new CustomError(404, 'GoodWord not found');
        }
        res.status(200).json({
            status: "success",
            message: 'GoodWord found',
            goodWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}