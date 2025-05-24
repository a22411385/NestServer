import type { PlayerGameState, 職業種類 } from "./Enum";

export interface Character {
    id: number;
    name: string;
    lv: number;
    exp: number;
    type: 職業種類

}

export interface GameInit {

    id: number;
    roomId: string;
    state: PlayerGameState

}
