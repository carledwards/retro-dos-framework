import { VideoBuffer, CellAttributes } from '../../src/video';
import { KeyboardService } from '../../src/input';
import { Scene, Sprite, PathSystem, BorderUI, DOS_COLORS, Entity, EntityManager } from '../../src/game';

// Buffer setup
const COLS = 60;
const ROWS = 50;
const CELL_WIDTH = 9;
const CELL_HEIGHT = 16;

// Game constants
const BULLET_SPEED = 30;
const FORMATION_SPEED = 2;
const ATTACK_SPEED = 1.5; // Slower for more visible patterns
const MOVE_COOLDOWN = 15;
const SHOOT_COOLDOWN = 15;
const COLUMN_SPACING = 2;
const PLAY_AREA_LEFT = 1;
const PLAY_AREA_RIGHT = COLS - 2;
const ATTACK_CHANCE = 0.002; // Slightly higher chance to attack
const MAX_ATTACKING = 1; // Only one attacker at a time for clearer patterns
const ENEMY_BULLET_SPEED = 12; // Slower bullets
const ENEMY_SHOOT_CHANCE = 0.01; // Base shooting chance
const ENEMY_SHOOT_CHANCE_NEAR = 0.05; // Higher chance when near player
const NEAR_PLAYER_DISTANCE = 15; // Distance threshold for increased shooting

// Initialize canvas and buffers
const canvas = document.getElementById('screen') as HTMLCanvasElement;
canvas.width = COLS * CELL_WIDTH;
canvas.height = ROWS * CELL_HEIGHT;
const ctx = canvas.getContext('2d')!;

// Create video buffer
const buffer = new VideoBuffer(COLS, ROWS);

// Initialize game systems
const pathSystem = new PathSystem();
const entityManager = new EntityManager();
const borderUI = new BorderUI(buffer, {
    width: COLS,
    height: ROWS,
    backgroundColor: DOS_COLORS.BLACK,
    color: DOS_COLORS.LIGHT_CYAN // Border structure color
});

// Initialize keyboard service
const keyboard = new KeyboardService();
keyboard.initialize();

// Bezier curve helper
function bezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 
           3 * mt * mt * t * p1 + 
           3 * mt * t * t * p2 + 
           t * t * t * p3;
}

// Attack patterns (control points relative to start position)
const ATTACK_PATTERNS = [
    // Sweeping left dive with loop return
    [
        { x: 0, y: 0 },        // Start
        { x: -10, y: 5 },      // Initial dive left
        { x: -20, y: 15 },     // Continue descent
        { x: -25, y: 25 },     // Deep dive
        { x: -15, y: 35 },     // Level out
        { x: 0, y: 35 },       // Center position
        { x: 15, y: 25 },      // Begin loop
        { x: 20, y: 15 },      // Loop around
        { x: 10, y: 5 },       // Complete loop
        { x: 0, y: 0 }         // Back to formation
    ],
    // Sweeping right dive with loop return
    [
        { x: 0, y: 0 },        // Start
        { x: 10, y: 5 },       // Initial dive right
        { x: 20, y: 15 },      // Continue descent
        { x: 25, y: 25 },      // Deep dive
        { x: 15, y: 35 },      // Level out
        { x: 0, y: 35 },       // Center position
        { x: -15, y: 25 },     // Begin loop
        { x: -20, y: 15 },     // Loop around
        { x: -10, y: 5 },      // Complete loop
        { x: 0, y: 0 }         // Back to formation
    ],
    // Quick dive with S-curve return
    [
        { x: 0, y: 0 },        // Start
        { x: 0, y: 10 },       // Initial dive
        { x: 0, y: 25 },       // Deep dive
        { x: 0, y: 35 },       // Bottom position
        { x: 15, y: 25 },      // Begin S-curve
        { x: -15, y: 15 },     // S-curve middle
        { x: 15, y: 5 },       // S-curve end
        { x: 0, y: 0 }         // Back to formation
    ]
];

// Enemy characters for different directions
const ENEMY_CHARS = {
    UP: 'Λ',
    DOWN: 'V',
    LEFT: '<',
    RIGHT: '>'
};

// Helper function to get valid column positions
function getValidColumn(x: number): number {
    x = Math.max(PLAY_AREA_LEFT, Math.min(PLAY_AREA_RIGHT, x));
    return Math.round((x - PLAY_AREA_LEFT) / COLUMN_SPACING) * COLUMN_SPACING + PLAY_AREA_LEFT;
}

// Star field
const stars: Sprite[] = [];
for (let i = 0; i < 100; i++) {
    // Ensure stars don't spawn in header area
    const x = Math.floor(Math.random() * (COLS - 4)) + 2;
    const y = Math.floor(Math.random() * (ROWS - 7)) + 5;
    stars.push(new Sprite({
        x,
        y,
        char: Math.random() < 0.3 ? '·' : Math.random() < 0.6 ? '.' : '·',
        foreground: Math.random() < 0.7 ? DOS_COLORS.DARK_GRAY : DOS_COLORS.LIGHT_GRAY,
        background: DOS_COLORS.BLACK,
        tag: 'star'
    }));
}

// Game state
let scene: Scene;
let player: Sprite;
let score: number;
let gameLoop: number;
let lastTime: number;
let gameOver: boolean = false;
let autoPlay: boolean = false;
let playerHitTimer: number = 0;
let playerLives: number = 3;
let moveCooldown: number = 0;
let shootCooldown: number = 0;
let currentLevel: number = 1;

// Enemy state tracking
interface EnemyState {
    sprite: Sprite;
    isAttacking: boolean;
    formationX: number;
    formationY: number;
}
let enemyStates: Map<Sprite, EnemyState> = new Map();

// Convert attack patterns to PathSystem format
const ATTACK_PATHS = ATTACK_PATTERNS.map(pattern => ({
    points: pattern,
    speed: ATTACK_SPEED,
    loop: false
}));

// Function to create enemy formation
function createEnemyFormation(scene: Scene) {
    const enemyGroup = scene.createGroup('enemies');
    const enemyRows = 3;
    const enemiesPerRow = 6;
    const enemySpacingX = COLUMN_SPACING * 3;
    const enemySpacingY = 3;
    
    for (let row = 0; row < enemyRows; row++) {
        for (let col = 0; col < enemiesPerRow; col++) {
            const x = PLAY_AREA_LEFT + 8 + col * enemySpacingX;
            const y = 7 + row * enemySpacingY; // Increased to account for new header height
            const enemy = new Sprite({
                x,
                y,
                char: 'V',
                foreground: DOS_COLORS.LIGHT_RED,
                background: DOS_COLORS.BLACK,
                tag: 'enemy'
            });
            scene.addSprite(enemy);
            scene.addToGroup('enemies', enemy);
            
            // Initialize enemy state
            enemyStates.set(enemy, {
                sprite: enemy,
                isAttacking: false,
                formationX: x,
                formationY: y
            });
        }
    }

    // Set up formation movement
    scene.setGroupVelocity('enemies', FORMATION_SPEED, 0);
}

// Initialize game objects
function initGame() {
    // Reset enemy states
    enemyStates = new Map();
    currentLevel = 1;

    // Create scene with border protection and level management
    scene = new Scene({
        buffer,
        borderUI,
        title: "G O L O G O",
        titleAttrs: {
            foreground: DOS_COLORS.YELLOW,
            background: DOS_COLORS.BLACK,
            blink: false
        },
        levelConfig: {
            speedMultiplier: 0.2, // 20% speed increase per level
            onLevelComplete: () => {
                currentLevel++;
                createEnemyFormation(scene);
                updateStats();
            }
        },
        gameOverConfig: {
            text: 'GAME OVER - PRESS R TO PLAY AGAIN',
            color: DOS_COLORS.YELLOW,
            backgroundColor: DOS_COLORS.BLACK,
            verticalPosition: 0.4
        }
    });

    // Add stars to scene
    stars.forEach(star => scene.addSprite(star));

    // Create player
    player = new Sprite({
        x: getValidColumn(Math.floor(COLS / 2)),
        y: ROWS - 3,
        char: '^',
        foreground: DOS_COLORS.LIGHT_GREEN,
        background: DOS_COLORS.BLACK,
        tag: 'player'
    });
    scene.addSprite(player);

    // Create initial enemy formation
    createEnemyFormation(scene);

    // Set up collision handlers
    scene.onCollision('bullet', 'enemy', (bullet, enemy) => {
        scene.removeSprite(bullet);
        scene.removeSprite(enemy);
        enemyStates.delete(enemy);
        if (!autoPlay) {
            score += 100;
            updateStats();
        }
    });

    // Handle bullet collisions with enemy bullets
    scene.onCollision('bullet', 'enemyBullet', (bullet, enemyBullet) => {
        scene.removeSprite(bullet);
        scene.removeSprite(enemyBullet);
    });

    // Handle player collisions with enemies
    scene.onCollision('player', 'enemy', (player, enemy) => {
        if (playerHitTimer === 0) {
            scene.removeSprite(enemy);
            enemyStates.delete(enemy);
            playerHitTimer = 30;

            if (!autoPlay) {
                playerLives--;
                updateStats();
                if (playerLives <= 0) {
                    gameOver = true;
                    autoPlay = true;
                    scene.setGameOver(true);
                    // Reset player position
                    player.x = getValidColumn(Math.floor(COLS / 2));
                    player.y = ROWS - 3;
                }
            }
        }
    });

    // Handle player collisions with enemy bullets
    scene.onCollision('player', 'enemyBullet', (player, bullet) => {
        if (playerHitTimer === 0) {
            scene.removeSprite(bullet);
            playerHitTimer = 30;

            if (!autoPlay) {
                playerLives--;
                updateStats();
                if (playerLives <= 0) {
                    gameOver = true;
                    autoPlay = true;
                    scene.setGameOver(true);
                    // Reset player position
                    player.x = getValidColumn(Math.floor(COLS / 2));
                    player.y = ROWS - 3;
                }
            }
        }
    });

    // Reset game state
    score = 0;
    gameOver = false;
    playerLives = 3;
    playerHitTimer = 0;
    moveCooldown = 0;

    // Update UI
    updateStats();
}

// Game loop
function gameUpdate(currentTime: number) {
    if (!lastTime) lastTime = currentTime;
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Update cooldowns
    if (moveCooldown > 0) moveCooldown--;
    if (playerHitTimer > 0) {
        playerHitTimer--;
        // Flash player ship when hit
        if (playerHitTimer % 4 < 2) { // Alternate every 2 frames
            player.char = '*';
            player.foreground = DOS_COLORS.YELLOW;
        } else {
            player.char = '^';
            player.foreground = DOS_COLORS.LIGHT_GREEN;
        }
    } else if (player.char !== '^') {
        // Reset to normal appearance
        player.char = '^';
        player.foreground = DOS_COLORS.LIGHT_GREEN;
    }
    if (shootCooldown > 0) shootCooldown--;

    // Handle player input when not in game over
    if (!gameOver) {
        const state = keyboard.getState();
        // Handle player movement
        if (moveCooldown === 0) {
            const newX = state.lastKeyPressed === 'ArrowLeft' ? 
                player.x - COLUMN_SPACING : 
                state.lastKeyPressed === 'ArrowRight' ? 
                player.x + COLUMN_SPACING : 
                player.x;

            if ((state.lastKeyPressed === 'ArrowLeft' || state.lastKeyPressed === 'ArrowRight') &&
                newX >= PLAY_AREA_LEFT && newX <= PLAY_AREA_RIGHT) {
                player.x = getValidColumn(newX);
                moveCooldown = MOVE_COOLDOWN;
                keyboard.cleanup();
                keyboard.initialize();
            }
        }

        // Handle player shooting
        if (state.lastKeyPressed === ' ' && shootCooldown === 0) {
            const bullets = scene.getSpritesWithTag('bullet');
            if (bullets.length < 3) {
                const bullet = new Sprite({
                    x: player.x,
                    y: player.y - 1,
                    char: '*',
                    foreground: DOS_COLORS.WHITE,
                    background: DOS_COLORS.BLACK,
                    tag: 'bullet'
                });
                bullet.setVelocity(0, -BULLET_SPEED);
                scene.addSprite(bullet);
                shootCooldown = SHOOT_COOLDOWN;
                keyboard.cleanup();
                keyboard.initialize();
            }
        }
    }

    // Handle AI control when in auto-play
    if (autoPlay) {
        updateAutoPlay();
    }

    // Update enemies
    const enemies = scene.getSpritesWithTag('enemy');
    enemies.forEach(enemy => {
            const state = enemyStates.get(enemy)!;
            
            if (!state.isAttacking) {
                // Count currently attacking enemies
                const attackingCount = Array.from(enemyStates.values())
                    .filter(s => s.isAttacking).length;
                    
                // Check if enemy should start attack
                if (attackingCount < MAX_ATTACKING && Math.random() < ATTACK_CHANCE) {
                    state.isAttacking = true;
                    scene.removeFromGroup('enemies', enemy);
                    const randomPath = ATTACK_PATHS[Math.floor(Math.random() * ATTACK_PATHS.length)];
                    pathSystem.addSprite(enemy, randomPath);
                }
            } else {
                // Update enemy character based on movement direction
                const direction = pathSystem.getDirection(enemy);
                if (direction) {
                    // Enemy is still following its path
                    if (Math.abs(direction.dx) > Math.abs(direction.dy)) {
                        enemy.char = direction.dx > 0 ? ENEMY_CHARS.RIGHT : ENEMY_CHARS.LEFT;
                    } else {
                        enemy.char = direction.dy > 0 ? ENEMY_CHARS.DOWN : ENEMY_CHARS.UP;
                    }

                    // Calculate distance to player and adjust shooting chance
                    const distToPlayer = Math.abs(enemy.y - player.y);
                    const shootChance = distToPlayer < NEAR_PLAYER_DISTANCE ? 
                        ENEMY_SHOOT_CHANCE_NEAR : ENEMY_SHOOT_CHANCE;
                    
                    // Shoot at player during attack
                    if (Math.random() < shootChance) {
                        const bullet = new Sprite({
                            x: enemy.x,
                            y: enemy.y + 1,
                            char: '.',
                            foreground: DOS_COLORS.LIGHT_RED,
                            background: DOS_COLORS.BLACK,
                            tag: 'enemyBullet'
                        });
                        bullet.setVelocity(0, ENEMY_BULLET_SPEED);
                        scene.addSprite(bullet);
                    }
                } else if (pathSystem.isComplete(enemy)) {
                    // Path is complete and no direction, return to formation
                    state.isAttacking = false;
                    
                    // Find an empty spot in the formation
                    const formation = scene.getGroup('enemies')!;
                    if (formation && formation.sprites.length > 0) {
                        // Get reference enemy for formation offset
                        const referenceEnemy = formation.sprites[0];
                        const referenceState = enemyStates.get(referenceEnemy)!;
                        const formationOffset = referenceEnemy.x - referenceState.formationX;
                        
                        // Calculate grid positions
                        const rows = 3;
                        const cols = 6;
                        const enemySpacingX = COLUMN_SPACING * 3;
                        const enemySpacingY = 3;
                        const baseX = PLAY_AREA_LEFT + 8;
                        const baseY = 7; // Increased to account for new header height
                        
                        // Define position type
                        interface FormationPosition {
                            x: number;
                            y: number;
                        }
                        
                        // Create list of possible positions
                        const positions: FormationPosition[] = [];
                        for (let row = 0; row < rows; row++) {
                            for (let col = 0; col < cols; col++) {
                                const x = baseX + col * enemySpacingX + formationOffset;
                                const y = baseY + row * enemySpacingY;
                                positions.push({ x, y });
                            }
                        }
                        
                        // Remove positions that are occupied
                        formation.sprites.forEach(sprite => {
                            const index = positions.findIndex(pos => 
                                pos.x === sprite.x && pos.y === sprite.y);
                            if (index !== -1) {
                                positions.splice(index, 1);
                            }
                        });
                        
                        // Pick a random empty position
                        if (positions.length > 0) {
                            const randomPos = positions[Math.floor(Math.random() * positions.length)];
                            enemy.x = randomPos.x;
                            enemy.y = randomPos.y;
                        } else {
                            // Fallback to original position if no empty spots
                            enemy.x = state.formationX + formationOffset;
                            enemy.y = state.formationY;
                        }
                    } else {
                        // Fallback if no formation exists
                        enemy.x = state.formationX;
                        enemy.y = state.formationY;
                    }
                    
                    enemy.char = ENEMY_CHARS.DOWN; // Reset to default
                    scene.addToGroup('enemies', enemy);
                    pathSystem.removeSprite(enemy); // Clean up the path state
                }
            }
        });

    // Update formation movement
    const formation = scene.getGroup('enemies')!;
        if (formation && formation.sprites.length > 0) {
            const leftmost = Math.min(...formation.sprites.map(e => e.x));
            const rightmost = Math.max(...formation.sprites.map(e => e.x));
            const lowestY = Math.max(...formation.sprites.map(e => e.y));

            // Check if formation has reached bottom
            if (lowestY >= ROWS - 5) {
                gameOver = true;
                autoPlay = true;
                scene.setGameOver(true);
                // Reset player position
                player.x = getValidColumn(Math.floor(COLS / 2));
                player.y = ROWS - 3;
            }

            // Handle wall collisions
            if (leftmost <= PLAY_AREA_LEFT || rightmost >= PLAY_AREA_RIGHT) {
                // Reverse direction and increase speed
                const currentSpeed = Math.abs(formation.velocity!.x);
                const newSpeed = currentSpeed * 1.2; // Increase speed by 20%
                scene.setGroupVelocity('enemies', 
                    leftmost <= PLAY_AREA_LEFT ? newSpeed : -newSpeed, 
                    0
                );
                
                // Move formation down
                formation.sprites.forEach(sprite => {
                    sprite.y += 1;
                });
            }
        }

    // Update systems
    pathSystem.update(deltaTime);
    scene.update(deltaTime);

    // Clean up out-of-bounds sprites
    scene.getSpritesWithTag('bullet').forEach(bullet => {
        if (bullet.y <= 4) scene.removeSprite(bullet); // Increased to account for new header height
    });
    scene.getSpritesWithTag('enemyBullet').forEach(bullet => {
        if (bullet.y >= ROWS - 3) scene.removeSprite(bullet);
    });

    // Clean up inactive sprites
    ['bullet', 'enemyBullet', 'enemy'].forEach(tag => {
        scene.getSpritesWithTag(tag).forEach(sprite => {
            if (!sprite.active) scene.removeSprite(sprite);
        });
    });

    // Draw game state
    draw();

    // Continue game loop
    gameLoop = requestAnimationFrame(gameUpdate);
}

function updateStats() {
    document.getElementById('score')!.textContent = score.toString();
    document.getElementById('lives')!.textContent = playerLives.toString();
}

// Drawing functions
function draw() {
    // Update border cells
    scene.setBorderCell(1, `SCORE: ${score.toString().padStart(5, '0')}`, {
        foreground: DOS_COLORS.LIGHT_BLUE,
        background: DOS_COLORS.BLACK,
        blink: false
    });
    scene.setBorderCell(2, `LEVEL ${currentLevel}`, {
        foreground: DOS_COLORS.LIGHT_BLUE,
        background: DOS_COLORS.BLACK,
        blink: false
    });
    scene.setBorderCell(3, `SHIPS: ${playerLives}`, {
        foreground: DOS_COLORS.LIGHT_BLUE,
        background: DOS_COLORS.BLACK,
        blink: false
    });

    // Draw scene (includes border and game over text)
    scene.draw();

    // Render to canvas
    render();
}

function writeChar(x: number, y: number, text: string, fg: number, bg: number) {
    const attrs: CellAttributes = {
        foreground: fg,
        background: bg,
        blink: false
    };
    if (typeof text === 'string') {
        for (let i = 0; i < text.length; i++) {
            buffer.writeChar(x + i, y, text[i], attrs);
        }
    }
}

function render() {
    const { cells } = buffer.getBufferData();
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = cells[y][x];
            if (cell) {
                ctx.font = '16px monospace';
                ctx.textBaseline = 'top';
                ctx.fillStyle = getPaletteColor(cell.attributes.foreground);
                ctx.fillText(
                    cell.char,
                    x * CELL_WIDTH,
                    y * CELL_HEIGHT
                );
            }
        }
    }
}

function getPaletteColor(index: number): string {
    const PALETTE = [
        '#000000', '#0000aa', '#00aa00', '#00aaaa',
        '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
        '#555555', '#5555ff', '#55ff55', '#55ffff',
        '#ff5555', '#ff55ff', '#ffff55', '#ffffff'
    ];
    return PALETTE[index];
}

document.addEventListener('keydown', (event) => {
    if (gameOver && event.code === 'KeyR') {
        autoPlay = false;
        initGame();
        lastTime = performance.now();
    }
});

// AI helper functions
function findNearestEnemy(): Sprite | null {
    const enemies = scene.getSpritesWithTag('enemy');
    if (enemies.length === 0) return null;
    
    let nearest = enemies[0];
    let minDist = Math.abs(nearest.x - player.x);
    
    enemies.forEach(enemy => {
        const dist = Math.abs(enemy.x - player.x);
        if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
        }
    });
    
    return nearest;
}

function updateAutoPlay() {
    if (!autoPlay) return;

    // Find nearest enemy
    const target = findNearestEnemy();
    if (!target) return;

    // Random movement pattern
    if (moveCooldown === 0) {
        // 30% chance to move randomly, 70% chance to move towards target
        if (Math.random() < 0.3) {
            const moveDirection = Math.random() < 0.5 ? -COLUMN_SPACING : COLUMN_SPACING;
            const newX = player.x + moveDirection;
            if (newX >= PLAY_AREA_LEFT && newX <= PLAY_AREA_RIGHT) {
                player.x = getValidColumn(newX);
            }
        } else if (Math.abs(target.x - player.x) > COLUMN_SPACING) {
            if (target.x < player.x && player.x > PLAY_AREA_LEFT) {
                player.x = getValidColumn(player.x - COLUMN_SPACING);
            } else if (target.x > player.x && player.x < PLAY_AREA_RIGHT) {
                player.x = getValidColumn(player.x + COLUMN_SPACING);
            }
        }
        moveCooldown = MOVE_COOLDOWN;
    }

    // Random shooting pattern with additional delay
    if (shootCooldown === 0) {
        // Only 10% chance to even consider shooting
        if (Math.random() < 0.1) {
            const bullets = scene.getSpritesWithTag('bullet');
            // Only shoot if we have less than 3 bullets
            if (bullets.length < 3) {
                const bullet = new Sprite({
                    x: player.x,
                    y: player.y - 1,
                    char: '*',
                    foreground: DOS_COLORS.WHITE,
                    background: DOS_COLORS.BLACK,
                    tag: 'bullet'
                });
                bullet.setVelocity(0, -BULLET_SPEED);
                scene.addSprite(bullet);
                shootCooldown = SHOOT_COOLDOWN * 2; // Double the cooldown for AI
            }
        }
    }
}

initGame();
lastTime = performance.now();
gameLoop = requestAnimationFrame(gameUpdate);

window.addEventListener('unload', () => {
    keyboard.cleanup();
    cancelAnimationFrame(gameLoop);
});
