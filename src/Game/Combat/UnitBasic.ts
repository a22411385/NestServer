
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 攻擊結果 } from './CombatInterface';
import { AttackPayload, BattleEvent, BattleEventType, DamagePayload, DeathPayload, MonsterKind, 傷害類型 } from "src/Shared/Enum";
import { randomUUID } from 'crypto';
// combat-component.ts
export interface UnitState {
    id: string;
    Hp: number;
    Mp: number;
    Atk: number;
    Def: number;
    AtkSpeed: number;
    Lv: number;
    Name: string;
}

//單位的基底
export abstract class BasicUnit {

    protected _uniqueID: string;
    public get UniqueID(): string {

        return this._uniqueID;
    }
    protected _name: string;
    public get Name(): string {
        return this._name;
    }

    // protected _isNpc: boolean;
    // public get IsNpc(): boolean {
    //     return this._isNpc;
    // }

    protected _playerId: string;
    public get PlayerId(): string {
        return this._playerId;
    }
    // state: UnitState;
    target: BasicUnit | null = null;
    type: MonsterKind = 'normal';
    team: string;
    //動態使用
    protected Hp: number;
    protected MaxHp: number;

    protected Mp: number;
    protected MaxMp: number;

    protected Atk: number;
    protected Def: number;

    protected _lv: number;
    public get Lv(): number {
        return this._lv;
    }
    attackInterval: number; // 秒
    lastAttackTime: number = 0; // 秒
    isDead: boolean;
    private event: EventEmitter2;

    constructor(initData: UnitState, event: EventEmitter2) {
        this._uniqueID = randomUUID();
        this.event = event;
        this.isDead = false;
        this.Hp = this.MaxHp = initData.Hp;
        this.Mp = this.MaxMp = initData.Mp;
        this.Atk = initData.Atk;
        this.attackInterval = initData.AtkSpeed;
        this._name = initData.Name;
        this._lv = initData.Lv;

    }

    update(currentTime: number) {
        if (this.isDead) return;

        if (this.target == null) {
            this.event.emit('unit.autoSelectTarget', this);
            return;
        }
        if (!this.target || this.target.isDead) return;

        if (currentTime - this.lastAttackTime >= this.attackInterval) {

            this.performBasicAttack();
            this.lastAttackTime = currentTime;
        }
    }

    performBasicAttack() {
        if (!this.target) return;

        const damage = this.Atk; // 暫定每次打10點傷害
        console.log(`[${this._name}] attacks [${this.target._name}] for ${damage} damage!`);

        const attackEvt: BattleEvent<AttackPayload> = {
            type: BattleEventType.Attack,
            timestamp: Date.now(),
            payload: { attackerId: this.UniqueID, targetId: this.target.UniqueID, skillId: 'basic' }
        };
        //通知client
        this.SendBattle(attackEvt);


        //實際造成傷害
        let attRes = this.target.receiveDamage(damage, 傷害類型.物理);

        if (attRes == 攻擊結果.目標被擊殺) {
            console.log(`[${this._name}] 擊殺 [${this.target._name}]!`);
            this.event.emit('unit.autoSelectTarget', this);
            this.event.emit('unit.killTarget', this, this.target);
        }
    }

    //收到任何傷害
    receiveDamage(amount: number, damageType: 傷害類型): 攻擊結果 {
        if (this.isDead) return 攻擊結果.失敗;

        this.Hp -= amount;
        console.log(`[${this._name}] received ${amount} damage. HP: ${this.Hp}/${this.MaxHp}`);

        const damageEvt: BattleEvent<DamagePayload> = {
            type: BattleEventType.Damage,
            timestamp: Date.now(),
            payload: { targetId: this.UniqueID, amount: amount, damageType: damageType }
        };
        this.SendBattle(damageEvt);

        if (this.Hp <= 0) {
            this.Hp = 0;
            this.isDead = true;
            console.log(`[${this._name}] has died.`);

            if (this.isDead) {
                const deathEvt: BattleEvent<DeathPayload> = {
                    type: BattleEventType.Death,
                    timestamp: Date.now(),
                    payload: { targetId: this.UniqueID, lv: this.Lv, type: 'normal' }
                };
                this.event.emit('battleEvent', deathEvt);
            }
            return 攻擊結果.目標被擊殺
        }
        return 攻擊結果.命中
    }


    setTarget(target: BasicUnit) {
        this.target = target;
    }



    //幫忙轉送
    SendBattle<T>(evnt: BattleEvent<T>) {
        this.event.emit('battleEvent', evnt);
    }

}