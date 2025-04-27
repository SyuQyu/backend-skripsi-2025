import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    listGoodWordsController
} from '../controllers';

const router = Router();

router.post('/', listGoodWordsController.createListGoodWordsHandler);
router.get('/all', listGoodWordsController.listAllListGoodWordsHandler);
router.get('/:goodWordId', listGoodWordsController.getListGoodWordsByIdHandler);
router.put('/:goodWordId', listGoodWordsController.updateListGoodWordsHandler);
router.delete('/:goodWordId', listGoodWordsController.deleteListGoodWordsHandler);
router.post('/bluk/create', listGoodWordsController.bulkInsertListGoodWordsHandler);

export default router;