import { Router } from 'express';
// import authorization from '../middlewares/authorization';
import {
    imageController
} from '../controllers';

const router = Router();

router.post('/', imageController.createImageHandler);
router.get('/all', imageController.getImagesHandler);
router.get('/:imageId', imageController.getImageByIdHandler);
router.put('/:imageId', imageController.updateImageHandler);
router.delete('/:imageId', imageController.deleteImageHandler);

export default router;