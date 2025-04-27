import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    postController
} from '../controllers';

const router = Router();

router.post('/', postController.createPostHandler);
router.get('/all', authMiddleware(["User", "Admin"]), postController.getAllPostsHandler);
router.get('/search/:content', postController.getPostByContentHandler);
router.get('/tag/:tag', postController.getPostByTagHandler);
router.get('/user/:userId', postController.getPostByUserHandler);
router.get('/:postId', postController.getPostByIdHandler);
router.put('/:postId', postController.updatePostHandler);
router.delete('/:postId', postController.deletePostHandler);
router.post('/check/word', postController.checkWordHandler);
router.post('/increment/view', postController.incrementPostViewHandler);

export default router
