import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    likeController
} from '../controllers';

const router = Router();

router.post('/', likeController.createLikeHandler);
router.get('/all', likeController.getAllLikesHandler);
router.get('/:likeId', likeController.getLikeByIdHandler);
router.put('/:likeId', likeController.updateLikeHandler);
router.delete('/:likeId', likeController.deleteLikeHandler);
router.get('/post/:parentId', likeController.getLikesByParentIdHandler);
router.get('/reply/:parentId', likeController.getLikesByParentIdHandler);
router.get('/user/:userId', likeController.getLikesByUserIdHandler);

export default router;