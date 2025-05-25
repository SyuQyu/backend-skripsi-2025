import { Router } from 'express';
import {
    createCommonWordHandler,
    getCommonWordsHandler,
    getCommonWordByIdHandler,
    updateCommonWordHandler,
    deleteCommonWordHandler
} from '../controllers/commonWords.controllers';
import { authMiddleware } from '../middlewares/authorization'; // opsional

const router = Router();

// Jika perlu autentikasi, aktifkan authMiddleware
router.post('/', createCommonWordHandler);
router.get('/all', getCommonWordsHandler);
router.get('/:wordId', getCommonWordByIdHandler);
router.put('/:wordId', updateCommonWordHandler);
router.delete('/:wordId', deleteCommonWordHandler);

export default router;
