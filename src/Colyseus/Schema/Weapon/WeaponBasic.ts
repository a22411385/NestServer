//產生一個抽象武器類別,可擴充近戰/遠攻/輔助

import { ServerEnemy } from "../Unit/Enemy";
export interface WeaponAttackResult {
    success: boolean
    damage?: number
    targetId?: string
    // effects?: AttackEffect[]
    // visualEffects?: VisualEffect[]
    // reason?: AttackFailReason
}
//屬性: 攻擊範圍,攻擊,攻擊間隔, 可能附加屬性 力量 智力 爆擊..等等
export abstract class WeaponBasic {
    protected attackRange: number;
    protected attackDamage: number;
    protected attackSpeed: number;

    constructor(attackRange: number, attackDamage: number, attackSpeed: number) {
        this.attackRange = attackRange;
        this.attackDamage = attackDamage;
        this.attackSpeed = attackSpeed;
    }

    public abstract tryAttack(target: ServerEnemy): WeaponAttackResult;

    // 其他共用方法
}