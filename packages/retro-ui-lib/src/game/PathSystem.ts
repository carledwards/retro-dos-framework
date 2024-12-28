import { Sprite } from './Sprite';

export interface Point {
    x: number;
    y: number;
}

export interface Path {
    points: Point[];
    speed: number;
    loop?: boolean;
}

export interface PathState {
    path: Path;
    time: number;
    complete: boolean;
    startX: number;
    startY: number;
}

export class PathSystem {
    private paths: Map<Sprite, PathState> = new Map();

    addSprite(sprite: Sprite, path: Path): void {
        this.paths.set(sprite, {
            path,
            time: 0,
            complete: false,
            startX: sprite.x,
            startY: sprite.y
        });
    }

    removeSprite(sprite: Sprite): void {
        this.paths.delete(sprite);
    }

    isComplete(sprite: Sprite): boolean {
        const state = this.paths.get(sprite);
        return state ? state.complete : true;
    }

    update(deltaTime: number): void {
        this.paths.forEach((state, sprite) => {
            if (state.complete && !state.path.loop) return;

            state.time += deltaTime * state.path.speed;
            const pathLength = state.path.points.length - 1;
            const t = state.path.loop ? 
                state.time % pathLength :
                Math.min(state.time, pathLength);
            
            const segment = Math.floor(t);
            const segmentT = t - segment;

            if (segment < pathLength) {
                const p0 = state.path.points[segment];
                const p1 = state.path.points[segment + 1];

                sprite.x = state.startX + p0.x + (p1.x - p0.x) * segmentT;
                sprite.y = state.startY + p0.y + (p1.y - p0.y) * segmentT;
            }

            if (!state.path.loop && t >= pathLength) {
                state.complete = true;
            }
        });
    }

    getDirection(sprite: Sprite): { dx: number; dy: number } | null {
        const state = this.paths.get(sprite);
        if (!state || state.complete) return null;

        const pathLength = state.path.points.length - 1;
        const t = Math.min(state.time, pathLength);
        const segment = Math.floor(t);

        if (segment < pathLength) {
            const p0 = state.path.points[segment];
            const p1 = state.path.points[segment + 1];
            return {
                dx: p1.x - p0.x,
                dy: p1.y - p0.y
            };
        }

        return null;
    }
}
