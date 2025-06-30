import { PrismaClient, Notification } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new notification
 */
export async function createNotification(data: {
    userId: string;
    type: string;
    message: string;
    postId?: string;
    replyId?: string;
    url?: string;
}) {
    return prisma.notification.create({
        data: {
            userId: data.userId,
            type: data.type,
            message: data.message,
            postId: data.postId,
            replyId: data.replyId,
            url: data.url,
        },
    });
}

/**
 * Get all notifications for a user (latest first)
 */
export async function getNotificationsByUser(userId: string) {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
    return prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
    });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
    return prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
    return prisma.notification.delete({
        where: { id: notificationId },
    });
}