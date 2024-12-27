declare module 'gif.js' {
    interface GifOptions {
        workers?: number;
        quality?: number;
        width?: number;
        height?: number;
        workerScript?: string;
        repeat?: number;  // 0 for infinite loop, 1 for single play
        transparent?: string;
        background?: string;
        comment?: string;
        dither?: boolean;
    }

    interface GifFrameOptions {
        delay?: number;
        copy?: boolean;  // true to copy the canvas data before encoding
        transparent?: boolean;
        dispose?: number;
    }

    class GIF {
        constructor(options: GifOptions);
        addFrame(element: HTMLCanvasElement, options?: GifFrameOptions): void;
        on(event: 'finished', callback: (blob: Blob) => void): void;
        render(): void;
    }

    export default GIF;
}
