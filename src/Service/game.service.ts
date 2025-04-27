import { GamePlayer } from "../Game/GamePlayer";
import { Monster } from "../Game/Monster";
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable, OnModuleDestroy, Scope } from "@nestjs/common";
import { GoogleSheetsService } from "src/Service/google-sheets.service";
import { Hero } from "src/Game/Basic";

@Injectable({ scope: Scope.TRANSIENT })
export class GameSerivce implements OnModuleDestroy {
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
    private PlayerTeam: Hero[] = [];
    private Emenys: Monster[] = [];
    private eventEmitter: EventEmitter2
    private updateInterval: NodeJS.Timeout | null = null;

    //先固定一隻
    private enemyCount: number = 1;

    constructor(private goolgeSheetService: GoogleSheetsService) {

        this._uniqueID = this.generateUniqueID();

        this.戰鬥開始();
    }
    private async InitPlayers() {

        let res = await this.goolgeSheetService.getSheetData('Profession')
        console.log(res)
        let monster = await this.goolgeSheetService.getSheetData('Monster')
        console.log(monster)

        //初始化敵人
        for (let i = 0; i < this.enemyCount; i++) {
            let enemy = new Monster(0);
            enemy.Init();
            this.Emenys.push(enemy);
        }


        //這裡要把所有玩家實體化
        let p = new Hero(0);
        this.PlayerTeam.push(p)

    }
    private 戰鬥開始() {
        //初始化玩家資料
        this.InitPlayers();
        this.updateInterval = setInterval(this.Update.bind(this), 100);

        for (var i in this.PlayerTeam) {
            this.PlayerTeam[i].setTarget(this.Emenys[0]);
        }
    }

    //每0.1秒更新一次
    private Update() {

        const now = Date.now() / 1000; // 秒
        for (var i in this.Emenys) {

            this.Emenys[i].update(now);
            //playerB.update(now);
        }
        for (var i in this.PlayerTeam) {
            this.PlayerTeam[i].update(now);
        }
    }

    private 遊戲結束() {
        this.clearTimer();
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

    onModuleDestroy() {
        console.log(`[房間 ${this._uniqueID}] GameService 被銷毀，清理資源`);
        this.clearTimer();
    }
    private clearTimer() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

}