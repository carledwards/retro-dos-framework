import { VideoBuffer, CellAttributes } from '../video';
import { DOS_COLORS } from './DosColors';

export interface HeaderArea {
    x: number;
    y: number;
    width: number;
    maxWidth: number;
}

export interface HeaderAreas {
    title: HeaderArea;
    cell1: HeaderArea;
    cell2: HeaderArea;
    cell3: HeaderArea;
}

export interface BorderConfig {
    width: number;
    height: number;
    headerHeight?: number;
    color?: number;
    backgroundColor?: number;
    columnPositions?: number[];
    areas?: HeaderAreas;
}

export class BorderUI {
    private buffer: VideoBuffer;
    private config: BorderConfig;
    private titleText: string = '';
    private cell1Text: string = '';
    private cell2Text: string = '';
    private cell3Text: string = '';
    private cell1Attrs: CellAttributes | undefined;
    private cell2Attrs: CellAttributes | undefined;
    private cell3Attrs: CellAttributes | undefined;

    constructor(buffer: VideoBuffer, config: BorderConfig) {
        this.buffer = buffer;
        this.config = {
            headerHeight: 3, // Increased to accommodate title and info cells
            backgroundColor: 0, // Black by default
            ...config
        };
        this.calculateHeaderAreas();
    }

    private calculateHeaderAreas(): void {
        const { width } = this.config;
        
        // Calculate column widths
        const usableWidth = width - 4; // 2 outer + 2 inner borders
        const colWidth = Math.floor(usableWidth / 3);
        
        // Calculate column positions
        const col1Start = 0;
        const col2Start = colWidth + 1;
        const col3Start = (colWidth * 2) + 2;
        
        this.config.columnPositions = [col1Start, col2Start, col3Start, width - 1];
        
        // Calculate areas
        // Title area is between the connectors (╦═╡ and ╞═╦)
        const titleStart = col2Start + 3;  // After ╦═╡
        const titleEnd = col3Start - 2;    // Before ╞═╦
        const titleWidth = titleEnd - titleStart;

        this.config.areas = {
            title: {
                x: titleStart,
                y: 0,
                width: titleWidth,
                maxWidth: titleWidth
            },
            cell1: {
                x: col1Start + 2,
                y: 2,
                width: col2Start - col1Start - 3,
                maxWidth: col2Start - col1Start - 3
            },
            cell2: {
                x: col2Start + 2,
                y: 2,
                width: col3Start - col2Start - 3,
                maxWidth: col3Start - col2Start - 3
            },
            cell3: {
                x: col3Start + 2,
                y: 2,
                width: width - col3Start - 3,
                maxWidth: width - col3Start - 3
            }
        };
    }

    draw(): void {
        const { width, height, headerHeight, color, backgroundColor, columnPositions } = this.config;
        const attrs: CellAttributes = {
            foreground: color!,
            background: backgroundColor!,
            blink: false
        };

        // Draw the border structure first
        this.drawBorderStructure(attrs);

        // Draw the text content on top
        this.drawTextContent(attrs);
    }

    private drawBorderStructure(attrs: CellAttributes): void {
        // Use border color for structure
        const borderAttrs: CellAttributes = {
            ...attrs,
            foreground: this.config.color ?? attrs.foreground
        };

        // Draw base structure with columns
        this.drawBaseStructure(borderAttrs);
        
        // Add swoop effect
        this.drawSwoop(borderAttrs);
        
        // Add title connectors and clear title area
        this.drawTitleArea(borderAttrs);
    }

    private drawTextContent(_attrs: CellAttributes): void {
        if (!this.config.areas) return;
        const areas = this.config.areas;

        // Draw title with its stored attributes
        if (this.titleText) {
            const startX = areas.title.x + Math.floor((areas.title.width - this.titleText.length) / 2);
            this.drawHeader(this.titleText, startX, areas.title.y, {
                foreground: DOS_COLORS.YELLOW,
                background: this.config.backgroundColor!,
                blink: false
            });
        }

        // Draw cells with their stored attributes
        if (this.cell1Text && this.cell1Attrs) {
            this.drawHeader(
                this.cell1Text.substring(0, areas.cell1.width),
                areas.cell1.x,
                areas.cell1.y,
                this.cell1Attrs
            );
        }
        if (this.cell2Text && this.cell2Attrs) {
            this.drawHeader(
                this.cell2Text.substring(0, areas.cell2.width),
                areas.cell2.x,
                areas.cell2.y,
                this.cell2Attrs
            );
        }
        if (this.cell3Text && this.cell3Attrs) {
            this.drawHeader(
                this.cell3Text.substring(0, areas.cell3.width),
                areas.cell3.x,
                areas.cell3.y,
                this.cell3Attrs
            );
        }
    }


    private drawBaseStructure(attrs: CellAttributes): void {
        const { width, height, headerHeight, columnPositions } = this.config;
        if (!columnPositions) return;

        const [col1Start, col2Start, col3Start] = columnPositions;

        // Draw vertical borders for columns
        for (let y = 2; y < headerHeight!; y++) {
            this.writeChar(0, y, '║', attrs);
            this.writeChar(col2Start, y, '║', attrs);
            this.writeChar(col3Start, y, '║', attrs);
            this.writeChar(width - 1, y, '║', attrs);
        }

        // Draw transition row
        this.writeChar(0, headerHeight!, '╟', attrs);
        this.writeChar(col2Start, headerHeight!, '╨', attrs);
        this.writeChar(col3Start, headerHeight!, '╨', attrs);
        this.writeChar(width - 1, headerHeight!, '╢', attrs);
        for (let x = 1; x < width - 1; x++) {
            if (x !== col2Start && x !== col3Start) {
                this.writeChar(x, headerHeight!, '─', attrs);
            }
        }

        // Draw remaining vertical borders
        for (let y = headerHeight! + 1; y < height - 1; y++) {
            this.writeChar(0, y, '║', attrs);
            this.writeChar(width - 1, y, '║', attrs);
        }

        // Draw bottom border
        this.writeChar(0, height - 1, '╚', attrs);
        this.writeChar(width - 1, height - 1, '╝', attrs);
        for (let x = 1; x < width - 1; x++) {
            this.writeChar(x, height - 1, '═', attrs);
        }
    }

    private drawSwoop(attrs: CellAttributes): void {
        const { width } = this.config;

        // Draw double-border top
        this.writeChar(0, 0, '╔', attrs);
        this.writeChar(1, 0, '╔', attrs);
        this.writeChar(width - 2, 0, '╗', attrs);
        this.writeChar(width - 1, 0, '╗', attrs);
        for (let x = 2; x < width - 2; x++) {
            this.writeChar(x, 0, '═', attrs);
        }

        // Draw underline
        this.writeChar(0, 1, '║', attrs);
        this.writeChar(1, 1, '╚', attrs);
        this.writeChar(width - 2, 1, '╝', attrs);
        this.writeChar(width - 1, 1, '║', attrs);
        for (let x = 2; x < width - 2; x++) {
            this.writeChar(x, 1, '═', attrs);
        }
    }

    private drawTitleArea(attrs: CellAttributes): void {
        const { columnPositions } = this.config;
        if (!columnPositions) return;

        const [, col2Start, col3Start] = columnPositions;

        // Draw title connectors at column positions
        this.writeChar(col2Start, 0, '╦', attrs);
        this.writeChar(col2Start + 1, 0, '═', attrs);
        this.writeChar(col2Start + 2, 0, '╡', attrs);
        this.writeChar(col3Start - 2, 0, '╞', attrs);
        this.writeChar(col3Start - 1, 0, '═', attrs);
        this.writeChar(col3Start, 0, '╦', attrs);
    }

    private drawInfoCells(attrs: CellAttributes): void {
        // Info cells are drawn by writing text into the areas defined in this.config.areas
        // The actual content is written using drawHeader or drawCentered methods
    }

    private writeChar(x: number, y: number, char: string, attrs: CellAttributes): void {
        this.buffer.writeChar(x, y, char, attrs);
    }

    drawHeader(text: string, x: number, y: number, attrs: CellAttributes): void {
        this.buffer.beginBatch();
        for (let i = 0; i < text.length; i++) {
            this.buffer.writeChar(x + i, y, text[i], attrs);
        }
        this.buffer.endBatch();
    }

    drawCentered(text: string, y: number, attrs: CellAttributes): void {
        const x = Math.floor((this.config.width - text.length) / 2);
        this.drawHeader(text, x, y, attrs);
    }

    setTitle(text: string, attrs?: CellAttributes): void {
        if (!this.config.areas) return;
        
        this.titleText = text;
        const area = this.config.areas.title;
        const defaultAttrs: CellAttributes = {
            foreground: attrs?.foreground ?? this.config.color!,
            background: this.config.backgroundColor!,
            blink: false
        };

        // First clear the title area
        for (let x = area.x; x < area.x + area.width; x++) {
            this.writeChar(x, area.y, ' ', defaultAttrs);
        }
        
        // Center the text in the title area
        const startX = area.x + Math.floor((area.width - text.length) / 2);
        this.drawHeader(text, startX, area.y, defaultAttrs);
    }

    setCell1(text: string, attrs?: CellAttributes): void {
        if (!this.config.areas) return;
        
        this.cell1Text = text;
        this.cell1Attrs = attrs ? { ...attrs } : {
            foreground: this.config.color!,
            background: this.config.backgroundColor!,
            blink: false
        };
        const area = this.config.areas.cell1;
        this.drawHeader(text.substring(0, area.width), area.x, area.y, this.cell1Attrs);
    }

    setCell2(text: string, attrs?: CellAttributes): void {
        if (!this.config.areas) return;
        
        this.cell2Text = text;
        this.cell2Attrs = attrs ? { ...attrs } : {
            foreground: this.config.color!,
            background: this.config.backgroundColor!,
            blink: false
        };
        const area = this.config.areas.cell2;
        this.drawHeader(text.substring(0, area.width), area.x, area.y, this.cell2Attrs);
    }

    setCell3(text: string, attrs?: CellAttributes): void {
        if (!this.config.areas) return;
        
        this.cell3Text = text;
        this.cell3Attrs = attrs ? { ...attrs } : {
            foreground: this.config.color!,
            background: this.config.backgroundColor!,
            blink: false
        };
        const area = this.config.areas.cell3;
        this.drawHeader(text.substring(0, area.width), area.x, area.y, this.cell3Attrs);
    }

    getAreas(): HeaderAreas | undefined {
        return this.config.areas;
    }
}
