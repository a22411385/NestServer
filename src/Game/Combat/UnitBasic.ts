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

    protected Name: string;
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
    lastAttackTime: number; // 秒
    isDead: boolean;


    constructor(initData: UnitState) {
        this.isDead = false;
        this.Hp = this.MaxHp = initData.Hp;
        this.Mp = this.MaxMp = initData.Mp;
        this.Atk = initData.Atk;
        this.attackInterval = initData.AtkSpeed;
        this.Name = initData.Name;

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
        console.log(`[${this.Name}] attacks [${this.target.Name}] for ${damage} damage!`);
        this.target.receiveDamage(damage);
    }

    receiveDamage(amount: number) {
        if (this.isDead) return;

        this.Hp -= amount;
        console.log(`[${this.Name}] received ${amount} damage. HP: ${this.Hp}/${this.MaxHp}`);

        if (this.Hp <= 0) {
            this.Hp = 0;
            this.isDead = true;
            console.log(`[${this.Name}] has died.`);
        }
    }


    setTarget(target: BasicUnit) {
        this.target = target;
    }
}