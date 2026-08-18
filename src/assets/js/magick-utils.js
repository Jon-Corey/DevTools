import { initializeImageMagick, ImageMagick, MagickColor, AlphaAction, ColorSpace, ColorType, MagickGeometry, Gravity, DitherMethod, QuantizeSettings, ErrorMetric, CompressionMethod, MagickFormat } from '/assets/js/vendor/magick/magick.js';
import { getFileExtension, getFileNameWithoutExtension, getSvgDimensions, convertSvgToPng } from '/assets/js/utils.js';

const magickWasmUrl = new URL('/assets/js/vendor/magick/magick.wasm', import.meta.url);
await initializeImageMagick(magickWasmUrl);

export const supportedInputFormats = ['aai', 'art', 'avif', 'avs', 'bmp', 'bmp2', 'bmp3', 'cin', 'cur', 'dcx', 'dds', 'dpx', 'dxt1', 'dxt5', 'exr', 'farbfeld', 'fax', 'ff', 'fits', 'fl32', 'fts', 'g3', 'gif', 'gif87', 'hdr', 'heic', 'heif', 'hrz', 'icb', 'ico', 'icon', 'ipl', 'j2c', 'j2k', 'jng', 'jp2', 'jpc', 'jpe', 'jpeg', 'jpg', 'jpm', 'jps', 'jxl', 'mat', 'miff', 'mng', 'mpo', 'mtv', 'otb', 'palm', 'pam', 'pbm', 'pcd', 'pcds', 'pct', 'pcx', 'pdb', 'pfm', 'pgm', 'pgx', 'phm', 'picon', 'pict', 'pjpeg', 'png', 'png00', 'png24', 'png32', 'png48', 'png64', 'png8', 'pnm', 'ppm', 'psb', 'psd', 'ptif', 'qoi', 'ras', 'sgi', 'six', 'sixel', 'sun', 'svg', 'tga', 'tiff', 'tiff64', 'txt', 'vda', 'vicar', 'viff', 'vips', 'vst', 'wbmp', 'webp', 'wpg', 'xbm', 'xpm', 'xv'];
const supportedOutputFormats = ['PNG', 'JPEG', 'WEBP', 'GIF', 'AVIF', 'BMP', 'TIFF', 'ICO'];

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
    const outputFormats = supportedOutputFormats;
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

    // If the source and destination formats are the same and no other options are provided, return the original file
    const optionsKeys = Object.keys(options);
    if (sourceFormat === destinationFormat && optionsKeys.length === 1 && optionsKeys[0] === 'format') {
        return file;
    }

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
            const callback = (image) => {
                function safeDispose(magickImage) {
                    try { magickImage?.dispose(); } catch {}
                }

                function settleResolve(value) {
                    safeDispose(image);
                    resolve(value);
                }

                function settleReject(err) {
                    safeDispose(image);
                    reject(err);
                }

                try {
                    // convertSvgToPng already handles sizing, background color, and padding for SVGs, so we only need to handle these for non-SVG images
                    if (sourceFormat !== 'SVG') {
                        if (options.padding) {
                            // Adding padding should not change the resolution of the image, so we need to scale down the image before extending it.
                            const padding = Math.max(0, Math.min(49, options.padding));
                            const paddingPixelsX = Math.round(image.width * (padding / 100));
                            const paddingPixelsY = Math.round(image.height * (padding / 100));
                            const newWidth = image.width - (paddingPixelsX * 2);
                            const newHeight = image.height - (paddingPixelsY * 2);

                            if (newWidth > 0 && newHeight > 0) {
                                image.resize(newWidth, newHeight);
                                const geometry = new MagickGeometry(image.width + (paddingPixelsX * 2), image.height + (paddingPixelsY * 2));
                                image.extent(geometry, Gravity.Center, new MagickColor(options.backgroundColor || '#00000000'));
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
                        let quality = options.quality;
                        if (quality === undefined || quality === null) {
                            quality = 90;
                        } else if (quality < 1) {
                            quality = 1;
                        } else if (quality > 100) {
                            quality = 100;
                        }
                        image.quality = quality;
                    }

                    if (destinationFormat === 'ICO') {
                        let sizes = options.sizes || [];
                        sizes = sizes.filter(size => size > 0 && size <= 256 && size <= Math.min(image.width, image.height));
                        if (sizes.length === 0) {
                            const maxSize = Math.min(image.width, image.height, 256);
                            sizes = [maxSize];
                        }
                        image.settings.setDefine('icon:auto-resize', sizes.join(','));
                    }

                    if (destinationFormat === 'TIFF') {
                        // TIFF has compression support built-in, so apply lossless compression
                        image.settings.compression = CompressionMethod.LZW;
                        image.settings.setDefine('tiff:predictor', '2');
                    }

                    image.write(destinationFormat, (outputData) => {
                        let outputFileName = getFileNameWithoutExtension(file.name) + '.' + destinationFormat.toLowerCase();
                        if (options.fileName) {
                            outputFileName = options.fileName + '.' + destinationFormat.toLowerCase();
                        }

                        const outputFile = new File([outputData], outputFileName, { type: destinationMimeType });
                        settleResolve(outputFile);
                    });
                } catch (err) {
                    settleReject(err);
                }
            };

            if (sourceFormat === 'ICO') {
                // Magick-WASM can't tell that an ICO file is an ICO file from the file headers, so we need to explicitly tell it that the input format is ICO.
                ImageMagick.read(fileData, MagickFormat.Ico, callback);
            } else {
                ImageMagick.read(fileData, callback);
            }
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

/**
 * Compresses an image file using lossy compression methods while trying to preserve visual quality.
 * @param {File} file The image file to compress. Supported formats are PNG, JPEG, WEBP, GIF, AVIF, BMP, TIFF, and ICO.
 * @returns {Promise<File>} The compressed image file, or the original file if compression did not reduce the size.
 */
export async function compressImage(file) {
    let format = getFileExtension(file.name).toUpperCase();
    if (format === 'JPG') format = 'JPEG';
    if (!supportedOutputFormats.includes(format)) {
        throw new Error(`Unsupported format: ${format}`);
    }

    switch (format) {
        case 'PNG':
            return await runCompression(file, compressionConfigs.PNG);
        case 'JPEG':
            return await runCompression(file, compressionConfigs.JPEG);
        case 'WEBP':
            return await runCompression(file, compressionConfigs.WEBP);
        case 'AVIF':
            return await runCompression(file, compressionConfigs.AVIF);
        case 'BMP':
            return await runCompression(file, compressionConfigs.BMP);
        case 'TIFF':
            return await runCompression(file, compressionConfigs.TIFF);
        case 'GIF':
            return await runCollectionCompression(file, compressionConfigs.GIF);
        case 'ICO':
            return await runCollectionCompression(file, compressionConfigs.ICO);
        default:
            throw new Error(`Compression not implemented for format: ${format}`);
    }
}

const compressionConfigs = {
    PNG: {
        format: MagickFormat.Png,
        mimeType: 'image/png',
        maxStructuralError: 0.003,
        errorBeyondFirstCandidate: true,
        successiveFailureLimit: 2,
        presets: [
            { colors: 256, ditherMethod: DitherMethod.No },
            { colors: 192, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 128, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 64, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 32, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 16, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 8, ditherMethod: DitherMethod.FloydSteinberg }
        ],
        applyPreset: (candidate, preset) => {
            const quantize = new QuantizeSettings();
            quantize.colors = preset.colors;
            quantize.colorSpace = ColorSpace.sRGB;
            quantize.ditherMethod = preset.ditherMethod;
            candidate.quantize(quantize);

            candidate.settings.setDefine('png:compression-level', 6);
            candidate.settings.setDefine('png:compression-filter', 5);
            candidate.settings.setDefine('png:compression-strategy', 1);
        }
    },
    JPEG: {
        format: MagickFormat.Jpeg,
        mimeType: 'image/jpeg',
        maxStructuralError: 0.02,
        presets: [
            { quality: 90 },
            { quality: 86 },
            { quality: 82 },
            { quality: 78 },
            { quality: 74 },
            { quality: 70 },
            { quality: 66 },
            { quality: 62 },
            { quality: 58 },
            { quality: 54 },
            { quality: 50 },
            { quality: 46 },
            { quality: 42 },
            { quality: 38 },
            { quality: 34 },
            { quality: 30 }
        ],
        applyPreset: (candidate, preset) => {
            candidate.quality = preset.quality;

            candidate.settings.setDefine('jpeg:optimize-coding', 'true');
            candidate.settings.setDefine('jpeg:dct-method', 'float');
            candidate.settings.setDefine('jpeg:sampling-factor', '2x2,1x1,1x1');
        }
    },
    WEBP: {
        format: MagickFormat.WebP,
        mimeType: 'image/webp',
        maxStructuralError: 0.02,
        presets: [
            { quality: 92 },
            { quality: 84 },
            { quality: 76 },
            { quality: 68 },
            { quality: 60 }
        ],
        applyPreset: (candidate, preset) => {
            candidate.quality = preset.quality;

            candidate.settings.setDefine('webp:method', '6');
            candidate.settings.setDefine('webp:thread-level', '0');
            candidate.settings.setDefine('webp:alpha-quality', String(preset.quality));
            candidate.settings.setDefine('webp:auto-filter', 'true');
            candidate.settings.setDefine('webp:use-sharp-yuv', 'false');
        }
    },
    AVIF: {
        format: MagickFormat.Avif,
        mimeType: 'image/avif',
        maxStructuralError: 0.02,
        presets: [
            { quality: 88, speed: 5 },
            { quality: 82, speed: 5 },
            { quality: 76, speed: 6 },
            { quality: 70, speed: 6 },
            { quality: 64, speed: 7 },
            { quality: 58, speed: 7 },
            { quality: 52, speed: 8 }
        ],
        applyPreset: (candidate, preset) => {
            candidate.quality = preset.quality;

            candidate.settings.setDefine('heic:speed', String(preset.speed));
            candidate.settings.setDefine('heic:chroma', '420');
            candidate.settings.setDefine('heic:auto-tiling', 'true');
        }
    },
    BMP: {
        format: MagickFormat.Bmp,
        mimeType: 'image/bmp',
        maxStructuralError: 0.01,
        successiveFailureLimit: 2,
        presets: [
            { colors: 256, ditherMethod: DitherMethod.No },
            { colors: 128, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 64, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 32, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 16, ditherMethod: DitherMethod.FloydSteinberg }
        ],
        applyPreset: (candidate, preset) => {
            const quantize = new QuantizeSettings();
            quantize.colors = preset.colors;
            quantize.colorSpace = ColorSpace.sRGB;
            quantize.ditherMethod = preset.ditherMethod;
            candidate.quantize(quantize);

            candidate.settings.setDefine('bmp:format', 'bmp3');
        }
    },
    TIFF: {
        format: MagickFormat.Tiff,
        mimeType: 'image/tiff',
        maxStructuralError: 0.02,
        presets: [
            { compression: CompressionMethod.Zip, predictor: '2' },
            { compression: CompressionMethod.LZW, predictor: '2' },
            { compression: CompressionMethod.JPEG, quality: 90 },
            { compression: CompressionMethod.JPEG, quality: 82 },
            { compression: CompressionMethod.JPEG, quality: 74 }
        ],
        applyPreset: (candidate, preset) => {
            candidate.settings.compression = preset.compression;

            if (preset.predictor) {
                candidate.settings.setDefine('tiff:predictor', preset.predictor);
            }

            if (preset.quality) {
                candidate.quality = preset.quality;
            }
        }
    },
    GIF: {
        // Collection format. Must use runCollectionCompression instead of runCompression.
        format: MagickFormat.Gif,
        mimeType: 'image/gif',
        maxStructuralError: 0.03,
        presets: [
            { colors: 256, ditherMethod: DitherMethod.No },
            { colors: 128, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 64, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 32, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 16, ditherMethod: DitherMethod.FloydSteinberg }
        ],
        applyPreset: (candidate, preset) => {
            candidate.coalesce();

            const quantize = new QuantizeSettings();
            quantize.colors = preset.colors;
            quantize.colorSpace = ColorSpace.sRGB;
            quantize.ditherMethod = preset.ditherMethod;
            candidate.quantize(quantize);

            candidate.optimizePlus();
            candidate.optimizeTransparency();
        }
    },
    ICO: {
        // Collection format. Must use runCollectionCompression instead of runCompression.
        format: MagickFormat.Ico,
        mimeType: 'image/x-icon',
        maxStructuralError: 0.003,
        presets: [
            { colors: 256, ditherMethod: DitherMethod.No },
            { colors: 128, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 64, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 32, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 16, ditherMethod: DitherMethod.FloydSteinberg },
            { colors: 8, ditherMethod: DitherMethod.FloydSteinberg }
        ],
        applyPreset: (candidate, preset) => {
            const quantize = new QuantizeSettings();
            quantize.colors = preset.colors;
            quantize.colorSpace = ColorSpace.sRGB;
            quantize.ditherMethod = preset.ditherMethod;
            candidate.quantize(quantize);
        }
    }
};

/**
 * A helper function that runs a compression process on an image file using ImageMagick, trying different presets and selecting the best candidate based on structural error and output size.
 * @param {File} file The image file to compress.
 * @param {Object} config The compression configuration to use.
 * @param {MagickFormat} config.format The output format.
 * @param {string} config.mimeType The MIME type of the output format.
 * @param {number} config.maxStructuralError The maximum acceptable structural error for the compressed image.
 * @param {boolean} [config.errorBeyondFirstCandidate] Whether the structural error is used as the error beyond zero or beyond the first candidate's structural error (e.g if maxStructuralError is 0.02 and the first candidate's structural error is 0.01, all subsequent candidates must have an error of no more than 0.03). Used for formats where structural error varies wildy from image to image. Default is false.
 * @param {number} [config.successiveFailureLimit] The number of successive candidates that can exceed the maxStructuralError before the compression process is stopped. Default is 1 (one failure ends the process).
 * @param {Array} config.presets An array of preset configurations to try for compression. Each preset is an object that will be passed to the config.applyPreset function to apply the preset to a candidate image. Can include any properties that the config.applyPreset function expects.
 * @param {function} config.applyPreset A function that applies a preset to a candidate image. It takes two arguments: the candidate image and the preset object. It should modify the candidate image in place to apply the preset.
 * @returns {Promise<File>} A promise that resolves to the compressed image file, or the original file if compression did not reduce the size.
 */
async function runCompression(file, config) {
    const fileData = new Uint8Array(await file.arrayBuffer());
    const originalSize = fileData.length;

    return await new Promise((resolve, reject) => {
        ImageMagick.read(fileData, config.format, (sourceImage) => {
            function safeDispose(magickImage) {
                try { magickImage?.dispose(); } catch {}
            }

            function settleResolve(value) {
                safeDispose(sourceImage);
                resolve(value);
            }

            function settleReject(err) {
                safeDispose(sourceImage);
                reject(err);
            }

            try {
                sourceImage.autoOrient();
                sourceImage.strip();

                let initialStructuralError = null;
                let bestCandidateData = null;

                function finish() {
                    if (bestCandidateData && bestCandidateData.length < originalSize) {
                        settleResolve(new File([bestCandidateData], file.name, { type: config.mimeType }));
                    } else {
                        settleResolve(file);
                    }
                }

                function runPreset(index, successiveFailures = 0) {
                    if (index >= config.presets.length || successiveFailures >= (config.successiveFailureLimit || 1)) {
                        finish();
                        return;
                    }

                    const preset = config.presets[index];
                    sourceImage.clone((candidate) => {
                        try {
                            config.applyPreset(candidate, preset);

                            candidate.write(config.format, (outputData) => {
                                try {
                                    const stableOutputData = new Uint8Array(outputData);

                                    if (stableOutputData.length >= originalSize || (bestCandidateData && stableOutputData.length >= bestCandidateData.length)) {
                                        safeDispose(candidate);
                                        runPreset(index + 1, successiveFailures); // Don't increment successiveFailures here because this is not a failure, just a non-improvement
                                        return;
                                    }

                                    ImageMagick.read(stableOutputData, config.format, (compressedImage) => {
                                        try {
                                            const structuralError = sourceImage.compare(compressedImage, ErrorMetric.StructuralSimilarity);
                                            if (initialStructuralError === null) {
                                                initialStructuralError = structuralError;
                                            }

                                            const errorThreshold = config.errorBeyondFirstCandidate ? initialStructuralError + config.maxStructuralError : config.maxStructuralError;

                                            if (structuralError <= errorThreshold) {
                                                if (!bestCandidateData || stableOutputData.length < bestCandidateData.length) {
                                                    bestCandidateData = stableOutputData;

                                                    safeDispose(compressedImage);
                                                    safeDispose(candidate);
                                                    runPreset(index + 1, 0);
                                                } else {
                                                    safeDispose(compressedImage);
                                                    safeDispose(candidate);
                                                    runPreset(index + 1, successiveFailures); // Don't increment successiveFailures here because this is not a failure, just a non-improvement
                                                }
                                            } else {
                                                safeDispose(compressedImage);
                                                safeDispose(candidate);
                                                runPreset(index + 1, successiveFailures + 1);
                                            }
                                        } catch (err) {
                                            safeDispose(compressedImage);
                                            safeDispose(candidate);
                                            settleReject(err);
                                            return;
                                        }
                                    });
                                } catch (err) {
                                    safeDispose(candidate);
                                    settleReject(err);
                                    return;
                                }
                            });
                        } catch (err) {
                            safeDispose(candidate);
                            settleReject(err);
                            return;
                        }
                    });
                }

                runPreset(0);
            } catch (err) {
                settleReject(err);
            }
        });
    });
}

/**
 * A helper function that runs a compression process on an image file using ImageMagick, trying different presets and selecting the best candidate based on structural error and output size. This function is specifically for formats that are collections of images (e.g., GIF, ICO).
 * @param {File} file The image file to compress.
 * @param {Object} config The compression configuration to use.
 * @param {MagickFormat} config.format The output format.
 * @param {string} config.mimeType The MIME type of the output format.
 * @param {number} config.maxStructuralError The maximum acceptable structural error for the compressed image.
 * @param {boolean} [config.errorBeyondFirstCandidate] Whether the structural error is used as the error beyond zero or beyond the first candidate's structural error (e.g if maxStructuralError is 0.02 and the first candidate's structural error is 0.01, all subsequent candidates must have an error of no more than 0.03). Used for formats where structural error varies wildy from image to image. Default is false.
 * @param {number} [config.successiveFailureLimit] The number of successive candidates that can exceed the maxStructuralError before the compression process is stopped. Default is 1 (one failure ends the process).
 * @param {Array} config.presets An array of preset configurations to try for compression. Each preset is an object that will be passed to the config.applyPreset function to apply the preset to a candidate image. Can include any properties that the config.applyPreset function expects.
 * @param {function} config.applyPreset A function that applies a preset to a candidate image. It takes two arguments: the candidate image and the preset object. It should modify the candidate image in place to apply the preset.
 * @returns {Promise<File>} A promise that resolves to the compressed image file, or the original file if compression did not reduce the size.
 */
async function runCollectionCompression(file, config) {
    const fileData = new Uint8Array(await file.arrayBuffer());
    const originalSize = fileData.length;

    return await new Promise((resolve, reject) => {
        ImageMagick.readCollection(fileData, config.format, (sourceCollection) => {
            function safeDispose(magickCollection) {
                try { magickCollection?.dispose(); } catch {}
            }

            function settleResolve(value) {
                safeDispose(sourceCollection);
                resolve(value);
            }

            function settleReject(err) {
                safeDispose(sourceCollection);
                reject(err);
            }

            try {
                let initialStructuralError = null;
                let bestCandidateData = null;

                function finish() {
                    if (bestCandidateData && bestCandidateData.length < originalSize) {
                        settleResolve(new File([bestCandidateData], file.name, { type: config.mimeType }));
                    } else {
                        settleResolve(file);
                    }
                }

                function runPreset(index, successiveFailures = 0) {
                    if (index >= config.presets.length || successiveFailures >= (config.successiveFailureLimit || 1)) {
                        finish();
                        return;
                    }

                    const preset = config.presets[index];
                    sourceCollection.clone((candidateCollection) => {
                        try {
                            config.applyPreset(candidateCollection, preset);

                            candidateCollection.write(config.format, (outputData) => {
                                try {
                                    const stableOutputData = new Uint8Array(outputData);

                                    if (stableOutputData.length >= originalSize || (bestCandidateData && stableOutputData.length >= bestCandidateData.length)) {
                                        safeDispose(candidateCollection);
                                        runPreset(index + 1, successiveFailures); // Don't increment successiveFailures here because this is not a failure, just a non-improvement
                                        return;
                                    }

                                    ImageMagick.readCollection(stableOutputData, config.format, (compressedCollection) => {
                                        try {
                                            const structuralError = sourceCollection[0].compare(compressedCollection[0], ErrorMetric.StructuralSimilarity);
                                            if (initialStructuralError === null) {
                                                initialStructuralError = structuralError;
                                            }

                                            const errorThreshold = config.errorBeyondFirstCandidate ? initialStructuralError + config.maxStructuralError : config.maxStructuralError;

                                            if (structuralError <= errorThreshold) {
                                                if (!bestCandidateData || stableOutputData.length < bestCandidateData.length) {
                                                    bestCandidateData = stableOutputData;

                                                    safeDispose(compressedCollection);
                                                    safeDispose(candidateCollection);
                                                    runPreset(index + 1, 0);
                                                } else {
                                                    safeDispose(compressedCollection);
                                                    safeDispose(candidateCollection);
                                                    runPreset(index + 1, successiveFailures); // Don't increment successiveFailures here because this is not a failure, just a non-improvement
                                                }
                                            } else {
                                                safeDispose(compressedCollection);
                                                safeDispose(candidateCollection);
                                                runPreset(index + 1, successiveFailures + 1);
                                            }
                                        } catch (err) {
                                            safeDispose(compressedCollection);
                                            safeDispose(candidateCollection);
                                            settleReject(err);
                                            return;
                                        }
                                    });
                                } catch (err) {
                                    safeDispose(candidateCollection);
                                    settleReject(err);
                                    return;
                                }
                            });
                        } catch (err) {
                            safeDispose(candidateCollection);
                            settleReject(err);
                            return;
                        }
                    });
                }

                runPreset(0);
            } catch (err) {
                settleReject(err);
            }
        });
    });
}
