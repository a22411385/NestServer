import { GamePlayer } from "./Player";
import { Monster } from "./Monster";
import { EventEmitter2 } from '@nestjs/event-emitter';

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

    //玩家
    private players: Map<string, GamePlayer> = new Map;
    private Emenys: Monster[];
    private eventEmitter: EventEmitter2

    constructor(roomName: string, areaID: number) {

        this._uniqueID = this.generateUniqueID();
        this._roomName = roomName;
        this._areaId = areaID;

        this.戰鬥開始();
    }
    private InitPlayers() {
        //這裡要把所有玩家實體化

    }
    private 戰鬥開始() {
        //初始化玩家資料
        this.InitPlayers();



    }

    private 遊戲結束() {
        this.eventEmitter.emit('room.close', { roomId: this._uniqueID });
    }

    public JoinPlayer(player: GamePlayer): boolean {

        if (this.players.has(player.id)) {
            console.error(`${player.id}玩家已經在房間裡`)
            return false;
        }
        this.players.set(player.id, player);
        return true;
    }
    public RemovePlayer(player: GamePlayer) {

        this.players.delete(player.id);
    }

    // public GetPlayersId(): number[] {

    //     return Array.from(this.players.keys());
    // }
    private generateUniqueID(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

}