import { Router } from 'express';
import {
    authController
} from '../controllers';
import { authMiddleware } from '../middlewares/authorization';

const router = Router();

// Register a new user
router.post('/register', authController.registerHandler);

// Login user
router.post('/login', authController.loginHandler);

// Refresh access token
router.post('/refresh-token', authController.refreshTokenHandler);

// data Logged In
router.get('/data-logged-in', authMiddleware(["User", "Admin"]), authController.dataLoggedInHandler);

export default router;
