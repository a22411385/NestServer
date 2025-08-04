import { Schema, type, MapSchema } from "@colyseus/schema";
export type gameStateTag = "waiting" | 'playing' | 'finished' | 'pedding';
export interface PlayerInfo {
    id: string;
    name: string;
    characterId: number;
    isReady: boolean;
    isHost: boolean;
}

export class GamePlayer extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("number") characterId: number = 1;
    @type("boolean") isReady: boolean = false;
    @type("boolean") isHost: boolean = false;
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") hp: number = 100;
    @type("number") maxHp: number = 100;
    @type("number") level: number = 1;
    @type("number") exp: number = 0;
}

export class GameCoreState extends Schema {

    // 遊戲設置
    @type("number") waveNumber: number = 1;
    @type("number") zombieCount: number = 0;
    @type("number") totalZombies: number = 0;
    @type("number") gameTime: number = 0;

}


export class GameRoomState extends Schema {
    @type({ map: GamePlayer }) players = new MapSchema<GamePlayer>();
    @type("string") roomName: string = "";
    @type("number") maxPlayers: number = 6;
    @type("string") state: gameStateTag = "waiting"

    @type(GameCoreState) gameCore: GameCoreState = new GameCoreState;

}
