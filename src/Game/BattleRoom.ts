import { Socket } from "socket.io";
import { UserData } from "./DataCenter";
import { Monster } from "./Monster";
import { Player } from "./Player";


export class BattleRoom {
    private _uniqueID: string;
    public get UniqueID(): string {
        return this._uniqueID;
    }
    private _roomName: string;
    public get RoomName(): string {
        return this._roomName;
    }
    private _areaId: number;


    // private Round: number;
    // private players: UserData[];
    // private isSinglePlayer: boolean;

    // private Emenys: Monster[];
    private playerList: Map<number, Socket> = new Map;

    constructor(roomName: string, areaID: number) {

        this._uniqueID = this.generateUniqueID();
        this._roomName = roomName;
        this._areaId = areaID;

        // this.players = players;
        // this.uniqueID = this.generateUniqueID();

        // for (var i in players) {
        //     if (players[i].character == null) {

        //         throw 'some player data null';
        //     }
        //     players[i].player = new Player(players[i].character);
        // }
        // this.戰鬥開始();
    }

    public SetPlayer(playerId: number, socket: Socket) {

        this.playerList.set(playerId, socket);
    }
    public RemovePlayer(playerId: number) {

        this.playerList.delete(playerId);
    }

    public GetPlayersId(): number[] {

        return Array.from(this.playerList.keys());
    }
    private generateUniqueID(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

}