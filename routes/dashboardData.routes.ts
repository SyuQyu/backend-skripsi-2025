import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    dashboardDataController
} from '../controllers';

const router = Router();

router.get('/total-users', authMiddleware(["Admin"]), dashboardDataController.getTotalUsersHandler);
router.get('/total-posts', authMiddleware(["Admin"]), dashboardDataController.getTotalPostsHandler);
router.get('/growth-users', authMiddleware(["Admin"]), dashboardDataController.growthUserHandler);
router.get('/growth-posts', authMiddleware(["Admin"]), dashboardDataController.growthPostHandler);

export default router;