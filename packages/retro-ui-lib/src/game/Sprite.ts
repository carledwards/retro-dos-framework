import { CellAttributes } from '../video';

export interface SpriteConfig {
    x: number;
    y: number;
    char: string;
    foreground: number;
    background: number;
    active?: boolean;
    collisionEnabled?: boolean;
    tag?: string;
    velocity?: { x: number; y: number };
    acceleration?: { x: number; y: number };
    maxSpeed?: number;
}

export class Sprite {
    x: number;
    y: number;
    private lastX: number;
    private lastY: number;
    char: string;
    foreground: number;
    background: number;
    active: boolean;
    collisionEnabled: boolean;
    velocity: { x: number; y: number };
    acceleration: { x: number; y: number };
    maxSpeed: number;
    tag: string;

    constructor(config: SpriteConfig) {
        this.x = config.x;
        this.y = config.y;
        this.lastX = config.x;
        this.lastY = config.y;
        this.char = config.char;
        this.foreground = config.foreground;
        this.background = config.background;
        this.active = config.active ?? true;
        this.collisionEnabled = config.collisionEnabled ?? true;
        this.velocity = config.velocity ?? { x: 0, y: 0 };
        this.acceleration = config.acceleration ?? { x: 0, y: 0 };
        this.maxSpeed = config.maxSpeed ?? Infinity;
        this.tag = config.tag ?? 'sprite';
    }

    update(deltaTime: number): void {
        if (!this.active) return;
        
        // Store last position
        this.lastX = this.x;
        this.lastY = this.y;

        // Apply acceleration to velocity
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;

        // Limit speed if maxSpeed is set
        if (this.maxSpeed !== Infinity) {
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (speed > this.maxSpeed) {
                const scale = this.maxSpeed / speed;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }
        }

        // Apply velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
    }

    setVelocity(x: number, y: number): void {
        this.velocity.x = x;
        this.velocity.y = y;
    }

    setAcceleration(x: number, y: number): void {
        this.acceleration.x = x;
        this.acceleration.y = y;
    }

    stop(): void {
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }

    collidesWith(other: Sprite): boolean {
        if (!this.active || !other.active || !this.collisionEnabled || !other.collisionEnabled) {
            return false;
        }

        // For ASCII games, use a simple distance check
        const thisX = Math.round(this.x);
        const thisY = Math.round(this.y);
        const otherX = Math.round(other.x);
        const otherY = Math.round(other.y);

        // Check if sprites are in the same cell or adjacent cells
        return Math.abs(thisX - otherX) <= 1 && Math.abs(thisY - otherY) <= 1;
    }

    getCellAttributes(): CellAttributes {
        return {
            foreground: this.foreground,
            background: this.background,
            blink: false
        };
    }
}
