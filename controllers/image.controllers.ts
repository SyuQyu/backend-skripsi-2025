import { imageQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function createImageHandler(req: Request, res: Response): Promise<void> {
    try {
        const imageData = req.body;
        const newImage = await imageQueries.createImage(imageData);
        res.status(201).json({
            status: "success",
            message: 'Image created successfully',
            image: newImage
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getImageByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const image = await imageQueries.getImageById(req.params.imageId);
        if (!image) {
            throw new CustomError(404, 'Image not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Image found',
            image
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateImageHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedImageData = req.body;
        const updatedImage = await imageQueries.updateImage(req.params.imageId, updatedImageData);
        if (!updatedImage) {
            throw new CustomError(404, 'Image not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Image updated successfully',
            image: updatedImage
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteImageHandler(req: Request, res: Response): Promise<void> {
    try {
        const deletedImage = await imageQueries.deleteImage(req.params.imageId);
        if (!deletedImage) {
            throw new CustomError(404, 'Image not found');
        }
        res.status(200).json({
            status: "success",
            message: 'Image deleted successfully'
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getImagesHandler(req: Request, res: Response): Promise<void> {
    try {
        const images = await imageQueries.getImages();
        res.status(200).json({
            status: "success",
            message: 'Images found',
            images
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}
