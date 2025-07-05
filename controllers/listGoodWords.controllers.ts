import { listGoodWordsQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import { uploadSingleFile } from "../middlewares/upload";
import path from "path";
import * as XLSX from 'xlsx';

import { createNotification } from "../queries/notification.queries";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWordsData = req.body;
        const newListGoodWords = await listGoodWordsQueries.createGoodWord(listGoodWordsData);

        // Kirim notifikasi ke semua superadmin setelah berhasil tambah good word
        const superAdmins = await prisma.user.findMany({
            where: {
                role: {
                    name: 'SuperAdmin', // Pastikan nama role sesuai di database Anda
                },
            },
        });

        await Promise.all(
            superAdmins.map((user) =>
                createNotification({
                    userId: user.id,
                    type: 'NEW_GOOD_WORD',
                    message: `Admin menambahkan kata baik baru: "${newListGoodWords.word}"`,
                })
            )
        );

        res.status(201).json({
            status: "success",
            message: 'ListGoodWords created successfully',
            listGoodWords: newListGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

// export async function createListGoodWordsHandler(req: Request, res: Response): Promise<void> {
//     try {
//         const listGoodWordsData = req.body;
//         const newListGoodWords = await listGoodWordsQueries.createListGoodWord(listGoodWordsData);
//         res.status(201).json({
//             status: "success",
//             message: 'ListGoodWords created successfully',
//             listGoodWords: newListGoodWords
//         });
//     } catch (error: any) {
//         const statusCode = error instanceof CustomError ? error.code : 500;
//         res.status(statusCode).json({
//             status: "error",
//             message: error.message
//         });
//     }
// }

export async function getListGoodWordsByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWords = await listGoodWordsQueries.getGoodWordById(req.params.goodWordId);
        if (!listGoodWords) {
            throw new CustomError(404, 'ListGoodWords not found');
        }
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords found',
            listGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function updateListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const updatedListGoodWordsData = req.body;
        const updatedListGoodWords = await listGoodWordsQueries.updateGoodWord(req.params.goodWordId, updatedListGoodWordsData);
        if (!updatedListGoodWords) {
            throw new CustomError(404, 'ListGoodWords not found');
        }
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords updated successfully',
            listGoodWords: updatedListGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function deleteListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const deletedListGoodWords = await listGoodWordsQueries.deleteGoodWord(req.params.goodWordId);
        if (!deletedListGoodWords) {
            throw new CustomError(404, 'ListGoodWords not found');
        }
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords deleted successfully',
            listGoodWords: deletedListGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message

        });
    }
}

export async function listAllListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWords = await listGoodWordsQueries.getGoodWords();
        res.status(200).json({
            status: "success",
            message: 'ListGoodWords found',
            listGoodWords
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export async function getGoodWordbyWordHandler(req: Request, res: Response): Promise<void> {
    try {
        const goodWord = await listGoodWordsQueries.getGoodWordByWord(req.params.word);
        if (!goodWord) {
            throw new CustomError(404, 'GoodWord not found');
        }
        res.status(200).json({
            status: "success",
            message: 'GoodWord found',
            goodWord
        });
    } catch (error: any) {
        const statusCode = error instanceof CustomError ? error.code : 500;
        res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}

export const bulkInsertFromFileHandler = [
    uploadSingleFile,
    async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) throw new CustomError(400, 'No file uploaded');
            const ext = path.extname(req.file.originalname).toLowerCase();
            const MAX_FILE_SIZE = 5 * 1024 * 1024;
            if (req.file.size > MAX_FILE_SIZE) throw new CustomError(400, `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);

            let data: Array<{ [key: string]: string }>;
            if (ext === '.csv') {
                const csvString = req.file.buffer.toString('utf-8');
                const workbook = XLSX.read(csvString, { type: 'string' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            } else if (ext === '.xlsx' || ext === '.xls') {
                const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            } else {
                throw new CustomError(400, `Unsupported file type: ${ext}`);
            }
            if (!data || data.length === 0) throw new CustomError(400, 'Empty or invalid file data');
            const MAX_ROWS = 5000;
            if (data.length > MAX_ROWS) throw new CustomError(400, `Too many rows. Maximum is ${MAX_ROWS} rows`);

            const BATCH_SIZE = 100;
            const results = { count: 0, insertedWords: [] as any[] };

            // Ambil semua kata kasar & kata baik yang sudah ada di DB
            const allBadWords = await prisma.badWord.findMany({ select: { id: true, word: true } });
            const allGoodWords = await prisma.goodWord.findMany({ select: { id: true, word: true } });
            const allMappings = await prisma.badWordGoodWord.findMany({ select: { badWordId: true, goodWordId: true } });

            // Map untuk lookup cepat
            const badWordMap = new Map(allBadWords.map(item => [item.word.trim().toLowerCase(), item.id]));
            const goodWordMap = new Map(allGoodWords.map(item => [item.word.trim().toLowerCase(), item.id]));
            // Set relasi unik badWordId|goodWordId
            const mappingSet = new Set(allMappings.map(m => `${m.badWordId}|${m.goodWordId}`));

            for (let i = 0; i < data.length; i += BATCH_SIZE) {
                const batchData = data.slice(i, i + BATCH_SIZE);

                // Kumpulkan pasangan kata kasar dan kata baik
                const wordPairs = batchData.flatMap(row => {
                    const badWordsRaw = row['Kata Kasar'] || row['kata kasar'] || row['kata kotor'] || row['Kata Kotor'] || '';
                    const slangRaw = row['Variasi Ejaan/Slang'] || row['variasi ejaan/slang'] || row['slang'] || '';
                    const goodWordRaw = row['Padanan Kata Halus'] || row['padanan kata halus'] || row['kata baik'] || row['Kata Baik'] || '';

                    const badWordsArr = [
                        ...(badWordsRaw ? badWordsRaw.split(',') : []),
                        ...(slangRaw ? slangRaw.split(',') : [])
                    ].map(w => w.trim()).filter(Boolean);

                    const substitutesArr = goodWordRaw
                        ? goodWordRaw.split(',').map(w => w.trim()).filter(Boolean)
                        : [];

                    const pairs: { word: string; substitute: string }[] = [];
                    const MAX_COMBINATIONS = 20;
                    for (const word of badWordsArr) {
                        for (const substitute of substitutesArr) {
                            if (pairs.length < MAX_COMBINATIONS) {
                                pairs.push({ word, substitute });
                            } else {
                                break;
                            }
                        }
                    }
                    return pairs;
                }).filter(item => item.word && item.substitute);

                // Proses insert dengan pengecekan duplikasi kata kasar & kata baik & mapping
                for (const pair of wordPairs) {
                    const badWordKey = pair.word.trim().toLowerCase();
                    let badWordId = badWordMap.get(badWordKey);

                    // Jika kata kasar belum ada, insert dan update map
                    if (!badWordId) {
                        const badWord = await prisma.badWord.create({
                            data: { word: pair.word }
                        });
                        badWordId = badWord.id;
                        badWordMap.set(badWordKey, badWordId);
                    }

                    // Cek kata baik global, jika belum ada insert ke DB (tabel goodWord)
                    const goodWordKey = pair.substitute.trim().toLowerCase();
                    let goodWordId: string | undefined = goodWordMap.get(goodWordKey);
                    if (!goodWordId) {
                        const goodWord = await prisma.goodWord.create({
                            data: { word: pair.substitute }
                        });
                        goodWordId = goodWord.id;
                        goodWordMap.set(goodWordKey, goodWordId);
                    }

                    // Cek relasi many-to-many (BadWordGoodWord)
                    const mappingKey = `${badWordId}|${goodWordId}`;
                    if (mappingSet.has(mappingKey)) {
                        // Sudah ada, skip insert relasi
                        continue;
                    }

                    // Insert relasi many-to-many
                    const mapping = await prisma.badWordGoodWord.create({
                        data: {
                            badWordId: badWordId,
                            goodWordId: goodWordId
                        }
                    });
                    mappingSet.add(mappingKey);
                    results.count += 1;
                    results.insertedWords.push(mapping);
                }
            }

            if (results.count === 0) throw new CustomError(400, 'No valid word pairs found in file (all already exist or invalid)');

            res.status(201).json({
                status: 'success',
                message: `${results.count} List Words inserted successfully from file`,
                insertedWords: results.insertedWords.length > 100
                    ? results.insertedWords.slice(0, 100)
                    : results.insertedWords
            });

        } catch (error: any) {
            const statusCode = error instanceof CustomError ? error.code : 500;
            res.status(statusCode).json({
                status: 'error',
                message: error.message
            });
        }
    }
];

// export const bulkInsertFromFileHandler = [
//     uploadSingleFile,
//     async (req: Request, res: Response): Promise<void> => {
//         try {
//             if (!req.file) {
//                 throw new CustomError(400, 'No file uploaded');
//             }

//             const ext = path.extname(req.file.originalname).toLowerCase();

//             let data: Array<{ [key: string]: string }>;

//             if (ext === '.csv') {
//                 // Jika CSV, langsung parsing CSV text dari buffer (as utf-8 string)
//                 const csvString = req.file.buffer.toString('utf-8');

//                 // Parse CSV ke JSON, misal pakai XLSX.utils
//                 const workbook = XLSX.read(csvString, { type: 'string' });
//                 const sheetName = workbook.SheetNames[0];
//                 const sheet = workbook.Sheets[sheetName];
//                 data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

//             } else if (ext === '.xlsx' || ext === '.xls') {
//                 // Parse file Excel
//                 const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
//                 const sheetName = workbook.SheetNames[0];
//                 const sheet = workbook.Sheets[sheetName];
//                 data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

//             } else {
//                 throw new CustomError(400, `Unsupported file type: ${ext}`);
//             }

//             if (!data || data.length === 0) {
//                 throw new CustomError(400, 'Empty or invalid file data');
//             }

//             const wordPairs = data
//                 .map(row => {
//                     const badWord = row['kata kotor']?.toString().trim();
//                     const goodWord = row['kata baik']?.toString().trim();
//                     if (!badWord || !goodWord) return null;
//                     return { word: badWord, substitute: goodWord };
//                 })
//                 .filter(item => item !== null) as { word: string; substitute: string }[];

//             if (wordPairs.length === 0) {
//                 throw new CustomError(400, 'No valid word pairs found in file');
//             }

//             const result = await listGoodWordsQueries.blukCreateGoodBadWords(wordPairs);

//             res.status(201).json({
//                 status: 'success',
//                 message: `${result.count} List Words inserted successfully from file`,
//                 insertedWords: result.insertedWords
//             });

//         } catch (error: any) {
//             const statusCode = error instanceof CustomError ? error.code : 500;
//             res.status(statusCode).json({
//                 status: 'error',
//                 message: error.message
//             });
//         }
//     }
// ];