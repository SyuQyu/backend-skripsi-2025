import { Router } from 'express';
// import authorization from '../middlewares/authorization';
import {
    likeController
} from '../controllers';

const router = Router();

router.post('/', likeController.createLikeHandler);
router.get('/all', likeController.getAllLikesHandler);
router.get('/:likeId', likeController.getLikeByIdHandler);
router.put('/:likeId', likeController.updateLikeHandler);
router.delete('/:likeId', likeController.deleteLikeHandler);

export default router;