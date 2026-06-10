import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ImageCompressorService {

    constructor() { }

    compress(file: File, options?: { maxDimension?: number; quality?: number; forceWebp?: boolean; suffix?: string }): Promise<File> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event: any) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject('Canvas context not available');

                    // Max dimensions
                    const MAX_WIDTH = options?.maxDimension ?? 800;
                    const MAX_HEIGHT = options?.maxDimension ?? 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
                    const outputType = (options?.forceWebp || isTransparent) ? 'image/webp' : 'image/jpeg';
                    const ext = outputType === 'image/webp' ? '.webp' : '.jpg';

                    canvas.toBlob((blob) => {
                        if (!blob) return reject('Compression failed');
                        const newFilename = file.name.replace(/\.[^/.]+$/, "") + (options?.suffix ?? '') + ext;
                        const compressedFile = new File([blob], newFilename, {
                            type: outputType,
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    }, outputType, options?.quality ?? 0.8);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    }
}
