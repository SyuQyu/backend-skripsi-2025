import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    dashboardDataController
} from '../controllers';

const router = Router();

router.get('/total-users', authMiddleware(["Admin", "SuperAdmin"]), dashboardDataController.getTotalUsersHandler);
router.get('/total-posts', authMiddleware(["Admin", "SuperAdmin"]), dashboardDataController.getTotalPostsHandler);
router.get('/growth-users', authMiddleware(["Admin", "SuperAdmin"]), dashboardDataController.growthUserHandler);
router.get('/growth-posts', authMiddleware(["Admin", "SuperAdmin"]), dashboardDataController.growthPostHandler);

export default router;