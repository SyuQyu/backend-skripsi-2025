import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    postController
} from '../controllers';

const router = Router();

router.post('/', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.createPostHandler);
router.get('/all', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.getAllPostsHandler);
router.get('/search/:content', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.getPostByContentHandler);
router.get('/tag/:tag', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.getPostByTagHandler);
router.get('/user/:userId', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.getPostByUserHandler);
router.get('/:postId', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.getPostByIdHandler);
router.put('/:postId', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.updatePostHandler);
router.delete('/:postId', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.deletePostHandler);
router.post('/check/word', postController.checkWordHandler);
router.post('/increment/view', authMiddleware(["User", "Admin", "SuperAdmin"]), postController.incrementPostViewHandler);

export default router
