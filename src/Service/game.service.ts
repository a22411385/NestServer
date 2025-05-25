import { GamePlayer } from "../Game/GamePlayer";
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable, OnModuleDestroy, Scope } from "@nestjs/common";
import { Hero, Monster } from "src/Game/UnitSetting";
import { BasicUnit } from "src/Game/Combat/UnitBasic";
import { BattleEvent, BattleEventType, MonsterKind, PlayerGameState } from "src/Shared/Enum";
import { randomUUID } from 'crypto';
import { ItemFactoryService } from "./ItemFactory.service";
import { CharacterORM } from "src/ORM/charater.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LevelUtils } from "src/Util/Utils";
import { MessageID } from "src/Shared/MessageID";

import { SurviveGame } from "src/Game/SurviveGame";


export enum UnitEvent {
    AutoSelect = 'unit.autoSelectTarget',
    KillTarget = 'unit.killTarget',
    Battle = 'battleEvent',
}
@Injectable({ scope: Scope.TRANSIENT })
export class GameService implements OnModuleDestroy {
    private gameMain: SurviveGame = new SurviveGame();

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

    constructor(
        @InjectRepository(CharacterORM)
        private readonly characterRepo: Repository<CharacterORM>,
        private eventEmitter: EventEmitter2,
        private readonly Itemfactory: ItemFactoryService) {

        this._uniqueID = randomUUID();
        this.registerUnitEvents();

    }
    //註冊事件
    private registerUnitEvents() {
        this.eventEmitter.on(
            UnitEvent.AutoSelect,
            (unit: BasicUnit) => this.自動尋敵(unit),
        );
        this.eventEmitter.on(
            UnitEvent.KillTarget,
            (unit: BasicUnit, target: BasicUnit) => this.擊殺目標(unit, target),
        );
        this.eventEmitter.on(UnitEvent.Battle, event => {
            this.eventEmitter.emit('game.battleEvent', { roomId: this._uniqueID, data: event });
        });
    }

    //#region 玩家進入/準備/離開

    //玩家進入
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
    //#endregion


    async Init() {

        console.log(`${this.Enemys.length} 個敵人出現 !!`);

        // this._players.forEach(pp => {
        //     //這裡要把所有玩家實體化
        //     let findP = Profession.find(item => item.ID == pp.char.type);
        //     if (findP != undefined) {
        //         let p = new Hero(pp.char.Lv, pp.id, findP, this.eventEmitter);
        //         p.team = "player";
        //         p.userName = pp.userName;
        //         this.PlayerTeam.push(p)
        //     } else {
        //         console.error('生成職業錯誤:', pp.char.type);
        //     }
        // });
        this.SendBattleEvent(BattleEventType.Init, {
            players: this.PlayerTeam,

        });

    }
    擊殺目標(unit: BasicUnit, target: BasicUnit) {

        let pp = this.Players.get(unit.PlayerId);
        //找到單位擁有玩家
        if (pp) {
            pp.killList.push({

                lv: target.Lv,
                type: target.type,
                uniqueID: target.UniqueID

            });

        }
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

        this.gameMain.Update();
        // for (var i in this.Enemys) {

        //     this.Enemys[i].update(now);
        //     //playerB.update(now);
        // }
        // for (var i in this.PlayerTeam) {
        //     this.PlayerTeam[i].update(now);
        // }


        // if (this.Enemys.filter(x => !x.isDead).length == 0 || this.PlayerTeam.filter(x => !x.isDead).length == 0) {
        //     this.clearTimer();
        //     this.遊戲結束();
        // }
    }




    private 給經驗(playerLv: number, monsterLv: number, expToNext: number, type: MonsterKind): number {

        const diff = monsterLv - playerLv;
        const levelBias = Math.max(0.1, 1 + 0.05 * diff); // 高等怪補正
        const typeFactor = type === 'boss' ? 5 : type === 'elite' ? 2 : 1;
        return Math.floor(expToNext * 0.1 * typeFactor * levelBias);

    }

    private async 結算() {

        console.log("開始結算");
        for (const [key, pp] of this.Players) {

            if (pp)
                for (let ii = 0; ii < pp.killList.length; ii++) {

                    let target = pp.killList[ii]
                    let exp = this.給經驗(pp.char.Lv, target.lv, LevelUtils.expTable[pp.char.Lv].Exp, target.type)
                    console.log(`[${pp.char.name}] 獲得經驗: ${exp}`);

                    let items = this.Itemfactory.generateDrops({ level: target.lv, kind: target.type });
                    console.log(`[${pp.char.name}] 獲得道具:`, items);
                    await this.Itemfactory.saveItems(items, pp.char.id);

                    pp.char.exp += exp;
                    await this.characterRepo.save(pp.char);

                    pp.socket?.emit(MessageID.BATTLE_EVENT, {
                        type: BattleEventType.GameOver,
                        timestamp: Date.now(),
                        payload: {
                            exp: exp,
                            items: items
                        }
                    } as BattleEvent);
                }

        }
    }
    private async 遊戲結束() {

        console.log("遊戲結束");
        await this.結算();
        console.log(`[房間 ${this._uniqueID}] 遊戲結束`);

        this.eventEmitter.emit('room.close', { roomId: this._uniqueID });
    }

    private SendBattleEvent<T>(type: BattleEventType, data: T) {

        let event: BattleEvent<T> = {
            type: type,
            payload: data,
            timestamp: Date.now()
        }

        this.eventEmitter.emit('game.battleEvent', { roomId: this._uniqueID, data: event });
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