import type { Vector2 } from "./BattleMathUtils";
import type { PlayerGameState, 職業種類 } from "./Enum";


// 移動向量介面
export interface MoveVector {
    vx: number;
    vy: number;
}
export interface Character {
    id: number;
    name: string;
    lv: number;
    exp: number;
    type: 職業種類

}

export interface PlayerState {
    id: number;
    roomId: string;
    state: PlayerGameState
}

