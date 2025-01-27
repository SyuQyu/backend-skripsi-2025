import { Router } from 'express';
// import authorization from '../middlewares/authorization';
import {
    reportController
} from '../controllers';

const router = Router();

router.post('/', reportController.createReportHandler);
router.get('/all', reportController.getReportsHandler);
router.get('/:reportId', reportController.getReportByIdHandler);
router.put('/:reportId', reportController.updateReportHandler);
router.delete('/:reportId', reportController.deleteReportHandler);

export default router;