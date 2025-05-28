
export interface HttpRespone {
    content: unknown;
    errorCode: number;

}

export interface Snapshot {
    frameId: number;
    players: {
        Lv: number,
        Mp: number,
        Hp: number,
        Atk: number,
        AtkSpeed: number,
        Name: string,
        id: string
    }[];

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