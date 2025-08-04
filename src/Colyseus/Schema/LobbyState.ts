import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * 房間資訊介面
 * 用於業務邏輯和 Schema 之間的數據轉換
 */
export interface RoomInfo {
    roomId: string;
    roomName: string;
    hostName: string;
    currentPlayers: number;
    maxPlayers: number;
    isStarted: boolean;
    isPrivate: boolean;
}

/**
 * 大廳房間資訊 Schema
 * 僅用於 Colyseus 狀態同步，不包含業務邏輯
 */
export class LobbyRoomInfo extends Schema {
    @type("string") roomId: string = "";
    @type("string") roomName: string = "";
    @type("string") hostName: string = "";
    @type("number") currentPlayers: number = 0;
    @type("number") maxPlayers: number = 6;
    @type("boolean") isStarted: boolean = false;
    @type("boolean") isPrivate: boolean = false;
}

/**
 * 大廳玩家資訊 Schema
 * 僅用於 Colyseus 狀態同步，不包含業務邏輯
 */
export class LobbyPlayer extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("number") characterId: number = 0;
    @type("number") level: number = 1;
    @type("string") status: "idle" | "inRoom" | "playing" = "idle";
}

/**
 * 大廳狀態 Schema
 * 僅用於 Colyseus 狀態同步，不包含業務邏輯
 */
export class LobbyState extends Schema {
    @type({ map: LobbyRoomInfo }) rooms = new MapSchema<LobbyRoomInfo>();
    @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();
    @type("number") totalRooms: number = 0;
    @type("number") totalPlayers: number = 0;
}
