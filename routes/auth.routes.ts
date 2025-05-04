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
router.get('/data-logged-in', authMiddleware(["User", "Admin", "SuperAdmin"]), authController.dataLoggedInHandler);
//  check password
router.post('/check-password', authMiddleware(["User", "Admin", "SuperAdmin"]), authController.checkPasswordHandler);
router.post('/check-username', authController.checkUsernameHandler);
router.post('/check-email', authController.checkEmailHandler);
// Reset password
router.post('/reset-password', authMiddleware(["User", "Admin", "SuperAdmin"]), authController.resetPasswordHandler);

export default router;
