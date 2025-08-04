

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
// --- Enemy (Zombie) Schema ---
export class Enemy extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") hp: number = 10;
    @type("number") maxHp: number = 10;
    @type("number") speed: number = 1;
    @type("number") type: number = 1; // 可擴充不同殭屍類型
}

// --- Item (道具) Schema ---
export class Item extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("string") itemType: string = "exp"; // exp, heal, buff ...
    @type("number") value: number = 1;
}

export class GameRoomState extends Schema {
    @type({ map: GamePlayer }) players = new MapSchema<GamePlayer>();
    @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
    @type({ map: Item }) items = new MapSchema<Item>();
    @type("string") roomName: string = "";
    @type("number") maxPlayers: number = 6;
    @type("string") state: gameStateTag = "waiting"
    @type(GameCoreState) gameCore: GameCoreState = new GameCoreState;
}
