import { GamePlayer } from "../Game/GamePlayer";
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Injectable, OnModuleDestroy, Scope } from "@nestjs/common";
import { GoogleSheetsService } from "src/Service/google-sheets.service";
import { Hero, Monster } from "src/Game/UnitSetting";
import { MonsterData, ProfessionData } from "src/Game/Combat/UnitData";
import { BasicUnit } from "src/Game/Combat/UnitBasic";

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

    private updateInterval: NodeJS.Timeout | null = null;

    //先固定一隻
    private enemyCount: number = 2;

    private maxCount: 1;
    constructor(private goolgeSheetService: GoogleSheetsService, private eventEmitter: EventEmitter2) {

        this._uniqueID = this.generateUniqueID();
        this.eventEmitter.on(
            'unit.autoSelectTarget',
            (unit: BasicUnit) => this.自動尋敵(unit),
        );
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

        if (allReady) {
            this.戰鬥開始();
        }

    }

    public RemovePlayer(player: GamePlayer) {

        this.players.delete(player.id);
    }
    async Init() {

        let Profession = await this.goolgeSheetService.getSheetData('Profession') as ProfessionData[]
        console.log(Profession)
        let monster = await this.goolgeSheetService.getSheetData('Monster') as MonsterData[]
        console.log(monster)

        this.enemyCount = 3;

        //初始化敵人
        for (let i = 0; i < this.enemyCount; i++) {
            let enemy = new Monster(monster[Math.floor(Math.random() * monster.length)], this.eventEmitter);
            enemy.team = "enemy";
            this.Enemys.push(enemy);
        }

        console.log(`${this.Enemys.length} 個敵人出現 !!`);

        this.players.forEach(pp => {
            //這裡要把所有玩家實體化
            let findP = Profession.find(item => item.ID == pp.char.type);
            if (findP != undefined) {
                let p = new Hero(findP, this.eventEmitter);
                p.team = "player";
                this.PlayerTeam.push(p)
            }
        });
    }


    public 自動尋敵(unit: BasicUnit) {
        let target: BasicUnit | undefined;
        if (unit.team != "player") {
            target = this.PlayerTeam.find((item) => !item.isDead);
        } else {
            target = this.Enemys.find((item) => !item.isDead);
        }
        if (target) {
            console.log(`[${unit.Name}] 重新鎖定目標: [${target.Name}]`)
            unit.setTarget(target);
        }
        //  unit.setTarget()

    }


    private async 戰鬥開始() {
        await this.Init();
        for (var i in this.PlayerTeam) {
            let fisrtEenmy = this.Enemys.find((item) => !item.isDead);
            if (fisrtEenmy)
                this.PlayerTeam[i].setTarget(fisrtEenmy);
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


        if (this.Enemys.filter(x => !x.isDead).length == 0 || this.PlayerTeam.filter(x => !x.isDead).length == 0) {
            console.log("遊戲結束");
            this.遊戲結束();
        }
    }

    private 遊戲結束() {
        console.log(`[房間 ${this._uniqueID}] 遊戲結束`);
        this.clearTimer();
        this.eventEmitter.emit('room.close', { roomId: this._uniqueID });
    }

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