import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { userQueries, roleQueries } from "../queries";
import { CustomError } from "../handler/customErrorHandler";
import { getUserPhotoUrl } from "../utils/getUserPhotoUrl";

type JwtPayload = { userId: string };

type User = {
    backgroundPicture: any;
    profilePicture: any;
    id: string;
    username: string;
    email: string;
    password: string;
    refreshToken?: string | null;
    firstLogin?: boolean;
    role?: {
        name: string;
    }
};

const ACCESS_TOKEN_SECRET: any = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET: any = process.env.REFRESH_TOKEN_SECRET;


// Cek username sudah digunakan atau belum
export async function checkUsernameHandler(req: Request, res: Response): Promise<void> {
    try {
        const { username } = req.body as { username?: string };
        if (!username) {
            res.status(400).json({ status: "error", message: "Username is required" });
            return;
        }

        const exists = await userQueries.isUsernameExists(username);
        res.status(200).json({
            status: "success",
            username,
            available: !exists,
            message: exists ? "Username sudah dipakai" : "Username tersedia"
        });
    } catch (error: any) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

// Cek email sudah digunakan atau belum
export async function checkEmailHandler(req: Request, res: Response): Promise<void> {
    try {
        const { email } = req.body as { email?: string };
        console.log(email);
        if (!email) {
            res.status(400).json({ status: "error", message: "Email is required" });
            return;
        }

        const exists = await userQueries.isEmailExists(email);
        res.status(200).json({
            status: "success",
            email,
            available: !exists,
            message: exists ? "Email sudah dipakai" : "Email tersedia"
        });
    } catch (error: any) {
        res.status(500).json({ status: "error", message: error.message });
    }
}


function generateAccessToken(userId: string, roleName?: string): string {
    return jwt.sign({ userId, roleName }, ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
}

function generateRefreshToken(userId: string, roleName?: string): string {
    return jwt.sign({ userId, roleName }, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
    try {
        const data = req.body;
        const hashedPassword: string = await bcrypt.hash(data.password, 10);
        const setRole = await roleQueries.getRoleByName("User");
        if (!setRole) throw new CustomError(500, "Internal Server Error: Role not found");
        const newUser: User = await userQueries.createUser({
            ...data,
            password: hashedPassword,
            firstLogin: true,
            roleId: setRole.id,
        });

        res.status(201).json({
            status: "success",
            message: "User registered successfully",
            user: newUser,
        });
    } catch (error: any) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {

    try {
        let firstLogin = false;
        const { username, password }: { username: string; password: string } = req.body;
        const user: User | null = await userQueries.getUserByUsername(username);
        if (!user) throw new CustomError(401, "Invalid username or password");
        if (user.firstLogin === true) {
            await userQueries.updateFirstLogin(user.id);
            firstLogin = true;
        }
        if (!user) throw new CustomError(401, "Invalid email or password");

        const isPasswordValid: boolean = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new CustomError(401, "Invalid email or password");

        const accessToken: string = generateAccessToken(user.id, user?.role?.name);
        const refreshToken: string = generateRefreshToken(user.id, user?.role?.name);

        await userQueries.updateRefreshToken(user.id, refreshToken);

        res.status(200).json({
            status: "success",
            message: "Login successful",
            role: user.role?.name,
            username: user.username,
            email: user.email,
            userId: user.id,
            firstLogin,
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
    try {
        const { userId, password }: { userId: string; password: string } = req.body;
        const user: User | null = await userQueries.getUserById(userId);
        if (!user) throw new CustomError(404, "User not found");

        const hashedPassword: string = await bcrypt.hash(password, 10);
        await userQueries.resetPassword(user.id, hashedPassword);

        res.status(200).json({
            status: "success",
            message: "Password reset successfully",
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function checkPasswordHandler(req: Request, res: Response): Promise<void> {
    try {
        const { userId, password }: { userId: string; password: string } = req.body;
        const user: User | null = await userQueries.getUserById(userId);
        if (!user) throw new CustomError(404, "User not found");

        const isPasswordValid: boolean = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new CustomError(200, "Invalid password");

        res.status(200).json({
            status: "success",
            message: "Password is valid",
        });
    }
    catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function dataLoggedInHandler(req: Request, res: Response): Promise<void> {
    try {

        const user: User | null = await userQueries.getUserById(res.locals.user.id);
        if (!user) throw new CustomError(404, "User not found");
        const userWithPhotoLinks = {
            ...user,
            profilePictureUrl: user.profilePicture ? getUserPhotoUrl(user.id, 'profile') : null,
            backgroundPictureUrl: user.backgroundPicture ? getUserPhotoUrl(user.id, 'background') : null,
        };
        res.status(200).json({
            status: "success",
            message: "User data retrieved successfully",
            user: userWithPhotoLinks,
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
            status: "error",
            message: error.message,
        });
    }
}
export async function refreshTokenHandler(req: Request, res: Response): Promise<void> {
    try {
        const { token }: { token: string } = req.body;
        if (!token) throw new CustomError(403, "Forbidden: No refresh token provided");
        console.log(token);
        const user: User | null = await userQueries.getUserByRefreshToken(token);
        if (!user) throw new CustomError(403, "Forbidden: Invalid refresh token");

        jwt.verify(token, REFRESH_TOKEN_SECRET, (err: any, decoded: any) => {
            if (err) throw new CustomError(403, "Forbidden: Invalid refresh token");

            const { userId } = decoded as JwtPayload;
            const newAccessToken: string = generateAccessToken(userId);

            res.status(200).json({ status: "success", accessToken: newAccessToken });
        });
    } catch (error: any) {
        res.status(error instanceof CustomError ? error.code : 500).json({
            status: "error",
            message: error.message,
        });
    }
}