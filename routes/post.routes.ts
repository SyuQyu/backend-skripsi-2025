import { Router } from 'express';
// import authorization from '../middlewares/authorization';
import {
    postController
} from '../controllers';

const router = Router();

router.post('/', postController.createPostHandler);
router.get('/all', postController.getAllPostsHandler);
router.get('/:postId', postController.getPostByIdHandler);
router.put('/:postId', postController.updatePostHandler);
router.delete('/:postId', postController.deletePostHandler);

export default router;