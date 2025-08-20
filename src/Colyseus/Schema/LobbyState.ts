import { Schema, type, MapSchema } from "@colyseus/schema";
import { RoomStateType } from "./GameState";

export class LobbyRoomInfo extends Schema {
    @type("string") roomId: string = "";
    @type("string") roomName: string = "";
    @type("string") hostName: string = "";
    @type("number") currentPlayers: number = 0;
    @type("number") maxPlayers: number = 6;
    @type("string") state: RoomStateType = "waiting";
    @type("boolean") isPrivate: boolean = false;

}

export class LobbyPlayer extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("number") characterId: number = 0;
    @type("number") level: number = 1;
    @type("string") status: string = "idle";

}

export class LobbyState extends Schema {
    @type({ map: LobbyRoomInfo }) rooms = new MapSchema<LobbyRoomInfo>();
    @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();


}
