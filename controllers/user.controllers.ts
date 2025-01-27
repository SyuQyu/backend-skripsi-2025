import { userQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
export async function createUserHandler(req: Request, res: Response): Promise<void> {
    try {
        const userData = req.body;
        const newUser = await userQueries.createUser(userData);
        res.status(201).json({
            status: "success",
            message: 'User created successfully',
            user: newUser
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getUserByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const user = await userQueries.getUserById(req.params.userId);
        if (!user) {
            throw new CustomError(404, 'User not found');
        }
        res.status(200).json({
            status: "success",
            message: 'User found',
            user
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedUserData = req.body;
        const updatedUser = await userQueries.updateUser(req.params.userId, updatedUserData);
        if (!updatedUser) {
            throw new CustomError(404, 'User not found');
        }
        res.status(200).json({
            status: "success",
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteUserHandler(req: Request, res: Response): Promise<void> {
    try {
        const deletedUser = await userQueries.deleteUser(req.params.userId);
        if (!deletedUser) {
            throw new CustomError(404, 'User not found');
        }
        res.status(200).json({
            status: "success",
            message: 'User deleted successfully',
            user: deletedUser
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getUsersHandler(req: Request, res: Response): Promise<void> {
    try {
        const users = await userQueries.getUsers();
        res.status(200).json({
            status: "success",
            message: 'Users found',
            users
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}