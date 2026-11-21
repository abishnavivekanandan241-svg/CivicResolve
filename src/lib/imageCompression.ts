/**
 * Client-side image compression and validation utility.
 * - Enforces 5MB raw file limit.
 * - Resizes images to max 1280px maintaining aspect ratio.
 * - Compresses output to ~150-300KB JPEG Data URL to ensure safe database storage & fast payloads.
 */

export const MAX_RAW_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function validateAndCompressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    // 1. Enforce 5MB limit
    if (file.size > MAX_RAW_FILE_SIZE) {
      return reject(
        new Error(
          `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`
        )
      );
    }

    // SVG files can be read directly
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
      return;
    }

    const { maxWidth = 1280, maxHeight = 1280, quality = 0.75 } = options;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not initialize canvas context'));
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));

    reader.readAsDataURL(file);
  });
}
