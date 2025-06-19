import { Request, Response } from 'express';
import { unifiedTextFilter } from '../algoritma/unifiedFilter';

/**
 * Controller for text filtering with configurable algorithm options
 */
export async function filterTextHandler(req: Request, res: Response): Promise<void> {
    try {
        const {
            text,
            trueBadWords = [],
            useNormalization = true,
            useFuzzyMatching = true,
            useAIParaphrase = true,
            disableAccuracy = false,
            runAllMethods = false
        } = req.body;

        if (!text || typeof text !== 'string') {
            res.status(400).json({
                status: "error",
                message: "Text is required and must be a string"
            });
            return;
        }

        const result = await unifiedTextFilter(text, {
            trueBadWords,
            useNormalization,
            useFuzzyMatching,
            useAIParaphrase,
            disableAccuracy,
            runAllMethods
        });

        res.status(200).json({
            status: "success",
            result
        });
    } catch (error: any) {
        console.error('Error filtering text:', error);
        res.status(500).json({
            status: "error",
            message: error.message || "An error occurred while filtering text"
        });
    }
}

/**
 * Controller for benchmarking all filtering methods
 */
export async function benchmarkFiltersHandler(req: Request, res: Response): Promise<void> {
    try {
        const {
            text,
            trueBadWords = [],
            disableAccuracy = false,
        } = req.body;

        if (!text || typeof text !== 'string') {
            res.status(400).json({
                status: "error",
                message: "Text is required and must be a string"
            });
            return;
        }

        const result = await unifiedTextFilter(text, {
            trueBadWords,
            disableAccuracy,
            runAllMethods: true
        });

        res.status(200).json({
            status: "success",
            result
        });
    } catch (error: any) {
        console.error('Error benchmarking filters:', error);
        res.status(500).json({
            status: "error",
            message: error.message || "An error occurred while benchmarking filters"
        });
    }
}