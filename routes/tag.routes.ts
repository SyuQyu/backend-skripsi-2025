import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    tagController
} from '../controllers';

const router = Router();

router.post('/', tagController.createTagHandler);
router.get('/all', tagController.getAllTagsHandler);
router.get('/:tagId', tagController.getTagByIdHandler);
router.put('/:tagId', tagController.updateTagHandler);
router.delete('/:tagId', tagController.deleteTagHandler);

export default router;