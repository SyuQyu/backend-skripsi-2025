import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    listBadWordsController
} from '../controllers';

const router = Router();

router.post('/', listBadWordsController.createBadWordHandler);
router.get('/all', listBadWordsController.listBadWordsHandler);
router.get('/:badWordId', listBadWordsController.getBadWordByIdHandler);
router.put('/:badWordId', listBadWordsController.updateBadWordHandler);
router.delete('/:badWordId', listBadWordsController.deleteBadWordHandler);
router.get('/check/:word', listBadWordsController.getBadWordByWordHandler);
router.get('/all-without-pagination', listBadWordsController.getAllBadWordsHandler);
router.get('/check-not-exact/:word', listBadWordsController.getBadWordByWordNotExactHandler);

export default router;