import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import dotenv from "dotenv";
import { CustomError } from "../handler/customErrorHandler";

dotenv.config();

type TPayload = {
    roleName: string;
    userId: string;
};

export function authMiddleware(allowedRoles?: ("Admin" | "User" | "SuperAdmin")[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const sendError = (status: number, message: string) =>
            res.status(status).json({ status: "error", message });

        try {
            const authHeader = req.headers.authorization;

            if (!authHeader?.startsWith("Bearer ")) {
                throw new CustomError(401, "Unauthorized: No token provided");
            }

            const token = authHeader.substring(7); // Extract token after 'Bearer '
            const secret = process.env.ACCESS_TOKEN_SECRET;

            if (!secret) {
                throw new CustomError(500, "Internal Server Error: Missing token secret");
            }

            const decoded = jwt.verify(token, secret) as TPayload;
            res.locals.user = { id: decoded.userId, role: decoded.roleName.toLowerCase() };

            if (allowedRoles && !allowedRoles.some(role => role.toLowerCase() === res.locals.user.role)) {
                throw new CustomError(403, "You don't have permission to access this resource");
            }

            next();
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new CustomError(401, "Token has expired");
            }
            throw new CustomError(401, "Unauthorized: Invalid token");
        }
    };
}
