import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    reportController
} from '../controllers';

const router = Router();

// Create report
router.post('/', reportController.createReportHandler);

// Get all reports
router.get('/all', reportController.getReportsHandler);

// Get reports by postId
router.get('/post/:postId', reportController.getReportsByPostIdHandler);

// Get reports by replyId
router.get('/reply/:replyId', reportController.getReportsByReplyIdHandler);

// Get report by reportId
router.get('/:reportId', reportController.getReportByIdHandler);

// Update report
router.put('/:reportId', reportController.updateReportHandler);

// Delete report
router.delete('/:reportId', reportController.deleteReportHandler);

export default router;
