import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { CustomError } from "../handler/customErrorHandler";

dotenv.config();

type TPayload = {
    roleName: string;
    userId: string;
};

interface CustomRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export function authMiddleware(roles?: ("Admin" | "User")[]) {
    return (req: CustomRequest, res: Response, next: NextFunction): void => {
        try {
            const authHeader: string | undefined = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new CustomError(401, "Unauthorized: No token provided");
            }

            const token: string = authHeader.split(" ")[1];
            const secret = process.env.ACCESS_TOKEN_SECRET;
            if (!secret) {
                throw new CustomError(500, "Internal Server Error: Missing token secret");
            }

            const decoded = jwt.verify(token, secret) as { userId: string; roleName: string };
            req.user = { id: decoded.userId, role: decoded.roleName.toLowerCase() };

            if (roles && !roles.map(r => r.toLowerCase()).includes(req.user.role)) {
                throw new CustomError(403, "You don't have permission to access this resource");
            }

            next();
        } catch (error: any) {
            if (error instanceof TokenExpiredError) {
                throw new CustomError(401, "Token has expired");
            } else {
                throw new CustomError(401, "Unauthorized: Invalid token");
            }
        }
    };
}
