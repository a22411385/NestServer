import { GamePlayer } from "../Game/GamePlayer";
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable, OnModuleDestroy, Scope } from "@nestjs/common";
import { GoogleSheetsService } from "src/Service/google-sheets.service";
import { Hero, Monster } from "src/Game/UnitSetting";
import { MonsterData, ProfessionData } from "src/Game/Combat/UnitData";

@Injectable({ scope: Scope.TRANSIENT })
export class GameService implements OnModuleDestroy {
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
    private Enemys: Monster[] = [];
    private eventEmitter: EventEmitter2
    private updateInterval: NodeJS.Timeout | null = null;

    //先固定一隻
    private enemyCount: number = 1;

    private maxCount: 1;
    constructor(private goolgeSheetService: GoogleSheetsService) {

        this._uniqueID = this.generateUniqueID();

    }


    public JoinPlayer(player: GamePlayer): boolean {

        if (this.players.has(player.id)) {
            console.error(`${player.id}玩家已經在房間裡`)
            return false;
        }
        console.log(`${player.id} 玩家加入房間 : ${this.UniqueID}`)
        player.state = 'waiting';
        this.players.set(player.id, player);
        return true;
    }

    public PlayerReady(player: GamePlayer) {

        let p = this.players.get(player.id);
        if (p != undefined) {

            p.state = 'ready';
        }
        let allReady = true;
        this.players.forEach(pp => { if (pp.state != 'ready') allReady = false });

        if (allReady) this.戰鬥開始();


    }

    public RemovePlayer(player: GamePlayer) {

        this.players.delete(player.id);
    }
    async Init() {

        let Profession = await this.goolgeSheetService.getSheetData('Profession') as ProfessionData[]
        console.log(Profession)
        let monster = await this.goolgeSheetService.getSheetData('Monster') as MonsterData[]
        console.log(monster)

        //初始化敵人
        for (let i = 0; i < this.enemyCount; i++) {
            let enemy = new Monster(monster[Math.floor(Math.random() * monster.length)]);
            this.Enemys.push(enemy);
        }
        for (let i in this.players) {

            //這裡要把所有玩家實體化
            let findP = Profession.find(item => item.ID == this.players.get(i)?.char.id);
            if (findP != undefined) {
                let p = new Hero(findP);
                this.PlayerTeam.push(p)
            }
        }

    }
    private async 戰鬥開始() {
        await this.Init();
        for (var i in this.PlayerTeam) {
            this.PlayerTeam[i].setTarget(this.Enemys[0]);
        }

        this.updateInterval = setInterval(this.Update.bind(this), 100);

    }

    //每0.1秒更新一次
    private Update() {

        const now = Date.now() / 1000; // 秒
        for (var i in this.Enemys) {

            this.Enemys[i].update(now);
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