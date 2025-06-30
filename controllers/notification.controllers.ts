import { Request, Response } from "express";
import * as notificationQueries from "../queries/notification.queries";
import { CustomError } from "../handler/customErrorHandler";

// Ambil semua notifikasi user
export async function getNotificationsByUser(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.params.userId;
        const notifications = await notificationQueries.getNotificationsByUser(userId);
        res.status(200).json({
            status: "success",
            notifications
        });
    } catch (error: any) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}

// Tandai satu notifikasi sebagai sudah dibaca
export async function markNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
        const notificationId = req.params.notificationId;
        const notification = await notificationQueries.markNotificationAsRead(notificationId);
        res.status(200).json({
            status: "success",
            notification
        });
    } catch (error: any) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}

// Tandai semua notifikasi user sebagai sudah dibaca
export async function markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.params.userId;
        const result = await notificationQueries.markAllNotificationsAsRead(userId);
        res.status(200).json({
            status: "success",
            updatedCount: result.count
        });
    } catch (error: any) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}

// Hapus notifikasi
export async function deleteNotification(req: Request, res: Response): Promise<void> {
    try {
        const notificationId = req.params.notificationId;
        await notificationQueries.deleteNotification(notificationId);
        res.status(200).json({
            status: "success",
            message: "Notification deleted"
        });
    } catch (error: any) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}