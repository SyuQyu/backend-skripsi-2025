import multer from 'multer';

// Setup multer storage di memory, bisa juga disk storage jika mau
const storage = multer.memoryStorage();

const upload = multer({ storage });

// Export middleware upload file tunggal dengan field 'file'
export const uploadSingleFile = upload.single('file');

// Jika butuh multiple, tinggal buat lagi:
// export const uploadMultipleFiles = upload.array('files', 10);

export default upload;