import { Router } from 'express';
// import authorization from '../middlewares/authorization';
import {
    listGoodWordsController
} from '../controllers';

const router = Router();

router.post('/', listGoodWordsController.createListGoodWordsHandler);
router.get('/all', listGoodWordsController.getListGoodWordsByIdHandler);
router.get('/:goodWordId', listGoodWordsController.getListGoodWordsByIdHandler);
router.put('/:goodWordId', listGoodWordsController.updateListGoodWordsHandler);
router.delete('/:goodWordId', listGoodWordsController.deleteListGoodWordsHandler);

export default router;