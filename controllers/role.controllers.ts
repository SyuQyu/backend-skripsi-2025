import { roleQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";

export async function createRoleHandler(req: Request, res: Response): Promise<void> {
    try {
        const roleData = req.body;
        const newRole = await roleQueries.createRole(roleData);
        res.status(201).json({
            status: "success",
            message: "Role created successfully",
            role: newRole,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function getRoleByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const role = await roleQueries.getRoleById(req.params.roleId);
        if (!role) throw new CustomError(404, "Role not found");

        res.status(200).json({
            status: "success",
            message: "Role found",
            role,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}


export async function updateRoleHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedRoleData = req.body;
        const updatedRole = await roleQueries.updateRole(req.params.roleId, updatedRoleData);
        if (!updatedRole) throw new CustomError(404, "Role not found");

        res.status(200).json({
            status: "success",
            message: "Role updated successfully",
            role: updatedRole,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function deleteRoleHandler(req: Request, res: Response): Promise<void> {
    try {
        const deletedRole = await roleQueries.deleteRole(req.params.roleId);
        if (!deletedRole) throw new CustomError(404, "Role not found");

        res.status(200).json({
            status: "success",
            message: "Role deleted successfully",
            role: deletedRole,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}

export async function getRolesHandler(req: Request, res: Response): Promise<void> {
    try {
        const roles = await roleQueries.getRoles();
        res.status(200).json({
            status: "success",
            message: "Roles found",
            roles,
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message,
        });
    }
}
