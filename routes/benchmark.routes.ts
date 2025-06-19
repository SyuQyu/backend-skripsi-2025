import { Router } from 'express';
import { benchmarkFiltersHandler } from '../controllers/benchmark.controllers';

const router = Router();

/**
 * @route POST /api/benchmark
 * @desc Run benchmark comparison of all bad word filtering algorithms
 * @body {text: string, trueBadWords?: string[], disableAccuracy?: boolean}
 * @access Public
 */
router.post('/', benchmarkFiltersHandler);

export default router;