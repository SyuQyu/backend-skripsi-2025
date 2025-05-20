import sharp from "sharp";
import path from "path";
import fs from "fs";

export async function compressAndSaveImage(
    buffer: Buffer,
    originalName: string,
    destFolder: string
): Promise<string> {
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const meta = await sharp(buffer).metadata();
    let format = meta.format ?? "jpg";

    // fallback for gif (sharp can't process gifs well)
    if (format === "gif") format = "png";

    let quality = 90;
    let compressedBuffer: Buffer;

    do {
        let pipeline = sharp(buffer);
        switch (format) {
            case "jpeg":
            case "jpg":
                pipeline = pipeline.jpeg({ quality });
                break;
            case "png":
                pipeline = pipeline.png({ quality, palette: true });
                break;
            case "webp":
                pipeline = pipeline.webp({ quality });
                break;
            case "avif":
                pipeline = pipeline.avif({ quality });
                break;
            default:
                pipeline = pipeline.jpeg({ quality });
                format = "jpg";
                break;
        }
        compressedBuffer = await pipeline.toBuffer();
        if (compressedBuffer.length <= 10 * 1024 * 1024) break;
        quality -= 10;
    } while (quality >= 10);

    fs.mkdirSync(destFolder, { recursive: true });

    const fileName = `${timestamp}-${baseName}.${format}`;
    const filePath = path.join(destFolder, fileName);

    fs.writeFileSync(filePath, compressedBuffer);

    return fileName;
}