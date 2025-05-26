export interface HttpRespone {
    content: unknown;
    errorCode: number;

}

export interface Snapshot {
    frameId: number;

    players: Record<string, {
        x: number;
        y: number;
        hp: number;
        animation: string;
        status: string[]; // e.g. ['stunned', 'burning']
    }>;

    projectiles: {
        id: string;
        x: number;
        y: number;
        vx: number;
        vy: number;
        ownerId: string;
    }[];

    monsters: {
        id: string;
        type: string;
        x: number;
        y: number;
        hp: number;
    }[];

    worldState: {
        time: number;
        weather: string;
    };
}