import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    userController
} from '../controllers';

const router = Router();

// Route for creating a user with file upload middleware
router.post('/', userController.createUserHandler);

// Route for retrieving all users (authorization applied)
router.get('/all', authMiddleware(["User", "Admin", "SuperAdmin"]), userController.getUsersHandler);

// Route for retrieving a specific user by ID
router.get('/:userId', userController.getUserByIdHandler);

// Route for updating a user with file upload middleware
router.patch('/:userId', userController.updateUserHandler);

// Route for deleting a user (authorization applied)
router.delete('/:userId', authMiddleware(["Admin"]), userController.deleteUserHandler);

router.get("/:userId/photo", userController.getUserPhotoHandler);
export default router;