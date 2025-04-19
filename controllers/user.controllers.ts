import { roleQueries, userQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import bcrypt from "bcrypt";
export async function createUserHandler(req: Request, res: Response): Promise<void> {
    try {
        const data = req.body;

        // Hash password
        const hashedPassword: string = await bcrypt.hash(data.password, 10);

        // Ambil role default 'User'
        const setRole = await roleQueries.getRoleByName("User");
        if (!setRole) throw new CustomError(500, "Internal Server Error: Role not found");

        // Buat user baru
        const newUser = await userQueries.createUser({
            ...data,
            password: hashedPassword,
            firstLogin: true,
            roleId: setRole.id,
        });

        res.status(201).json({
            status: "success",
            message: "User created successfully",
            user: newUser,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
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
        const updatedUserData = { ...req.body };

        // Jika ada password baru, hash dulu
        if (updatedUserData.password) {
            updatedUserData.password = await bcrypt.hash(updatedUserData.password, 10);
        }

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