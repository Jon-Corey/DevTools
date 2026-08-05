import { initializeImageMagick, ImageMagick, MagickColor, AlphaAction, ColorSpace, ColorType, MagickGeometry, Gravity } from '/assets/js/vendor/magick/magick.js';
import { getFileExtension, getFileNameWithoutExtension, getSvgDimensions, convertSvgToPng } from '/assets/js/utils.js';

const magickWasmUrl = new URL('/assets/js/vendor/magick/magick.wasm', import.meta.url);
await initializeImageMagick(magickWasmUrl);

export const supportedInputFormats = ['aai', 'art', 'avif', 'avs', 'bmp', 'bmp2', 'bmp3', 'cin', 'cur', 'dcx', 'dds', 'dpx', 'dxt1', 'dxt5', 'exr', 'farbfeld', 'fax', 'ff', 'fits', 'fl32', 'fts', 'g3', 'gif', 'gif87', 'hdr', 'heic', 'heif', 'hrz', 'icb', 'ico', 'icon', 'ipl', 'j2c', 'j2k', 'jng', 'jp2', 'jpc', 'jpe', 'jpeg', 'jpg', 'jpm', 'jps', 'jxl', 'mat', 'miff', 'mng', 'mpo', 'mtv', 'otb', 'palm', 'pam', 'pbm', 'pcd', 'pcds', 'pct', 'pcx', 'pdb', 'pfm', 'pgm', 'pgx', 'phm', 'picon', 'pict', 'pjpeg', 'png', 'png00', 'png24', 'png32', 'png48', 'png64', 'png8', 'pnm', 'ppm', 'psb', 'psd', 'ptif', 'qoi', 'ras', 'sgi', 'six', 'sixel', 'sun', 'svg', 'tga', 'tiff', 'tiff64', 'txt', 'vda', 'vicar', 'viff', 'vips', 'vst', 'wbmp', 'webp', 'wpg', 'xbm', 'xpm', 'xv'];

/**
 * Uses ImageMagick to transform an image file according to the provided options.
 * @param {File} file The image file to transform.
 * @param {Object} options Transformation options.
 * @param {string} [options.fileName] The desired output file name without a file extension. If not provided, the original file name will be used.
 * @param {"PNG" | "JPEG" | "WEBP" | "GIF" | "AVIF" | "BMP" | "TIFF" | "ICO"} [options.format] The desired output format (e.g., 'png', 'jpeg', etc.). If not provided, the original format will be used if it is a supported output format. If the original format is not supported, 'PNG' will be used as the default. Case insensitive.
 * @param {number} [options.width] If provided, sets the width of the output image. If height is not provided, the height will be scaled to maintain the aspect ratio.
 * @param {number} [options.height] If provided, sets the height of the output image. If width is not provided, the width will be scaled to maintain the aspect ratio.
 * @param {boolean} [options.stretch] If width and height are both provided, this option determines whether to stretch the image to fit the specified dimensions (true) or maintain the aspect ratio and pad the remaining space (false). Default is false.
 * @param {string} [options.backgroundColor] A HEX, RGB, or HSL color string to use as the background color of the output image. If not provided, the background will be transparent. If the output format does not support transparency, the background will be black.
 * @param {number} [options.padding] A number between 0 and 49. The amount of padding to add around the image as a percentage. For example, a value of 10 on an image that is 200x200 pixels will result in the image being 160x160 pixels with 20 pixels of padding on each side. Default is 0 (no padding).
 * @param {number} [options.quality] The quality of the output image (1-100). Only applicable to lossy formats like JPEG and WebP. Default is 90.
 * @param {number[]} [options.sizes] An array of sizes to include when the output format is ICO. Each size should be a number representing the width and height in pixels (e.g., [16, 24, 32, 48, 64, 128, 256]). If not provided, the largest possible image size will be used without upscaling the source image.
 * @returns {Promise<File>} A promise that resolves to a transformed image file.
 */
export async function transformImage(file, options = {}) {
    const outputFormats = ['PNG', 'JPEG', 'WEBP', 'GIF', 'AVIF', 'BMP', 'TIFF', 'ICO'];
    const nonTransparentFormats = ['JPEG', 'BMP'];
    const qualityFormats = ['JPEG', 'WEBP', 'AVIF'];

    let sourceFormat = getFileExtension(file.name).toUpperCase();
    let destinationFormat = 'PNG';
    if (options.format && outputFormats.includes(options.format.toUpperCase())) {
        destinationFormat = options.format.toUpperCase();
    } else if (outputFormats.includes(sourceFormat)) {
        destinationFormat = sourceFormat;
    }
    const destinationMimeType = getMimeTypeForFormat(destinationFormat);

    let fileData;

    if (sourceFormat === 'SVG') {
        const dimensions = await getSvgDimensions(file);
        let width = dimensions.width;
        let height = dimensions.height;

        if (options.width && options.height) {
            width = options.width;
            height = options.height;
        } else if (options.width) {
            const scale = options.width / width;
            width = options.width;
            height = Math.ceil(height * scale);
        } else if (options.height) {
            const scale = options.height / height;
            width = Math.ceil(width * scale);
            height = options.height;
        }

        const pngFile = await convertSvgToPng(file, {
            width,
            height,
            stretch: options.stretch,
            backgroundColor: options.backgroundColor,
            padding: options.padding
        });
        fileData = new Uint8Array(await pngFile.arrayBuffer());
    } else {
        fileData = new Uint8Array(await file.arrayBuffer());
    }

    return await new Promise((resolve, reject) => {
        try {
            ImageMagick.read(fileData, (image) => {
                try {
                    // convertSvgToPng already handles sizing, background color, and padding for SVGs, so we only need to handle these for non-SVG images
                    if (sourceFormat !== 'SVG') {
                        if (options.padding) {
                            // Adding padding should not change the resolution of the image, so we need to scale down the image before extending it.
                            const padding = Math.max(0, Math.min(50, options.padding));
                            const paddingPixelsX = Math.round(image.width * (padding / 100));
                            const paddingPixelsY = Math.round(image.height * (padding / 100));
                            const newWidth = image.width - (paddingPixelsX * 2);
                            const newHeight = image.height - (paddingPixelsY * 2);

                            if (newWidth > 0 && newHeight > 0) {
                                image.resize(newWidth, newHeight);
                                const geometry = new MagickGeometry(image.width + (paddingPixelsX * 2), image.height + (paddingPixelsY * 2));
                                image.extent(geometry, Gravity.Center, new MagickColor(options.backgroundColor || '#000000'));
                            }
                        }

                        if (options.width && options.height) {
                            if (options.stretch) {
                                const geometry = new MagickGeometry(options.width, options.height);
                                geometry.ignoreAspectRatio = true;
                                image.resize(geometry);
                            } else {
                                const scale = Math.min(options.width / image.width, options.height / image.height);
                                const resizedWidth = Math.max(1, Math.round(image.width * scale));
                                const resizedHeight = Math.max(1, Math.round(image.height * scale));

                                image.resize(resizedWidth, resizedHeight);
                                const geometry = new MagickGeometry(options.width, options.height);
                                image.extent(geometry, Gravity.Center, new MagickColor(options.backgroundColor || '#00000000'));
                            }
                        } else if (options.width) {
                            image.resize(options.width, 0);
                        } else if (options.height) {
                            image.resize(0, options.height);
                        }

                        if (options.backgroundColor || nonTransparentFormats.includes(destinationFormat)) {
                            const backgroundColor = options.backgroundColor || '#000000';

                            if (image.colorSpace === ColorSpace.Gray
                                || image.colorSpace === ColorSpace.LinearGray
                                || image.colorSpace === ColorSpace.Transparent) {
                                // Normalize to sRGB to avoid issues with custom background color
                                image.colorSpace = ColorSpace.sRGB;
                            }
                            if (image.colorType === ColorType.Grayscale
                                || image.colorType === ColorType.GrayscaleAlpha
                                || image.colorType === ColorType.Bilevel
                                || image.colorType === ColorType.Palette
                                || image.colorType === ColorType.PaletteAlpha
                                || image.colorType === ColorType.PaletteBilevelAlpha
                                || image.colorType === ColorType.Optimize) {
                                // Normalize to TrueColorAlpha to avoid issues with custom background color
                                image.colorType = ColorType.TrueColorAlpha;
                            }

                            image.backgroundColor = new MagickColor(backgroundColor);
                            image.alpha(AlphaAction.Remove);
                        }
                    }

                    if (qualityFormats.includes(destinationFormat)) {
                        image.quality = options.quality || 90;
                    }

                    if (destinationFormat === 'ICO') {
                        let sizes = options.sizes || [];
                        sizes = sizes.filter(size => size > 0 && size <= 256 && size <= Math.min(image.width, image.height));
                        if (sizes.length === 0) {
                            const maxSize = Math.min(Math.max(image.width, image.height), 256);
                            sizes = [maxSize];
                        }
                        image.settings.setDefine('icon:auto-resize', sizes.join(','));
                    }

                    image.write(destinationFormat, (outputData) => {
                        let outputFileName = getFileNameWithoutExtension(file.name) + '.' + destinationFormat.toLowerCase();
                        if (options.fileName) {
                            outputFileName = options.fileName + '.' + destinationFormat.toLowerCase();
                        }

                        const outputFile = new File([outputData], outputFileName, { type: destinationMimeType });
                        resolve(outputFile);
                    });
                } catch (err) {
                    reject(err);
                }
            });
        } catch (err) {
            reject(err);
        }
    });

    function getMimeTypeForFormat(format) {
        const extension = format.toLowerCase();

        let mimeType = `image/${extension}`;
        if (extension === 'ico') {
            mimeType = 'image/x-icon';
        }
        return mimeType;
    }
}
