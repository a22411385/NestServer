
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 攻擊結果 } from './CombatInterface';
import { AttackPayload, BattleEvent, BattleEventType, DamagePayload, DeathPayload, MonsterKind, 傷害類型 } from "src/Shared/Enum";
import { randomUUID } from 'crypto';
import { AABB } from '../UnitSetting';
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

    protected _playerId: string;
    public get PlayerId(): string {
        return this._playerId;
    }
    // state: UnitState;
    target: BasicUnit | null = null;
    type: MonsterKind = 'normal';
    team: string;
    attackRange: number;


    x: number;
    y: number;
    width: number = 50; // 寬度
    height: number = 100; // 高度
    speed: number = 10;

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
    protected isNPC: boolean;
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

        if (this.target == null && this.isNPC) {
            this.event.emit('unit.autoSelectTarget', this);
            return;
        }
        if (!this.target || this.target.isDead) return;

        if (currentTime - this.lastAttackTime >= this.attackInterval && this.checkAttackRange(this, this.target)) {

            this.performBasicAttack();
            this.lastAttackTime = currentTime;
        }
    }


    checkAttackRange(attacker: BasicUnit, target: BasicUnit): boolean {
        const dx = attacker.x - target.x;
        const dy = attacker.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= attacker.attackRange;
    }
    //嘗試攻擊
    performBasicAttack() {
        if (!this.target) return;

        const damage = this.Atk; // 暫定每次打10點傷害
        console.log(`[${this._name}] attacks [${this.target._name}] for ${damage} damage!`);



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

    getBounds(): AABB {
        return new AABB(this.x, this.y, this.width, this.height);
    }

    isCollideWith(other: BasicUnit): boolean {
        return this.getBounds().isCollide(other.getBounds());
    }

    //幫忙轉送
    SendBattle<T>(evnt: BattleEvent<T>) {
        this.event.emit('battleEvent', evnt);
    }
    public toJSON() {
        return {
            id: this._uniqueID,
            name: this.Name,
            hp: this.Hp,
            mp: this.Mp,
            maxHp: this.MaxHp,
            maxMp: this.MaxMp,
            lv: this.Lv,
            x: this.x,
            y: this.y,
            speed: this.speed
        };
    }
}