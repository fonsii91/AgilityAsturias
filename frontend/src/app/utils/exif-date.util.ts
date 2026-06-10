/**
 * Extrae la fecha de captura (EXIF DateTimeOriginal) de un JPEG sin librerías externas.
 * La compresión por canvas descarta los metadatos, así que hay que leerla del original.
 * Devuelve 'YYYY-MM-DD' o null si no hay EXIF legible (PNG/WebP no suelen llevarlo).
 */
export async function extractExifDate(file: File): Promise<string | null> {
    try {
        // El bloque EXIF (APP1) está siempre al principio del fichero.
        const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
        const view = new DataView(buffer);

        if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
            return null; // No es un JPEG
        }

        let offset = 2;
        while (offset + 4 <= view.byteLength) {
            const marker = view.getUint16(offset);
            const size = view.getUint16(offset + 2);
            if ((marker & 0xFF00) !== 0xFF00) break;

            if (marker === 0xFFE1) { // APP1 (EXIF)
                const exifStart = offset + 4;
                if (getAscii(view, exifStart, 4) === 'Exif') {
                    const date = parseTiff(view, exifStart + 6);
                    if (date) return date;
                }
            }
            offset += 2 + size;
        }
        return null;
    } catch {
        return null;
    }
}

function parseTiff(view: DataView, tiffStart: number): string | null {
    if (tiffStart + 8 > view.byteLength) return null;

    const byteOrder = view.getUint16(tiffStart);
    const littleEndian = byteOrder === 0x4949;
    if (!littleEndian && byteOrder !== 0x4D4D) return null;

    const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
    const ifd0 = tiffStart + ifd0Offset;

    // En IFD0 buscamos el puntero al sub-IFD EXIF (0x8769) y DateTime (0x0132) como fallback
    let exifIfdPointer: number | null = null;
    let fallbackDate: string | null = null;

    const readEntries = (ifd: number, wantTag: number): string | null => {
        if (ifd + 2 > view.byteLength) return null;
        const count = view.getUint16(ifd, littleEndian);
        for (let i = 0; i < count; i++) {
            const entry = ifd + 2 + i * 12;
            if (entry + 12 > view.byteLength) return null;
            const tag = view.getUint16(entry, littleEndian);

            if (tag === 0x8769 && exifIfdPointer === null) {
                exifIfdPointer = view.getUint32(entry + 8, littleEndian);
            }
            if (tag === wantTag) {
                const valueOffset = tiffStart + view.getUint32(entry + 8, littleEndian);
                const raw = getAscii(view, valueOffset, 19); // 'YYYY:MM:DD HH:MM:SS'
                const match = raw.match(/^(\d{4}):(\d{2}):(\d{2})/);
                if (match) return `${match[1]}-${match[2]}-${match[3]}`;
            }
        }
        return null;
    };

    fallbackDate = readEntries(ifd0, 0x0132);

    if (exifIfdPointer !== null) {
        const original = readEntries(tiffStart + exifIfdPointer, 0x9003); // DateTimeOriginal
        if (original) return original;
    }

    return fallbackDate;
}

function getAscii(view: DataView, start: number, length: number): string {
    let out = '';
    for (let i = 0; i < length && start + i < view.byteLength; i++) {
        const code = view.getUint8(start + i);
        if (code === 0) break;
        out += String.fromCharCode(code);
    }
    return out;
}
