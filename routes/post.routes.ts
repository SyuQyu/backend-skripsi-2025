import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    postController
} from '../controllers';

const router = Router();

router.post('/', postController.createPostHandler);
router.get('/all', authMiddleware(["User", "Admin"]), postController.getAllPostsHandler);
router.get('/:postId', postController.getPostByIdHandler);
router.put('/:postId', postController.updatePostHandler);
router.delete('/:postId', postController.deletePostHandler);

export default router;