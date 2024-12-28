import { Sprite } from './Sprite';

export interface State {
    name: string;
    [key: string]: any;
}

export interface StateTransition<T extends State> {
    from: string | string[];
    to: string;
    condition: (entity: Entity<T>, currentState: T) => boolean;
}

export class Entity<T extends State> {
    sprite: Sprite;
    private currentState: T;
    private states: Map<string, T>;
    private transitions: StateTransition<T>[];
    private onStateChange?: (from: T, to: T) => void;

    constructor(sprite: Sprite, initialState: T) {
        this.sprite = sprite;
        this.states = new Map();
        this.transitions = [];
        this.addState(initialState);
        this.currentState = initialState;
    }

    addState(state: T): void {
        this.states.set(state.name, state);
    }

    addTransition(transition: StateTransition<T>): void {
        this.transitions.push(transition);
    }

    setOnStateChange(handler: (from: T, to: T) => void): void {
        this.onStateChange = handler;
    }

    getCurrentState(): T {
        return this.currentState;
    }

    setState(stateName: string): boolean {
        const newState = this.states.get(stateName);
        if (newState) {
            const oldState = this.currentState;
            this.currentState = newState;
            if (this.onStateChange) {
                this.onStateChange(oldState, newState);
            }
            return true;
        }
        return false;
    }

    update(): void {
        for (const transition of this.transitions) {
            const fromStates = Array.isArray(transition.from) ? 
                transition.from : 
                [transition.from];

            if (fromStates.includes(this.currentState.name) && 
                transition.condition(this, this.currentState)) {
                this.setState(transition.to);
                break;
            }
        }
    }

    getStateData<K extends keyof T>(key: K): T[K] {
        return this.currentState[key];
    }

    setStateData<K extends keyof T>(key: K, value: T[K]): void {
        this.currentState[key] = value;
    }
}

export class EntityManager<T extends State> {
    private entities: Entity<T>[] = [];

    addEntity(entity: Entity<T>): void {
        this.entities.push(entity);
    }

    removeEntity(entity: Entity<T>): void {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    }

    getEntitiesInState(stateName: string): Entity<T>[] {
        return this.entities.filter(entity => 
            entity.getCurrentState().name === stateName
        );
    }

    update(): void {
        this.entities.forEach(entity => entity.update());
    }

    clear(): void {
        this.entities = [];
    }
}
