import { roleQueries, userQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import bcrypt from "bcrypt";
import { uploadProfileBg } from "../middlewares/upload";
import path from "path";
import fs from 'fs';
import { getUserPhotoUrl } from "../utils/getUserPhotoUrl";

export async function getUserPhotoHandler(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { type } = req.query;

    if (!type || (type !== "profile" && type !== "background")) {
        res.status(400).json({ status: "error", message: "Query type harus 'profile' atau 'background'" });
        return;
    }

    try {
        const user = await userQueries.getUserById(userId);
        if (!user) {
            throw new CustomError(404, "User not found");
        }

        const fileName =
            type === "profile"
                ? user.profilePicture
                : user.backgroundPicture;

        if (!fileName) {
            res.status(404).json({ status: "error", message: "Foto tidak ditemukan untuk user" });
            return;
        }

        const imagePath = path.join(__dirname, "../uploads/profile-bg", fileName);

        // Cek apakah filenya ada secara fisik
        if (!fs.existsSync(imagePath)) {
            res.status(404).json({ status: "error", message: "File gambar tidak ditemukan" });
            return;
        }

        // Set content-type otomatis
        res.sendFile(imagePath);
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function createUserHandler(req: Request, res: Response): Promise<void> {
    uploadProfileBg(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ status: "error", message: err.message });
        }

        try {
            const data = req.body;

            // Hash password
            const hashedPassword: string = await bcrypt.hash(data.password, 10);

            // Get default role 'User'
            const setRole = await roleQueries.getRoleByName("User");
            if (!setRole) throw new CustomError(500, "Internal Server Error: Role not found");

            // Type assertion for req.files
            const files = req.files as { profilePicture?: Express.Multer.File[]; backgroundPicture?: Express.Multer.File[] };

            // Get uploaded files
            const profilePicture = files.profilePicture ? files.profilePicture[0].filename : null;
            const backgroundPicture = files.backgroundPicture ? files.backgroundPicture[0].filename : null;

            // Create new user
            const newUser = await userQueries.createUser({
                ...data,
                password: hashedPassword,
                firstLogin: true,
                roleId: setRole.id,
                profilePicture,
                backgroundPicture
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
    });
}


export async function getUserByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const user = await userQueries.getUserById(req.params.userId);
        if (!user) {
            throw new CustomError(404, 'User not found');
        }

        // Tambahkan link gambar (hanya jika file ada)
        const userWithPhotoLinks = {
            ...user,
            profilePictureUrl: user.profilePicture ? getUserPhotoUrl(user.id, 'profile') : null,
            backgroundPictureUrl: user.backgroundPicture ? getUserPhotoUrl(user.id, 'background') : null,
        };

        res.status(200).json({
            status: "success",
            message: 'User found',
            user: userWithPhotoLinks,
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
    uploadProfileBg(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ status: "error", message: err.message });
        }

        try {
            const updatedUserData = { ...req.body };

            // Fetch the existing user details
            const existingUser = await userQueries.getUserById(req.params.userId);
            if (!existingUser) {
                throw new CustomError(404, 'User not found');
            }

            // If there's a new password, hash it
            if (updatedUserData.password) {
                updatedUserData.password = await bcrypt.hash(updatedUserData.password, 10);
            }

            // Type assertion for req.files
            const files = req.files as { profilePicture?: Express.Multer.File[]; backgroundPicture?: Express.Multer.File[] };

            // Delete old profile picture if a new one is uploaded
            if (files.profilePicture) {
                if (existingUser.profilePicture) {
                    const oldProfilePicPath = path.join(__dirname, '../uploads/profile-bg/', existingUser.profilePicture);
                    fs.unlink(oldProfilePicPath, (err) => {
                        if (err) console.error(`Failed to delete old profile picture: ${err.message}`);
                    });
                }
                updatedUserData.profilePicture = files.profilePicture[0].filename;
            }

            // Delete old background picture if a new one is uploaded
            if (files.backgroundPicture) {
                if (existingUser.backgroundPicture) {
                    const oldBackgroundPicPath = path.join(__dirname, '../uploads/profile-bg/', existingUser.backgroundPicture);
                    fs.unlink(oldBackgroundPicPath, (err) => {
                        if (err) console.error(`Failed to delete old background picture: ${err.message}`);
                    });
                }
                updatedUserData.backgroundPicture = files.backgroundPicture[0].filename;
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
    });
}

export async function deleteUserHandler(req: Request, res: Response): Promise<void> {
    try {
        const user = await userQueries.getUserById(req.params.userId);
        if (!user) {
            throw new CustomError(404, 'User not found');
        }

        // Delete profile picture if it exists
        if (user.profilePicture) {
            const profilePicPath = path.join(__dirname, '../uploads/profile-bg/', user.profilePicture);
            fs.unlink(profilePicPath, (err) => {
                if (err) console.error(`Failed to delete profile picture: ${err.message}`);
            });
        }

        // Delete background picture if it exists
        if (user.backgroundPicture) {
            const backgroundPicPath = path.join(__dirname, '../uploads/profile-bg/', user.backgroundPicture);
            fs.unlink(backgroundPicPath, (err) => {
                if (err) console.error(`Failed to delete background picture: ${err.message}`);
            });
        }

        // Perform user deletion
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

        const usersWithPhotoLinks = users.map((user: any) => ({
            ...user,
            profilePictureUrl: user.profilePicture ? getUserPhotoUrl(user.id, 'profile') : null,
            backgroundPictureUrl: user.backgroundPicture ? getUserPhotoUrl(user.id, 'background') : null,
        }));

        res.status(200).json({
            status: "success",
            message: 'Users found',
            users: usersWithPhotoLinks
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}