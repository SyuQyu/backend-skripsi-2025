import { listGoodWordsQueries } from "../queries";
import { Request, Response } from "express";
import { CustomError } from "../handler/customErrorHandler";
import { uploadSingleFile } from "../middlewares/upload";
import path from "path";
import * as XLSX from 'xlsx';

export async function createListGoodWordsHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWordsData = req.body;
        const newListGoodWords = await listGoodWordsQueries.createListGoodWord(listGoodWordsData);
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

export async function getListGoodWordsByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const listGoodWords = await listGoodWordsQueries.getListGoodWordById(req.params.goodWordId);
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
        const updatedListGoodWords = await listGoodWordsQueries.updateListGoodWord(req.params.goodWordId, updatedListGoodWordsData);
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
        const deletedListGoodWords = await listGoodWordsQueries.deleteListGoodWord(req.params.goodWordId);
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
        const listGoodWords = await listGoodWordsQueries.getListGoodWords();
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
        const goodWord = await listGoodWordsQueries.getGoodWordbyWord(req.params.word);
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
            if (!req.file) {
                throw new CustomError(400, 'No file uploaded');
            }

            const ext = path.extname(req.file.originalname).toLowerCase();

            let data: Array<{ [key: string]: string }>;

            if (ext === '.csv') {
                // Jika CSV, langsung parsing CSV text dari buffer (as utf-8 string)
                const csvString = req.file.buffer.toString('utf-8');
                // Parse CSV ke JSON, misal pakai XLSX.utils
                const workbook = XLSX.read(csvString, { type: 'string' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            } else if (ext === '.xlsx' || ext === '.xls') {
                // Parse file Excel
                const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            } else {
                throw new CustomError(400, `Unsupported file type: ${ext}`);
            }

            if (!data || data.length === 0) {
                throw new CustomError(400, 'Empty or invalid file data');
            }

            // Penyesuaian agar bisa menerima format tabel seperti gambar
            const wordPairs = data
                .flatMap(row => {
                    // Ambil kolom utama (case-insensitive)
                    const badWordsRaw = row['Kata Kasar'] || row['kata kasar'] || row['kata kotor'] || row['Kata Kotor'] || '';
                    const slangRaw = row['Variasi Ejaan/Slang'] || row['variasi ejaan/slang'] || row['slang'] || '';
                    const goodWordRaw = row['Padanan Kata Halus'] || row['padanan kata halus'] || row['kata baik'] || row['Kata Baik'] || '';

                    // Gabungkan kata kasar utama dan semua slang (masuk sebagai kata kasar)
                    // Pisahkan dengan koma, trim, dan filter kosong
                    const badWordsArr = [
                        ...(badWordsRaw ? badWordsRaw.split(',') : []),
                        ...(slangRaw ? slangRaw.split(',') : [])
                    ]
                        .map(w => w.trim())
                        .filter(Boolean);

                    // Padanan kata halus bisa lebih dari satu, ambil semua
                    const substitutesArr = goodWordRaw
                        ? goodWordRaw.split(',').map(w => w.trim()).filter(Boolean)
                        : [];

                    // Untuk setiap kata kasar/slang, buat entry untuk setiap padanan kata halus
                    const pairs: { word: string; substitute: string }[] = [];
                    for (const word of badWordsArr) {
                        for (const substitute of substitutesArr) {
                            pairs.push({ word, substitute });
                        }
                    }
                    return pairs;
                })
                .filter(item => item.word && item.substitute);

            if (wordPairs.length === 0) {
                throw new CustomError(400, 'No valid word pairs found in file');
            }

            const result = await listGoodWordsQueries.blukCreateGoodBadWords(wordPairs);

            res.status(201).json({
                status: 'success',
                message: `${result.count} List Words inserted successfully from file`,
                insertedWords: result.insertedWords
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