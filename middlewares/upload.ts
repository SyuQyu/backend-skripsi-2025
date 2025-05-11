import multer from 'multer';
import path from 'path';

// Setup multer storage for profile and background pictures
const storageProfileBg = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profile-bg/'); // Directory for profile and background pictures
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${uniqueSuffix}-${file.originalname}`;
        cb(null, filename);
    }
});

// Create multer instance for profile and background picture uploads
export const uploadProfileBg = multer({ storage: storageProfileBg }).fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'backgroundPicture', maxCount: 1 }
]);

// Setup memory storage for bulk file uploads
const storageBulk = multer.memoryStorage();
export const uploadBulkFiles = multer({ storage: storageBulk }).array('files', 10); // Adjust max count as needed

// Setup original memory storage for single file uploads if needed
const memoryStorage = multer.memoryStorage();
export const uploadSingleFile = multer({ storage: memoryStorage }).single('file');

// Default export for possibly reused configurations
export default {
    uploadProfileBg,
    uploadBulkFiles,
    uploadSingleFile
};