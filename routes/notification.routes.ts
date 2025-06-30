import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import { notificationController } from '../controllers';

const router = Router();

// Ambil semua notifikasi user (butuh auth)
router.get('/user/:userId', authMiddleware(["User", "Admin", "SuperAdmin"]), notificationController.getNotificationsByUser);

// Tandai notifikasi sebagai sudah dibaca
router.put('/read/:notificationId', authMiddleware(["User", "Admin", "SuperAdmin"]), notificationController.markNotificationAsRead);

// Tandai semua notifikasi user sebagai sudah dibaca
router.put('/read-all/:userId', authMiddleware(["User", "Admin", "SuperAdmin"]), notificationController.markAllNotificationsAsRead);

// Hapus notifikasi
router.delete('/:notificationId', authMiddleware(["User", "Admin", "SuperAdmin"]), notificationController.deleteNotification);

export default router
