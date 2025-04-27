// combat-component.ts
export interface CombatState {
    id: string;
    hp: number;
    maxHp: number;
    attackInterval: number; // 秒
    lastAttackTime: number; // 秒
    isDead: boolean;
}

export abstract class CombatComponent {
    state: CombatState;
    target: CombatComponent | null = null;

    constructor(initialState: CombatState) {
        this.state = initialState;
    }

    update(currentTime: number) {
        if (this.state.isDead) return;
        if (!this.target || this.target.state.isDead) return;

        if (currentTime - this.state.lastAttackTime >= this.state.attackInterval) {
            this.performBasicAttack();
            this.state.lastAttackTime = currentTime;
        }
    }

    performBasicAttack() {
        if (!this.target) return;

        const damage = 10; // 暫定每次打10點傷害
        console.log(`[${this.state.id}] attacks [${this.target.state.id}] for ${damage} damage!`);
        this.target.receiveDamage(damage);
    }

    receiveDamage(amount: number) {
        if (this.state.isDead) return;

        this.state.hp -= amount;
        console.log(`[${this.state.id}] received ${amount} damage. HP: ${this.state.hp}/${this.state.maxHp}`);

        if (this.state.hp <= 0) {
            this.state.hp = 0;
            this.state.isDead = true;
            console.log(`[${this.state.id}] has died.`);
        }
    }


    setTarget(target: CombatComponent) {
        this.target = target;
    }
}