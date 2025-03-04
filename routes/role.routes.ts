import { Router } from 'express';
import { authMiddleware } from '../middlewares/authorization';
import {
    roleController
} from '../controllers';

const router = Router();

router.post('/', roleController.createRoleHandler);
router.get('/all', roleController.getRolesHandler);
router.get('/:roleId', roleController.getRoleByIdHandler);
router.put('/:roleId', roleController.updateRoleHandler);
router.delete('/:roleId', roleController.deleteRoleHandler);

export default router;