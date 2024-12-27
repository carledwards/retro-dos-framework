import { VideoBuffer } from '../../src/video';
import GIF from 'gif.js';

// Input elements
const imageInput = document.getElementById('imageInput') as HTMLInputElement;

// GIF elements
const gifStartSizeInput = document.getElementById('gifStartSize') as HTMLInputElement;
const gifEndSizeInput = document.getElementById('gifEndSize') as HTMLInputElement;
const gifFrameCountInput = document.getElementById('gifFrameCount') as HTMLInputElement;
const gifAnimationTypeSelect = document.getElementById('gifAnimationType') as HTMLSelectElement;
const gifDelayInput = document.getElementById('gifDelay') as HTMLInputElement;
const gifLoopPauseInput = document.getElementById('gifLoopPause') as HTMLInputElement;
const gifTimingCurveSelect = document.getElementById('gifTimingCurve') as HTMLSelectElement;
const gifColorPaletteSelect = document.getElementById('gifColorPalette') as HTMLSelectElement;
const gifColorModeSelect = document.getElementById('gifColorMode') as HTMLSelectElement;
const gifPreviewCanvas = document.getElementById('gifPreview') as HTMLCanvasElement;
// Add event listeners for GIF preview actions
const gifPreviewContainer = document.querySelector('.gif-preview') as HTMLElement;
const gifSaveBtn = gifPreviewContainer.querySelector('.save-gif') as HTMLElement;
const saveFormatSelect = document.getElementById('saveFormat') as HTMLSelectElement;

// GIF state
let generatedFrames: ImageData[] = [];
let previewInterval: number | null = null;

// Get the canvas elements and their overlays
const fullImageCanvas = document.getElementById('fullImage') as HTMLCanvasElement;
const fullCanvas = document.getElementById('screenFull') as HTMLCanvasElement;
const canvas256 = document.getElementById('screen256') as HTMLCanvasElement;
const canvas16 = document.getElementById('screen16') as HTMLCanvasElement;
const fullCanvasBW = document.getElementById('screenFullBW') as HTMLCanvasElement;
const canvas256BW = document.getElementById('screen256BW') as HTMLCanvasElement;
const canvas16BW = document.getElementById('screen16BW') as HTMLCanvasElement;

const fullImageCtx = fullImageCanvas.getContext('2d', { willReadFrequently: true })!;
const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true })!;
const ctx256 = canvas256.getContext('2d', { willReadFrequently: true })!;
const ctx16 = canvas16.getContext('2d', { willReadFrequently: true })!;
const fullCtxBW = fullCanvasBW.getContext('2d', { willReadFrequently: true })!;
const ctx256BW = canvas256BW.getContext('2d', { willReadFrequently: true })!;
const ctx16BW = canvas16BW.getContext('2d', { willReadFrequently: true })!;

// Get rendering overlays
const canvasConfigs = [
    { canvas: fullCanvas, buffer: null as VideoBuffer | null, overlay: fullCanvas.parentElement?.querySelector('.rendering-overlay') as HTMLElement },
    { canvas: canvas256, buffer: null as VideoBuffer | null, overlay: canvas256.parentElement?.querySelector('.rendering-overlay') as HTMLElement },
    { canvas: canvas16, buffer: null as VideoBuffer | null, overlay: canvas16.parentElement?.querySelector('.rendering-overlay') as HTMLElement },
    { canvas: fullCanvasBW, buffer: null as VideoBuffer | null, overlay: fullCanvasBW.parentElement?.querySelector('.rendering-overlay') as HTMLElement },
    { canvas: canvas256BW, buffer: null as VideoBuffer | null, overlay: canvas256BW.parentElement?.querySelector('.rendering-overlay') as HTMLElement },
    { canvas: canvas16BW, buffer: null as VideoBuffer | null, overlay: canvas16BW.parentElement?.querySelector('.rendering-overlay') as HTMLElement }
];

// Get controls
const gridSizeInput = document.getElementById('gridSize') as HTMLInputElement;
let gridSize = parseInt(gridSizeInput.value);

// Store original image and selection state
let originalImage: HTMLImageElement | null = null;
let selectionBox = document.querySelector('.selection-box') as HTMLElement;
let isDragging = false;
let isResizing = false;
let currentHandle: HTMLElement | null = null;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let startLeft = 0;
let startTop = 0;

// Track processing state
let processingTimeout: number | null = null;
let isProcessing = false;
let currentProcessingIndex = -1;
let shouldCancelProcessing = false;
let renderLock = false;

// DOS 16-color palette (RGB values)
const DOS_PALETTE = [
    [0x00, 0x00, 0x00], // Black
    [0x00, 0x00, 0xaa], // Blue
    [0x00, 0xaa, 0x00], // Green
    [0x00, 0xaa, 0xaa], // Cyan
    [0xaa, 0x00, 0x00], // Red
    [0xaa, 0x00, 0xaa], // Magenta
    [0xaa, 0x55, 0x00], // Brown
    [0xaa, 0xaa, 0xaa], // Light Gray
    [0x55, 0x55, 0x55], // Dark Gray
    [0x55, 0x55, 0xff], // Light Blue
    [0x55, 0xff, 0x55], // Light Green
    [0x55, 0xff, 0xff], // Light Cyan
    [0xff, 0x55, 0x55], // Light Red
    [0xff, 0x55, 0xff], // Light Magenta
    [0xff, 0xff, 0x55], // Yellow
    [0xff, 0xff, 0xff]  // White
];

// Generate 16-bit color palette (RGB565)
function generate16BitPalette(): number[][] {
    const palette: number[][] = [];
    for (let r = 0; r < 32; r++) {
        const red = Math.round((r * 255) / 31);
        for (let g = 0; g < 64; g++) {
            const green = Math.round((g * 255) / 63);
            for (let b = 0; b < 32; b++) {
                const blue = Math.round((b * 255) / 31);
                palette.push([red, green, blue]);
            }
        }
    }
    return palette;
}

// Generate 256-color palette (6x6x6 color cube + 40 grayscale)
function generate256ColorPalette(): number[][] {
    const palette: number[][] = [];
    // Add 216 color cube (6x6x6)
    for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
            for (let b = 0; b < 6; b++) {
                palette.push([
                    Math.round(r * 51),
                    Math.round(g * 51),
                    Math.round(b * 51)
                ]);
            }
        }
    }
    // Add 40 grayscale ramp values
    for (let i = 0; i < 40; i++) {
        const value = Math.round((i * 255) / 39);
        palette.push([value, value, value]);
    }
    return palette;
}

const PALETTE_16BIT = generate16BitPalette();
const PALETTE_256 = generate256ColorPalette();

// Function to get selected palette
function getSelectedPalette(): number[][] {
    const paletteType = gifColorPaletteSelect.value;
    switch (paletteType) {
        case '16bit':
            return PALETTE_16BIT;
        case '256':
            return PALETTE_256;
        case '16':
            return DOS_PALETTE;
        default:
            return DOS_PALETTE;
    }
}

// Function to convert color to grayscale
function toGrayscale(r: number, g: number, b: number): number {
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

// Function to find closest color in palette
function findClosestColor(r: number, g: number, b: number, palette: number[][], isGrayscale: boolean = false): number {
    if (isGrayscale) {
        const gray = toGrayscale(r, g, b);
        r = g = b = gray;
    }

    // Fast path for 16-bit color palette (RGB565)
    if (palette.length === 65536) {
        // Convert to 5-6-5 bits
        const r5 = Math.round((r * 31) / 255);  // 5 bits for red (0-31)
        const g6 = Math.round((g * 63) / 255);  // 6 bits for green (0-63)
        const b5 = Math.round((b * 31) / 255);  // 5 bits for blue (0-31)
        
        // Calculate palette index: R5G6B5 format
        // R shifts up by 11 bits (6+5)
        // G shifts up by 5 bits
        // B stays at lowest 5 bits
        return (r5 << 11) | (g6 << 5) | b5;
    }

    // Original algorithm for other palettes
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < palette.length; i++) {
        const [pr, pg, pb] = palette[i];
        const distance = Math.sqrt(
            Math.pow(r - pr, 2) +
            Math.pow(g - pg, 2) +
            Math.pow(b - pb, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }

    return closestIndex;
}

// Function to calculate frame delay based on timing curve and resolution
function calculateFrameDelay(baseDelay: number, currentSize: number, maxSize: number): number {
    const timingCurve = gifTimingCurveSelect.value;
    const t = currentSize / maxSize; // Normalized size (0 to 1)
    
    switch (timingCurve) {
        case 'linear':
            // Linear scaling: slower at lower resolutions
            return baseDelay * (2 - t);
        case 'curved':
            // Exponential curve: much slower at lower resolutions
            return baseDelay * (1 + (1 - t) * (1 - t));
        default:
            // Fixed time
            return baseDelay;
    }
}

// Function to interpolate between two numbers
function interpolate(start: number, end: number, t: number): number {
    return Math.round(start + (end - start) * t);
}

// Function to get relative coordinates within the container
function getRelativeCoords(e: MouseEvent) {
    const container = fullImageCanvas.getBoundingClientRect();
    return {
        x: e.clientX - container.left,
        y: e.clientY - container.top
    };
}

// Function to constrain selection box within image bounds
function constrainSelection(left: number, top: number, size: number) {
    const containerWidth = fullImageCanvas.width;
    const containerHeight = fullImageCanvas.height;
    const scale = fullImageCanvas.getBoundingClientRect().width / containerWidth;

    left = Math.max(0, Math.min(left, containerWidth * scale - size));
    top = Math.max(0, Math.min(top, containerHeight * scale - size));

    return { left, top };
}

// Function to update selection box position and size
function updateSelectionBox(left: number, top: number, size: number) {
    const { left: constrainedLeft, top: constrainedTop } = constrainSelection(left, top, size);
    selectionBox.style.left = `${constrainedLeft}px`;
    selectionBox.style.top = `${constrainedTop}px`;
    selectionBox.style.width = `${size}px`;
    selectionBox.style.height = `${size}px`;
}

// Function to initialize selection box size and position
function initializeSelectionBox() {
    if (!originalImage) return;

    const containerRect = fullImageCanvas.getBoundingClientRect();
    const size = Math.min(containerRect.width, containerRect.height);
    const left = (containerRect.width - size) / 2;
    const top = (containerRect.height - size) / 2;

    updateSelectionBox(left, top, size);
}

// Function to show rendering overlay
function showRenderingOverlay(overlay: HTMLElement) {
    overlay.classList.add('active');
}

// Function to hide rendering overlay
function hideRenderingOverlay(overlay: HTMLElement) {
    overlay.classList.remove('active');
}

// Function to process a single canvas
async function processCanvas(
    imageData: ImageData,
    buffer: VideoBuffer,
    ctx: CanvasRenderingContext2D,
    palette: number[][],
    isGrayscale: boolean,
    overlay: HTMLElement
): Promise<void> {
    return new Promise((resolve, reject) => {
        showRenderingOverlay(overlay);

        // Process in chunks to avoid blocking
        let y = 0;
        const chunkSize = 8; // Process 8 rows at a time

        function processChunk() {
            // Check if processing should be cancelled
            if (shouldCancelProcessing) {
                hideRenderingOverlay(overlay);
                reject(new Error('Processing cancelled'));
                return;
            }

            const endY = Math.min(y + chunkSize, gridSize);

            for (; y < endY; y++) {
                for (let x = 0; x < gridSize; x++) {
                    const i = (y * gridSize + x) * 4;
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];

                    const colorIndex = findClosestColor(r, g, b, palette, isGrayscale);
                    buffer.writeChar(x, y, ' ', {
                        foreground: 0,
                        background: colorIndex
                    });
                }
            }

            if (y < gridSize) {
                // Schedule next chunk
                requestAnimationFrame(processChunk);
            } else {
                // Finished processing
                if (!shouldCancelProcessing) {
                    renderBuffer(buffer, ctx, palette);
                }
                hideRenderingOverlay(overlay);
                resolve();
            }
        }

        processChunk();
    });
}

// Function to render buffer to canvas
function renderBuffer(buffer: VideoBuffer, ctx: CanvasRenderingContext2D, palette: number[][], size?: number) {
    const { cells } = buffer.getBufferData();
    const renderSize = size || gridSize;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    for (let y = 0; y < renderSize; y++) {
        if (!cells[y]) continue; // Skip if row doesn't exist
        for (let x = 0; x < renderSize; x++) {
            const cell = cells[y][x];
            if (cell && cell.attributes && typeof cell.attributes.background === 'number') {
                const color = palette[cell.attributes.background];
                if (color) {
                    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
}

// Function to process selected area
async function processSelectedArea() {
    if (!originalImage) return;

    const containerRect = fullImageCanvas.getBoundingClientRect();
    const scale = fullImageCanvas.width / containerRect.width;
    
    const selectionRect = selectionBox.getBoundingClientRect();
    const containerRelativeRect = {
        left: (selectionRect.left - containerRect.left) * scale,
        top: (selectionRect.top - containerRect.top) * scale,
        width: selectionRect.width * scale,
        height: selectionRect.height * scale
    };

    // Create temporary canvas for selection
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;

    // Draw selected area to temp canvas
    tempCtx.drawImage(
        fullImageCanvas,
        containerRelativeRect.left,
        containerRelativeRect.top,
        containerRelativeRect.width,
        containerRelativeRect.height,
        0,
        0,
        gridSize,
        gridSize
    );

    // Get image data for processing
    const imageData = tempCtx.getImageData(0, 0, gridSize, gridSize);

    // Process each canvas sequentially
    for (let i = 0; i < canvasConfigs.length; i++) {
        if (shouldCancelProcessing) break;
        
        const config = canvasConfigs[i];
        if (config.buffer) {
            const palette = i % 3 === 0 ? PALETTE_16BIT :
                          i % 3 === 1 ? PALETTE_256 :
                          DOS_PALETTE;
            const isGrayscale = i >= 3; // Last three canvases are B/W
            try {
                await processCanvas(
                    imageData,
                    config.buffer,
                    config.canvas.getContext('2d', { willReadFrequently: true })!,
                    palette,
                    isGrayscale,
                    config.overlay
                );
                // Small delay between canvases
                if (i < canvasConfigs.length - 1 && !shouldCancelProcessing) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                if ((error as Error).message === 'Processing cancelled') {
                    break;
                }
                throw error;
            }
        }
    }
}

// Function to set default GIF settings
function setDefaultGifSettings() {
    gifColorPaletteSelect.value = '256';  // 256 colors
    gifColorModeSelect.value = 'bw';      // Black & White
    gifTimingCurveSelect.value = 'curved'; // Curved timing
    gifStartSizeInput.value = '4';        // Starting size: 4
    gifEndSizeInput.value = '128';        // Ending size: 128
    gifFrameCountInput.value = '20';      // Frame count: 20
    gifAnimationTypeSelect.value = 'loop'; // Animation: Loop
    gifLoopPauseInput.value = '2000';     // Long pause: 2000ms
}

// Function to auto-preview GIF
async function autoPreviewGif() {
    const startSize = parseInt(gifStartSizeInput.value);
    const endSize = parseInt(gifEndSizeInput.value);
    const frameCount = parseInt(gifFrameCountInput.value);
    const delay = parseInt(gifDelayInput.value);
    const type = gifAnimationTypeSelect.value;

    generatedFrames = await generateGifFrames(startSize, endSize, frameCount);
    showPreview(generatedFrames, delay, type);
}

// Function to process image data
function processImage(img: HTMLImageElement) {
    // Store original image for reprocessing
    originalImage = img;

    // Set full image canvas size and draw original
    const aspectRatio = img.width / img.height;
    fullImageCanvas.width = 800;
    fullImageCanvas.height = Math.round(800 / aspectRatio);
    fullImageCtx.drawImage(img, 0, 0, fullImageCanvas.width, fullImageCanvas.height);

    // Initialize selection box
    initializeSelectionBox();
    
    // Schedule sample processing
    scheduleSampleProcessing();

    // Set default GIF settings and auto-preview
    setDefaultGifSettings();
    setTimeout(autoPreviewGif, 1500); // Delay to allow sample processing to complete
}

// Function to handle image import
function handleImageImport(file: File) {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
        if (e.target?.result) {
            img.src = e.target.result as string;
            img.onload = () => processImage(img);
        }
    };

    reader.readAsDataURL(file);
}

// Function to schedule sample processing
function scheduleSampleProcessing() {
    // Cancel any pending processing
    if (processingTimeout !== null) {
        window.clearTimeout(processingTimeout);
        processingTimeout = null;
    }

    // Set cancel flag to stop any in-progress processing
    shouldCancelProcessing = true;

    // Schedule new processing after delay
    processingTimeout = window.setTimeout(async () => {
        if (renderLock) return;
        
        // Reset cancel flag and set processing lock
        shouldCancelProcessing = false;
        renderLock = true;
        isProcessing = true;

        try {
            await processSelectedArea();
        } catch (error) {
            if ((error as Error).message !== 'Processing cancelled') {
                console.error('Processing error:', error);
            }
        } finally {
            isProcessing = false;
            renderLock = false;
            processingTimeout = null;
        }
    }, 1000);
}

// Initialize buffers
function initializeBuffers() {
    // Set canvas sizes
    [fullCanvas, canvas256, canvas16, fullCanvasBW, canvas256BW, canvas16BW].forEach(canvas => {
        canvas.width = gridSize;
        canvas.height = gridSize;
    });

    // Create new buffers
    canvasConfigs[0].buffer = new VideoBuffer(gridSize, gridSize);
    canvasConfigs[1].buffer = new VideoBuffer(gridSize, gridSize);
    canvasConfigs[2].buffer = new VideoBuffer(gridSize, gridSize);
    canvasConfigs[3].buffer = new VideoBuffer(gridSize, gridSize);
    canvasConfigs[4].buffer = new VideoBuffer(gridSize, gridSize);
    canvasConfigs[5].buffer = new VideoBuffer(gridSize, gridSize);

    // Fill buffers with initial black background and hide cursors
    canvasConfigs.forEach(config => {
        if (config.buffer) {
            config.buffer.clear();
            config.buffer.setCursorVisible(false);
        }
    });
}

// Function to render all canvases
function render() {
    canvasConfigs.forEach((config, index) => {
        if (config.buffer) {
            const palette = index % 3 === 0 ? PALETTE_16BIT :
                           index % 3 === 1 ? PALETTE_256 :
                           DOS_PALETTE;
            renderBuffer(config.buffer, config.canvas.getContext('2d', { willReadFrequently: true })!, palette);
        }
    });
}

// Function to generate frames for GIF
async function generateGifFrames(
    startSize: number,
    endSize: number,
    frameCount: number
): Promise<ImageData[]> {
    const selectedPalette = getSelectedPalette();
    const isGrayscale = gifColorModeSelect.value === 'bw';
    const frames: ImageData[] = [];

    // Create a canvas for the final output (256x256)
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 256;
    outputCanvas.height = 256;
    const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true })!;
    outputCtx.imageSmoothingEnabled = false; // Keep pixelated look

    // Get the selected area from the original image
    const containerRect = fullImageCanvas.getBoundingClientRect();
    const scale = fullImageCanvas.width / containerRect.width;
    const selectionRect = selectionBox.getBoundingClientRect();
    const containerRelativeRect = {
        left: (selectionRect.left - containerRect.left) * scale,
        top: (selectionRect.top - containerRect.top) * scale,
        width: selectionRect.width * scale,
        height: selectionRect.height * scale
    };

    for (let i = 0; i < frameCount; i++) {
        const t = i / (frameCount - 1);
        const currentSize = interpolate(startSize, endSize, t);
        
        // Create a canvas at the current grid size
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = currentSize;
        gridCanvas.height = currentSize;
        const gridCtx = gridCanvas.getContext('2d', { willReadFrequently: true })!;

        // Draw the selected area at the current grid size
        gridCtx.drawImage(
            fullImageCanvas,
            containerRelativeRect.left,
            containerRelativeRect.top,
            containerRelativeRect.width,
            containerRelativeRect.height,
            0,
            0,
            currentSize,
            currentSize
        );

        // Create a buffer at the current size
        const buffer = new VideoBuffer(currentSize, currentSize);
        const imageData = gridCtx.getImageData(0, 0, currentSize, currentSize);

        // Process with selected palette at current grid size
        for (let y = 0; y < currentSize; y++) {
            for (let x = 0; x < currentSize; x++) {
                const i = (y * currentSize + x) * 4;
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];

                const colorIndex = findClosestColor(r, g, b, selectedPalette, isGrayscale);
                buffer.writeChar(x, y, ' ', {
                    foreground: 0,
                    background: colorIndex
                });
            }
        }

        // Create a canvas at the current size for the processed image
        const processedCanvas = document.createElement('canvas');
        processedCanvas.width = currentSize;
        processedCanvas.height = currentSize;
        const processedCtx = processedCanvas.getContext('2d', { willReadFrequently: true })!;

        // Render the processed image at current size
        renderBuffer(buffer, processedCtx, selectedPalette, currentSize);

        // Scale up to 256x256 with pixelated rendering
        outputCtx.clearRect(0, 0, 256, 256);
        outputCtx.drawImage(processedCanvas, 0, 0, 256, 256);
        
        frames.push(outputCtx.getImageData(0, 0, 256, 256));
    }

    return frames;
}

// Function to show preview animation
function showPreview(frames: ImageData[], baseDelay: number, type: string) {
    const ctx = gifPreviewCanvas.getContext('2d', { willReadFrequently: true })!;
    let forward = true;
    let frameIndex = 0;
    let pauseCount = 0;
    const loopPause = parseInt(gifLoopPauseInput.value);

    if (previewInterval !== null) {
        window.clearInterval(previewInterval);
    }

    previewInterval = window.setInterval(() => {
        // If we're pausing between loops
        if (pauseCount > 0) {
            pauseCount--;
            return;
        }

        ctx.putImageData(frames[frameIndex], 0, 0);
        const currentSize = interpolate(
            parseInt(gifStartSizeInput.value),
            parseInt(gifEndSizeInput.value),
            frameIndex / (frames.length - 1)
        );
        const delay = calculateFrameDelay(baseDelay, currentSize, parseInt(gifEndSizeInput.value));

        if (type === 'once') {
            frameIndex = (frameIndex + 1) % frames.length;
            if (frameIndex === 0) {
                window.clearInterval(previewInterval!);
                previewInterval = null;
            }
        } else if (type === 'loop') {
            frameIndex = (frameIndex + 1) % frames.length;
            if (frameIndex === 0 && loopPause > 0) {
                pauseCount = Math.floor(loopPause / delay);
            }
        } else if (type === 'bounce') {
            if (forward) {
                frameIndex++;
                if (frameIndex >= frames.length - 1) {
                    forward = false;
                    if (loopPause > 0) {
                        pauseCount = Math.floor(loopPause / delay);
                    }
                }
            } else {
                frameIndex--;
                if (frameIndex <= 0) {
                    forward = true;
                    if (loopPause > 0) {
                        pauseCount = Math.floor(loopPause / delay);
                    }
                }
            }
        }
    }, baseDelay);
}

// Function to create and save GIF
function createGif(frames: ImageData[], baseDelay: number, type: string, filename: string) {
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: 256,
        height: 256,
        workerScript: 'gif.worker.js',
        repeat: type === 'once' ? 1 : 0 // 0 for infinite loop, 1 for single play
    });

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const loopPause = parseInt(gifLoopPauseInput.value);
    const startSize = parseInt(gifStartSizeInput.value);
    const endSize = parseInt(gifEndSizeInput.value);

    // Function to add a frame with proper delay
    const addFrame = (frame: ImageData, progress: number) => {
        ctx.putImageData(frame, 0, 0);
        const currentSize = interpolate(startSize, endSize, progress);
        const frameDelay = calculateFrameDelay(baseDelay, currentSize, endSize);
        gif.addFrame(canvas, { delay: frameDelay, copy: true });
    };

    // Add frames based on animation type
    if (type === 'bounce') {
        // Forward frames
        frames.forEach((frame, i) => {
            addFrame(frame, i / (frames.length - 1));
        });
        
        // Add pause at end if specified
        if (loopPause > 0) {
            ctx.putImageData(frames[frames.length - 1], 0, 0);
            gif.addFrame(canvas, { delay: loopPause, copy: true });
        }
        
        // Backward frames (excluding first and last to avoid duplicates)
        for (let i = frames.length - 2; i > 0; i--) {
            addFrame(frames[i], i / (frames.length - 1));
        }
        
        // Add pause at start if specified
        if (loopPause > 0) {
            ctx.putImageData(frames[0], 0, 0);
            gif.addFrame(canvas, { delay: loopPause, copy: true });
        }
    } else {
        // Once or loop
        frames.forEach((frame, i) => {
            addFrame(frame, i / (frames.length - 1));
            
            // Add pause at the end of sequence if specified
            if (loopPause > 0 && i === frames.length - 1) {
                ctx.putImageData(frame, 0, 0);
                gif.addFrame(canvas, { delay: loopPause, copy: true });
            }
        });
    }

    gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });

    gif.render();
}

// Event handlers
imageInput.addEventListener('change', (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files[0]) {
        handleImageImport(files[0]);
    }
});

// Debug mode check
const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true';

document.addEventListener('paste', (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) {
        isDebugMode && console.log('No clipboard data items found');
        return;
    }

    if (isDebugMode) {
        console.log('Clipboard items:', Array.from(items).map(item => ({
            kind: item.kind,
            type: item.type
        })));
        console.log('Raw clipboard data:', e.clipboardData);
    }

    for (const item of items) {
        if (isDebugMode) {
            console.log('Processing item:', {
                kind: item.kind,
                type: item.type
            });
        }

        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
                if (isDebugMode) {
                    console.log('Found image file:', {
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });
                }
                handleImageImport(file);
                break;
            }
        }
    }
});

// Function to update grid size
function updateGridSize(newSize: number) {
    if (isNaN(newSize) || newSize <= 0) return;
    
    // Store previous size to check against GIF sizes
    const previousSize = gridSize;
    
    gridSizeInput.value = newSize.toString();
    
    // Update GIF sizes if they match the previous grid size
    if (parseInt(gifStartSizeInput.value) === previousSize) {
        gifStartSizeInput.value = newSize.toString();
        // Trigger preview update since GIF settings changed
        updatePreview();
    }
    if (parseInt(gifEndSizeInput.value) === previousSize) {
        gifEndSizeInput.value = newSize.toString();
        // Trigger preview update since GIF settings changed
        updatePreview();
    }
    
    // Set cancel flag to stop any in-progress processing
    shouldCancelProcessing = true;
    
    // Cancel any pending processing
    if (processingTimeout !== null) {
        window.clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    
    // Wait for any current rendering to finish
    const waitForRender = async () => {
        if (renderLock) {
            await new Promise(resolve => setTimeout(resolve, 50));
            await waitForRender();
        }
    };
    
    waitForRender().then(() => {
        gridSize = newSize;
        
        // Initialize buffers first
        initializeBuffers();
        
        // Ensure all buffers are properly initialized before proceeding
        const allBuffersValid = canvasConfigs.every(config => 
            config.buffer && config.buffer.getBufferData().cells.length === gridSize
        );
        
        if (!allBuffersValid) {
            console.error('Buffer initialization failed');
            return;
        }
        
        // Reset cancel flag before starting new processing
        shouldCancelProcessing = false;
        
        // Re-process the selected area if an image is loaded
        if (originalImage) {
            scheduleSampleProcessing();
        } else {
            // Ensure render is called in next frame to allow buffer initialization to complete
            requestAnimationFrame(() => render());
        }
    });
}

// Grid size input event listener
gridSizeInput.addEventListener('change', () => {
    updateGridSize(parseInt(gridSizeInput.value));
});

// Grid size quick buttons event listeners
document.querySelectorAll('.grid-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const size = parseInt((btn as HTMLElement).dataset.size || '0');
        updateGridSize(size);
    });
});


selectionBox.addEventListener('mousedown', (e) => {
    if (!originalImage) return;

    const target = e.target as HTMLElement;
    if (target.classList.contains('selection-handle')) {
        isResizing = true;
        currentHandle = target;
    } else {
        isDragging = true;
    }

    const coords = getRelativeCoords(e);
    startX = coords.x;
    startY = coords.y;
    startLeft = parseFloat(selectionBox.style.left) || 0;
    startTop = parseFloat(selectionBox.style.top) || 0;
    startWidth = parseFloat(selectionBox.style.width) || 0;
    startHeight = parseFloat(selectionBox.style.height) || 0;

    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!originalImage || (!isDragging && !isResizing)) return;

    const coords = getRelativeCoords(e);
    const dx = coords.x - startX;
    const dy = coords.y - startY;

    if (isDragging) {
        updateSelectionBox(startLeft + dx, startTop + dy, startWidth);
    } else if (isResizing) {
        let newSize = startWidth;
        let newLeft = startLeft;
        let newTop = startTop;
        
        if (currentHandle?.classList.contains('se')) {
            // Southeast: resize from bottom-right
            newSize = Math.max(startWidth + dx, startWidth + dy);
        } else if (currentHandle?.classList.contains('sw')) {
            // Southwest: resize from bottom-left
            const change = Math.max(-dx, dy);
            newSize = startWidth + change;
            newLeft = startLeft - change;
        } else if (currentHandle?.classList.contains('ne')) {
            // Northeast: resize from top-right
            const change = Math.max(dx, -dy);
            newSize = startWidth + change;
            newTop = startTop - change;
        } else if (currentHandle?.classList.contains('nw')) {
            // Northwest: resize from top-left
            const change = Math.max(-dx, -dy);
            newSize = startWidth + change;
            newLeft = startLeft - change;
            newTop = startTop - change;
        }

        updateSelectionBox(newLeft, newTop, newSize);
    }
});

document.addEventListener('mouseup', () => {
    if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        currentHandle = null;
        scheduleSampleProcessing();
        // Update GIF preview to reflect the new selection area
        setTimeout(updatePreview, 250); // Wait for sample processing to complete
    }
});

// Show save dialog for GIF
gifSaveBtn.addEventListener('click', () => {
    const saveDialog = document.querySelector('.save-dialog') as HTMLElement;
    const saveFormatSelect = document.getElementById('saveFormat') as HTMLSelectElement;
    const saveFilenameInput = document.getElementById('saveFilename') as HTMLInputElement;
    
    saveFormatSelect.value = 'gif';
    saveFormatSelect.disabled = true;
    saveFilenameInput.value = 'pixel-animation';
    saveDialog.style.display = 'flex';
});

// Save dialog event handlers
document.querySelector('.save-ok')?.addEventListener('click', async () => {
    const saveDialog = document.querySelector('.save-dialog') as HTMLElement;
    const saveFormatSelect = document.getElementById('saveFormat') as HTMLSelectElement;
    const filename = (document.getElementById('saveFilename') as HTMLInputElement).value;
    const format = saveFormatSelect.value.toUpperCase();
    
    // Handle GIF animation save
    if ((saveDialog as any).saveData === undefined) {
        if (generatedFrames.length === 0) {
            // Generate frames if not already generated
            const startSize = parseInt(gifStartSizeInput.value);
            const endSize = parseInt(gifEndSizeInput.value);
            const frameCount = parseInt(gifFrameCountInput.value);
            const delay = parseInt(gifDelayInput.value);
            const type = gifAnimationTypeSelect.value;

            generatedFrames = await generateGifFrames(startSize, endSize, frameCount);
            createGif(generatedFrames, delay, type, filename);
        } else {
            const delay = parseInt(gifDelayInput.value);
            const type = gifAnimationTypeSelect.value;
            createGif(generatedFrames, delay, type, filename);
        }
    } else {
        // Handle PNG/JPG save
        const { canvas } = (saveDialog as any).saveData;
        const link = document.createElement('a');
        link.download = `${filename}.${format.toLowerCase()}`;
        // For JPG/JPEG consistency
        const mimeFormat = format === 'JPG' ? 'jpeg' : format.toLowerCase();
        link.href = canvas.toDataURL(`image/${mimeFormat}`);
        link.click();
        (saveDialog as any).saveData = undefined;
    }
    
    saveDialog.style.display = 'none';
    saveFormatSelect.disabled = false;
});

document.querySelector('.save-cancel')?.addEventListener('click', () => {
    const saveDialog = document.querySelector('.save-dialog') as HTMLElement;
    const saveFormatSelect = document.getElementById('saveFormat') as HTMLSelectElement;
    saveDialog.style.display = 'none';
    saveFormatSelect.disabled = false;
});

// Auto-generate preview when settings change
const updatePreview = () => {
    if (originalImage) {
        autoPreviewGif();
    }
};

// Add input event listeners for immediate updates
[gifStartSizeInput, gifEndSizeInput, gifFrameCountInput].forEach(input => {
    input.addEventListener('input', updatePreview);
});

// Add change event listeners for select elements and other inputs
[gifAnimationTypeSelect, gifDelayInput, gifLoopPauseInput,
 gifTimingCurveSelect, gifColorPaletteSelect, gifColorModeSelect].forEach(input => {
    input.addEventListener('change', updatePreview);
});

// Function to save canvas as image
function saveCanvasAsImage(canvas: HTMLCanvasElement, format: string) {
    const saveDialog = document.querySelector('.save-dialog') as HTMLElement;
    const saveFormatSelect = document.getElementById('saveFormat') as HTMLSelectElement;
    const saveFilenameInput = document.getElementById('saveFilename') as HTMLInputElement;
    
    // Store canvas for use in save handler
    (saveDialog as any).saveData = { canvas };
    
    // Set format in select (handle JPG/JPEG consistency)
    saveFormatSelect.value = format === 'JPEG' ? 'jpg' : format.toLowerCase();
    saveFormatSelect.disabled = false; // Allow format switching between PNG/JPG
    saveFilenameInput.value = 'pixel-image';
    saveDialog.style.display = 'flex';
}

// Add event listeners for Set GIF buttons and save buttons
document.querySelectorAll('.action-overlay').forEach(overlay => {
    // Set GIF button handler
    const setGifBtn = overlay.querySelector('.set-gif');
    if (setGifBtn) {
        setGifBtn.addEventListener('click', () => {
            const palette = (overlay as HTMLElement).dataset.palette;
            const mode = (overlay as HTMLElement).dataset.mode;
            
            if (palette && mode) {
                gifColorPaletteSelect.value = palette;
                gifColorModeSelect.value = mode;
                updatePreview();
            }
        });
    }

    // Save PNG/JPG button handlers
    const pngBtn = overlay.querySelector('.png');
    const jpgBtn = overlay.querySelector('.jpg');
    const container = overlay.closest('.screen-container');
    
    if (container) {
        const canvas = container.querySelector('canvas');
        if (canvas) {
            if (pngBtn) {
                pngBtn.addEventListener('click', () => saveCanvasAsImage(canvas, 'PNG'));
            }
            if (jpgBtn) {
                jpgBtn.addEventListener('click', () => saveCanvasAsImage(canvas, 'JPEG'));
            }
        }
    }
});

// Initial setup
initializeBuffers();
render();
