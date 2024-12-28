# Retro Game Framework Goals

Create a minimal ASCII/text-based game framework for the retro-ui-lib that makes it easy to build games like Gologo (Galaga clone). The framework should be:

1. Simple to use
2. Focused on ASCII/text-based games
3. Minimal but extensible

## Core Components

### Scene Management
- Sprite container and manager
- Advanced collision system:
  - Tag-based collision detection
  - Group-based collision handling
  - Collision callbacks with sprite parameters
- Scene configuration:
  - Custom title with attributes
  - Level progression system
  - Game over state handling
  - Border cell text updates
- Group management:
  - Create and manage sprite groups
  - Group velocity control
  - Group-based movement patterns
- Scene bounds handling
- Efficient updates and rendering

### Sprite System
- Basic sprite with position, character, colors
- Advanced movement:
  - Velocity system (setVelocity)
  - Group-based movement
  - Relative positioning
- Collision detection
- Tag-based identification
- Active/inactive state tracking
- Group membership

### Path System
- Complex movement patterns using points
- Support for linear and curved paths
- Path looping capabilities
- Direction calculation for sprite orientation
- Easy integration with sprite system

### Entity State System
- Flexible state management for game entities
- State transitions with conditions
- State-specific data and behavior
- Entity grouping and filtering
- Event handling for state changes

### Border UI System
- DOS-style border rendering
- Configurable headers and sections
- Dynamic border cell updates
- Centered text utilities
- Consistent styling across games

### DOS Colors System
- Standard DOS color palette
- Type-safe color constants
- Color attribute management
- Palette color conversion utilities

## Example Usage

```typescript
// Create a scene with border and configuration
const scene = new Scene({
    buffer: videoBuffer,
    borderUI: border,
    title: "GAME TITLE",
    titleAttrs: {
        foreground: DOS_COLORS.YELLOW,
        background: DOS_COLORS.BLACK,
        blink: false
    },
    levelConfig: {
        speedMultiplier: 0.2, // 20% speed increase per level
        onLevelComplete: () => {
            currentLevel++;
            // Level completion logic
        }
    },
    gameOverConfig: {
        text: 'GAME OVER - PRESS R TO RESTART',
        color: DOS_COLORS.YELLOW,
        backgroundColor: DOS_COLORS.BLACK,
        verticalPosition: 0.4
    }
});

// Create and manage sprite groups
const enemyGroup = scene.createGroup('enemies');
const enemy = new Sprite({
    x: 40,
    y: 10,
    char: 'V',
    foreground: DOS_COLORS.LIGHT_RED,
    background: DOS_COLORS.BLACK,
    tag: 'enemy'
});
scene.addSprite(enemy);
scene.addToGroup('enemies', enemy);

// Set group velocity
scene.setGroupVelocity('enemies', 2, 0);

// Set up collision handlers
scene.onCollision('bullet', 'enemy', (bullet, enemy) => {
    scene.removeSprite(bullet);
    scene.removeSprite(enemy);
    score += 100;
});

// Update border cells dynamically
scene.setBorderCell(1, `SCORE: ${score}`, {
    foreground: DOS_COLORS.LIGHT_BLUE,
    background: DOS_COLORS.BLACK,
    blink: false
});

// Set up enemy with path movement
const pathSystem = new PathSystem();
pathSystem.addSprite(enemy, {
    points: [
        { x: 0, y: 0 },
        { x: -10, y: 10 },
        { x: 10, y: 10 },
        { x: 0, y: 0 }
    ],
    speed: 1,
    loop: true
});

// Set up entity state management
const entityManager = new EntityManager();
const enemyEntity = new Entity(enemy, {
    name: 'patrol',
    direction: 'right',
    attackReady: true
});

enemyEntity.addState({
    name: 'attack',
    direction: 'down',
    attackReady: false
});

enemyEntity.addTransition({
    from: 'patrol',
    to: 'attack',
    condition: (entity) => {
        return entity.getStateData('attackReady') && 
               Math.random() < 0.01;
    }
});

// Game loop
function update(deltaTime: number) {
    pathSystem.update(deltaTime);
    entityManager.update();
    scene.update(deltaTime);
    
    border.draw();
    scene.draw();
}
```

## Design Principles

1. Keep it focused on ASCII/text-based games
2. Make common game patterns easy to implement
3. Allow flexibility for different game types
4. Maintain simplicity over feature completeness
5. Enable quick prototyping of retro-style games

## Future Considerations

- Animation system for character-based sprites
- Sound effects integration
- Input action mapping
- Particle system for ASCII-based effects
- Dialog and menu systems
