
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 攻擊結果 } from './CombatInterface';

// combat-component.ts
export interface UnitState {
    id: number;
    Hp: number;
    Mp: number;
    Atk: number;
    Def: number;
    AtkSpeed: number;

    Name: string;
}

//單位的基底
export abstract class BasicUnit {

    protected _name: string;
    public get Name(): string {
        return this._name;
    }
    // state: UnitState;
    target: BasicUnit | null = null;

    //動態使用
    protected Hp: number;
    protected MaxHp: number;

    protected Mp: number;
    protected MaxMp: number;

    protected Atk: number;
    protected Def: number;

    attackInterval: number; // 秒
    lastAttackTime: number = 0; // 秒
    isDead: boolean;

    private event: EventEmitter2;

    constructor(initData: UnitState, event: EventEmitter2) {
        this.event = event;
        this.isDead = false;
        this.Hp = this.MaxHp = initData.Hp;
        this.Mp = this.MaxMp = initData.Mp;
        this.Atk = initData.Atk;
        this.attackInterval = initData.AtkSpeed;
        this._name = initData.Name;

    }

    update(currentTime: number) {
        if (this.isDead) return;
        if (!this.target || this.target.isDead) return;

        if (currentTime - this.lastAttackTime >= this.attackInterval) {

            this.performBasicAttack();
            this.lastAttackTime = currentTime;
        }
    }

    performBasicAttack() {
        if (!this.target) return;

        const damage = 10; // 暫定每次打10點傷害
        console.log(`[${this._name}] attacks [${this.target._name}] for ${damage} damage!`);
        let attRes = this.target.receiveDamage(damage);
        if (attRes == 攻擊結果.目標被擊殺) {

            this.event.emit('unit.autoSelectTarget');
        }
    }

    receiveDamage(amount: number): 攻擊結果 {
        if (this.isDead) return 攻擊結果.失敗;

        this.Hp -= amount;
        console.log(`[${this._name}] received ${amount} damage. HP: ${this.Hp}/${this.MaxHp}`);

        if (this.Hp <= 0) {
            this.Hp = 0;
            this.isDead = true;
            console.log(`[${this._name}] has died.`);
            this.event.emit('unit.dead', this);
            return 攻擊結果.目標被擊殺
        }
        return 攻擊結果.命中
    }


    setTarget(target: BasicUnit) {
        this.target = target;
    }
}