import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    roleController
} from '../controllers';

const router = Router();

router.post('/', authMiddleware(["SuperAdmin"]), roleController.createRoleHandler);
router.get('/all', authMiddleware(["SuperAdmin"]), roleController.getRolesHandler);
router.get('/:roleId', authMiddleware(["SuperAdmin"]), roleController.getRoleByIdHandler);
router.put('/:roleId', authMiddleware(["SuperAdmin"]), roleController.updateRoleHandler);
router.delete('/:roleId', authMiddleware(["SuperAdmin"]), roleController.deleteRoleHandler);

export default router;