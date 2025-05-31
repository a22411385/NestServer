export interface Hero {
    id: string;
    name: string;
    x: number;
    y: number;

}
export interface HttpRespone {
    content: unknown;
    errorCode: number;

}

export interface Snapshot {
    frameId: number;
    players: Hero[];

    // projectiles: {
    //     id: string;
    //     x: number;
    //     y: number;
    //     vx: number;
    //     vy: number;
    //     ownerId: string;
    // }[];

    monsters: {
        id: string;
        state: string;
        x: number;
        y: number;
        hp: number;
    }[];

    // worldState: {
    //     time: number;
    //     weather: string;
    // };
}