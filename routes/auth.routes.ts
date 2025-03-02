import { Router } from 'express';
import {
    authController
} from '../controllers';

const router = Router();

// Register a new user
router.post('/register', authController.registerHandler);

// Login user
router.post('/login', authController.loginHandler);

// Refresh access token
router.post('/refresh-token', authController.refreshTokenHandler);

export default router;
