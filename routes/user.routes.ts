import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    userController
} from '../controllers';

const router = Router();

router.post('/', userController.createUserHandler);
router.get('/all', authMiddleware(["User", "Admin"]), userController.getUsersHandler);
router.get('/:userId', userController.getUserByIdHandler);
router.put('/:userId', userController.updateUserHandler);
router.delete('/:userId', authMiddleware(["User", "Admin"]), userController.deleteUserHandler);

export default router;