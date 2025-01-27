import { Router } from 'express';
// import authorization from '../middlewares/authorization';
import {
    replyController
} from '../controllers';

const router = Router();

router.post('/', replyController.createReplyHandler);
router.get('/:postId/all', replyController.getRepliesByPostIdHandler);
router.get('/:replyId', replyController.getReplyByIdHandler);
router.put('/:replyId', replyController.updateReplyHandler);
router.delete('/:replyId', replyController.deleteReplyHandler);

export default router;