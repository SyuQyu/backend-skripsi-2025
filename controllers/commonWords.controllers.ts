import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import * as commonWordQueries from "../queries/commonWords.queries";

export async function createCommonWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const { word } = req.body;
        const newWord = await commonWordQueries.createCommonWord(word);
        res.status(201).json({
            status: "success",
            message: "Common word created successfully",
            word: newWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getCommonWordByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const word = await commonWordQueries.getCommonWordById(id);
        if (!word) throw new CustomError(404, "Common word not found");

        res.status(200).json({
            status: "success",
            message: "Common word found",
            word
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateCommonWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const { word } = req.body;
        const updatedWord = await commonWordQueries.updateCommonWord(id, word);

        res.status(200).json({
            status: "success",
            message: "Common word updated successfully",
            word: updatedWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteCommonWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        await commonWordQueries.deleteCommonWord(id);

        res.status(200).json({
            status: "success",
            message: "Common word deleted successfully"
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getCommonWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const words = await commonWordQueries.getCommonWords();
        res.status(200).json({
            status: "success",
            message: "Common words retrieved successfully",
            words
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getCommonWordByWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const { word } = req.params;
        const foundWord = await commonWordQueries.getCommonWordByWord(word);
        if (!foundWord) throw new CustomError(404, "Common word not found");

        res.status(200).json({
            status: "success",
            message: "Common word found",
            word: foundWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}
