import { IVideoBuffer } from '@retro-dos/retro-ui-lib';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoBuffer: IVideoBuffer;
  private charWidth: number;
  private charHeight: number;
  private isDirty: boolean = true;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, videoBuffer: IVideoBuffer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.videoBuffer = videoBuffer;

    // Calculate character dimensions
    const CHAR_ASPECT_RATIO = 1.6; // Standard DOS character aspect ratio
    this.charWidth = Math.floor(canvas.width / videoBuffer.getBufferData().width);
    this.charHeight = Math.floor(this.charWidth * CHAR_ASPECT_RATIO);

    // Update canvas height to maintain aspect ratio
    this.canvas.height = this.charHeight * videoBuffer.getBufferData().height;

    // Set up DOS color palette CSS variables
    this.setupColorPalette();
  }

  /**
   * Set up DOS color palette as CSS variables
   */
  private setupColorPalette(): void {
    const systemColors = [
      '#000000', '#0000AA', '#00AA00', '#00AAAA',  // 0-3
      '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',  // 4-7
      '#555555', '#5555FF', '#55FF55', '#55FFFF',  // 8-11
      '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'   // 12-15
    ];

    const style = document.createElement('style');
    let cssVars = ':root {\n';
    systemColors.forEach((color, i) => {
      cssVars += `  --color-${i}: ${color};\n`;
    });
    cssVars += '}';
    style.textContent = cssVars;
    document.head.appendChild(style);
  }

  /**
   * Start the render loop
   */
  public startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      if (this.isDirty) {
        this.renderFrame();
        this.isDirty = false;
      }
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Mark the renderer as needing an update
   */
  public markDirty(): void {
    this.isDirty = true;
    // Restart animation loop if it was paused
    if (!this.animationFrameId) {
      this.startRenderLoop();
    }
  }

  /**
   * Stop the render loop
   */
  public stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render a single frame
   */
  private renderFrame(): void {
    const { width, height, cells } = this.videoBuffer.getBufferData();

    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw characters
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y][x] || {
          char: ' ',
          attributes: {
            foreground: 7,  // Light gray
            background: 0,  // Black
            blink: false
          }
        };

        // Draw background
        const bgColor = getComputedStyle(document.documentElement)
          .getPropertyValue(`--color-${cell.attributes.background}`)
          .trim();
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(
          x * this.charWidth,
          y * this.charHeight,
          this.charWidth,
          this.charHeight
        );

        // Draw character if printable
        if (cell.char && cell.char.charCodeAt(0) > 31) {
          const fgColor = getComputedStyle(document.documentElement)
            .getPropertyValue(`--color-${cell.attributes.foreground}`)
            .trim();
          this.ctx.fillStyle = fgColor;
          const fontSize = Math.floor(this.charHeight * 0.8);
          this.ctx.font = `bold ${fontSize}px monospace`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          
          this.ctx.fillText(
            cell.char,
            x * this.charWidth + this.charWidth / 2,
            y * this.charHeight + this.charHeight / 2
          );
        }
      }
    }
  }

  /**
   * Get the character dimensions
   */
  public getCharacterDimensions(): { width: number; height: number } {
    return {
      width: this.charWidth,
      height: this.charHeight
    };
  }

  /**
   * Convert screen coordinates to buffer coordinates
   */
  public screenToBuffer(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.floor(x * this.videoBuffer.getBufferData().width / this.canvas.width),
      y: Math.floor(y * this.videoBuffer.getBufferData().height / this.canvas.height)
    };
  }
}
