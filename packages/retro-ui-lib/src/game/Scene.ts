import { VideoBuffer, CellAttributes } from '../video';
import { Sprite } from './Sprite';
import { DOS_COLORS } from './DosColors';

export interface CollisionHandler {
    (sprite1: Sprite, sprite2: Sprite): void;
}

export interface SpriteGroup {
    name: string;
    sprites: Sprite[];
    active: boolean;
    velocity?: { x: number; y: number };
    acceleration?: { x: number; y: number };
}

import { BorderUI } from './BorderUI';

export interface LevelConfig {
    speedMultiplier?: number;
    onLevelComplete?: () => void;
}

export interface GameOverConfig {
    text: string;
    color?: number;
    backgroundColor?: number;
    verticalPosition?: number; // 0-1 percentage of screen height
}

export interface SceneConfig {
    buffer: VideoBuffer;
    bounds?: { left: number; right: number; top: number; bottom: number };
    borderUI?: BorderUI;
    levelConfig?: LevelConfig;
    gameOverConfig?: GameOverConfig;
    title?: string;
    titleAttrs?: CellAttributes;
}

export class Scene {
    private sprites: Sprite[] = [];
    private groups: Map<string, SpriteGroup> = new Map();
    private buffer: VideoBuffer;
    private bounds: { left: number; right: number; top: number; bottom: number };
    private collisionHandlers: Map<string, CollisionHandler> = new Map();
    private taggedSprites: Map<string, Set<Sprite>> = new Map();
    private borderUI?: BorderUI;
    private currentLevel: number = 1;
    private levelConfig?: LevelConfig;
    private gameOverConfig?: GameOverConfig;
    private isGameOver: boolean = false;

    constructor(config: SceneConfig) {
        this.buffer = config.buffer;
        this.borderUI = config.borderUI;
        this.levelConfig = config.levelConfig;
        this.gameOverConfig = config.gameOverConfig || {
            text: 'GAME OVER',
            color: DOS_COLORS.YELLOW,
            backgroundColor: DOS_COLORS.BLACK,
            verticalPosition: 0.4
        };

        if (config.title && this.borderUI) {
            this.borderUI.setTitle(config.title, config.titleAttrs);
        }
        
        const { width, height } = this.buffer.getBufferData();
        
        if (this.borderUI) {
            // If BorderUI is provided, automatically protect the border area
            this.bounds = {
                left: 1,
                right: width - 2,
                top: (this.borderUI as any).config.headerHeight || 2,
                bottom: height - 2
            };
        } else {
            // Otherwise use provided bounds or default
            this.bounds = config.bounds ?? {
                left: 0,
                right: width - 1,
                top: 0,
                bottom: height - 1
            };
        }
    }

    addSprite(sprite: Sprite): void {
        this.sprites.push(sprite);
        
        // Add to tagged sprites for faster collision checking
        if (!this.taggedSprites.has(sprite.tag)) {
            this.taggedSprites.set(sprite.tag, new Set());
        }
        this.taggedSprites.get(sprite.tag)!.add(sprite);
    }

    removeSprite(sprite: Sprite): void {
        const index = this.sprites.indexOf(sprite);
        if (index !== -1) {
            this.sprites.splice(index, 1);
            
            // Remove from tagged sprites
            const taggedSet = this.taggedSprites.get(sprite.tag);
            if (taggedSet) {
                taggedSet.delete(sprite);
                // Clean up empty sets
                if (taggedSet.size === 0) {
                    this.taggedSprites.delete(sprite.tag);
                }
            }

            // Remove from any groups
            this.groups.forEach(group => {
                const groupIndex = group.sprites.indexOf(sprite);
                if (groupIndex !== -1) {
                    group.sprites.splice(groupIndex, 1);
                }
            });
        }
    }

    createGroup(name: string): SpriteGroup {
        const group: SpriteGroup = {
            name,
            sprites: [],
            active: true
        };
        this.groups.set(name, group);
        return group;
    }

    addToGroup(groupName: string, sprite: Sprite): void {
        const group = this.groups.get(groupName);
        if (group && !group.sprites.includes(sprite)) {
            group.sprites.push(sprite);
        }
    }

    removeFromGroup(groupName: string, sprite: Sprite): void {
        const group = this.groups.get(groupName);
        if (group) {
            const index = group.sprites.indexOf(sprite);
            if (index !== -1) {
                group.sprites.splice(index, 1);
            }
        }
    }

    setGroupVelocity(groupName: string, x: number, y: number): void {
        const group = this.groups.get(groupName);
        if (group) {
            group.velocity = { x, y };
            group.sprites.forEach(sprite => sprite.setVelocity(x, y));
        }
    }

    setGroupAcceleration(groupName: string, x: number, y: number): void {
        const group = this.groups.get(groupName);
        if (group) {
            group.acceleration = { x, y };
            group.sprites.forEach(sprite => sprite.setAcceleration(x, y));
        }
    }

    onCollision(tag1: string, tag2: string, handler: CollisionHandler): void {
        this.collisionHandlers.set(`${tag1}:${tag2}`, handler);
        // Also add reverse order
        this.collisionHandlers.set(`${tag2}:${tag1}`, (s1, s2) => handler(s2, s1));
    }

    setGameOver(isGameOver: boolean): void {
        this.isGameOver = isGameOver;
    }

    update(deltaTime: number): void {
        // Check for level completion
        const enemies = this.getSpritesWithTag('enemy');
        if (enemies.length === 0 && this.levelConfig?.onLevelComplete) {
            this.currentLevel++;
            this.levelConfig.onLevelComplete();
        }

        // Update all groups with level-based speed adjustments
        this.groups.forEach(group => {
            if (group.active) {
                group.sprites.forEach(sprite => {
                    if (sprite.active) {
                        // Apply group movement if set, adjusted for level
                        if (group.velocity) {
                            const speedMultiplier = this.levelConfig?.speedMultiplier ?? 1;
                            const levelSpeedIncrease = 1 + ((this.currentLevel - 1) * speedMultiplier);
                            sprite.setVelocity(
                                group.velocity.x * levelSpeedIncrease,
                                group.velocity.y * levelSpeedIncrease
                            );
                        }
                        if (group.acceleration) {
                            sprite.setAcceleration(group.acceleration.x, group.acceleration.y);
                        }
                    }
                });
            }
        });

        // Update all sprites
        this.sprites.forEach(sprite => {
            if (sprite.active) {
                sprite.update(deltaTime);

                // Keep sprite within bounds
                sprite.x = Math.max(this.bounds.left, Math.min(this.bounds.right, sprite.x));
                sprite.y = Math.max(this.bounds.top, Math.min(this.bounds.bottom, sprite.y));
            }
        });

        // Check collisions between tagged sprites
        this.collisionHandlers.forEach((handler, key) => {
            const [tag1, tag2] = key.split(':');
            const sprites1 = this.taggedSprites.get(tag1);
            const sprites2 = this.taggedSprites.get(tag2);

            if (sprites1 && sprites2) {
                sprites1.forEach(sprite1 => {
                    if (!sprite1.active || !sprite1.collisionEnabled) return;

                    sprites2.forEach(sprite2 => {
                        if (sprite1 === sprite2 || !sprite2.active || !sprite2.collisionEnabled) return;

                        if (sprite1.collidesWith(sprite2)) {
                            handler(sprite1, sprite2);
                        }
                    });
                });
            }
        });
    }

    private writeChar(x: number, y: number, text: string, fg: number, bg: number) {
        const attrs: CellAttributes = {
            foreground: fg,
            background: bg,
            blink: false
        };
        if (typeof text === 'string') {
            for (let i = 0; i < text.length; i++) {
                this.buffer.writeChar(x + i, y, text[i], attrs);
            }
        }
    }

    setBorderCell(index: number, text: string, attrs?: CellAttributes): void {
        if (!this.borderUI) return;

        const method = `setCell${index}` as keyof BorderUI;
        if (typeof this.borderUI[method] === 'function') {
            (this.borderUI[method] as Function)(text, attrs);
        }
    }

    draw(): void {
        // Clear buffer and begin batch
        this.buffer.clear();
        this.buffer.beginBatch();

        // Draw all active sprites
        this.sprites.forEach(sprite => {
            if (sprite.active) {
                const x = Math.round(sprite.x);
                const y = Math.round(sprite.y);
                if (x >= this.bounds.left && x <= this.bounds.right && 
                    y >= this.bounds.top && y <= this.bounds.bottom) {
                    this.buffer.writeChar(x, y, sprite.char, sprite.getCellAttributes());
                }
            }
        });

        // Draw border if present
        if (this.borderUI) {
            this.borderUI.draw();
        }

        // Draw game over text if needed
        if (this.isGameOver && this.gameOverConfig) {
            const { text, color, backgroundColor, verticalPosition } = this.gameOverConfig;
            const startX = Math.floor((this.buffer.getBufferData().width - text.length) / 2);
            const startY = Math.floor(this.buffer.getBufferData().height * (verticalPosition || 0.4));
            this.writeChar(startX, startY, text, color || DOS_COLORS.YELLOW, backgroundColor || DOS_COLORS.BLACK);
        }

        // End batch
        this.buffer.endBatch();
    }

    clear(): void {
        this.sprites = [];
        this.groups.clear();
        this.collisionHandlers.clear();
        this.taggedSprites.clear();
    }

    getSpritesWithTag(tag: string): Sprite[] {
        return Array.from(this.taggedSprites.get(tag) || []);
    }

    getGroup(name: string): SpriteGroup | undefined {
        return this.groups.get(name);
    }
}
