import { GamePlayer } from "../Game/GamePlayer";
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Injectable, OnModuleDestroy, Scope } from "@nestjs/common";
import { GoogleSheetsService } from "src/Service/google-sheets.service";
import { Hero, Monster } from "src/Game/UnitSetting";
import { ExperienceData, MonsterData, ProfessionData } from "src/Game/Combat/UnitData";
import { BasicUnit } from "src/Game/Combat/UnitBasic";
import { PlayerGameState } from "src/Shared/Enum";
import { randomUUID } from 'crypto';


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
    private _players: Map<string, GamePlayer> = new Map;
    public get Players(): Map<string, GamePlayer> {
        return this._players;
    }
    private PlayerTeam: Hero[] = [];
    private Enemys: Monster[] = [];

    private updateInterval: NodeJS.Timeout | null = null;
    private expTable: ExperienceData[] = [];
    //先固定一隻
    private enemyCount: number = 1;

    private maxCount: 1;
    constructor(private goolgeSheetService: GoogleSheetsService, private eventEmitter: EventEmitter2) {

        this._uniqueID = randomUUID();
        this.eventEmitter.on(
            'unit.autoSelectTarget',
            (unit: BasicUnit) => this.自動尋敵(unit),
        );

        this.eventEmitter.on('battleEvent', event => {

            this.eventEmitter.emit('game.battleEvent', { roomId: this._uniqueID, data: event });

        });
        this.LoadTableData();

    }
    public async LoadTableData() {
        this.goolgeSheetService.InitData([
            { tableName: "ExperienceTable", classType: ExperienceData }
        ]),
            this.expTable = await this.goolgeSheetService.getSheetData<ExperienceData>('ExperienceTable');
    }

    public JoinPlayer(player: GamePlayer): boolean {

        if (this._players.has(player.id)) {
            console.error(`${player.id}玩家已經在房間裡`)
            return false;
        }
        console.log(`${player.id} 玩家加入房間 : ${this.UniqueID}`)
        player.state = PlayerGameState.WAITING;
        this._players.set(player.id, player);
        return true;
    }

    public PlayerReady(player: GamePlayer) {

        let p = this._players.get(player.id);
        if (p != undefined) {

            p.state = PlayerGameState.READY;
        }
        let allReady = true;
        this._players.forEach(pp => { if (pp.state != 'ready') allReady = false });

        if (allReady) {
            this.戰鬥開始();
        }

    }

    public RemovePlayer(player: GamePlayer) {

        this._players.delete(player.id);
    }
    async Init() {

        let Profession = await this.goolgeSheetService.getSheetData('Profession') as ProfessionData[]
        console.log(Profession)
        let monster = await this.goolgeSheetService.getSheetData('Monster') as MonsterData[]
        console.log(monster)

        //初始化敵人
        for (let i = 0; i < this.enemyCount; i++) {
            let enemy = new Monster(monster[Math.floor(Math.random() * monster.length)], this.eventEmitter);
            enemy.team = "enemy";
            this.Enemys.push(enemy);
        }

        console.log(`${this.Enemys.length} 個敵人出現 !!`);

        this._players.forEach(pp => {
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
    private 給經驗(playerLv: number, monsterLv: number, expToNext: number, type: 'normal' | 'elite' | 'boss'): number {



        const diff = monsterLv - playerLv;
        const levelBias = Math.max(0.1, 1 + 0.05 * diff); // 高等怪補正
        const typeFactor = type === 'boss' ? 5 : type === 'elite' ? 2 : 1;
        return Math.floor(expToNext * 0.1 * typeFactor * levelBias);

    }
    private 掉寶() {

    }
    private 結算() {

    }
    private 遊戲結束() {
        this.結算();
        console.log(`[房間 ${this._uniqueID}] 遊戲結束`);
        this.clearTimer();
        this.eventEmitter.emit('room.close', { roomId: this._uniqueID });
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