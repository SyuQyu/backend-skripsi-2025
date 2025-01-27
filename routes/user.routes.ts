import { Router } from 'express';
// import authorization from '../middlewares/authorization';
import {
    userController
} from '../controllers';

const router = Router();

router.post('/', userController.createUserHandler);
router.get('/all', userController.getUsersHandler);
router.get('/:userId', userController.getUserByIdHandler);
router.put('/:userId', userController.updateUserHandler);
router.delete('/:userId', userController.deleteUserHandler);

export default router;