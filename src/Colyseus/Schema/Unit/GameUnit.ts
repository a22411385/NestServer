import { MapSchema, Schema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";
// 技能基底
export class Skill extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("number") cooldown: number = 0; // 冷卻時間 (ms)
    @type("number") remainingCooldown: number = 0; // 剩餘冷卻時間
    @type("number") damage: number = 0; // 技能傷害
    @type("number") range: number = 100; // 技能範圍
}

// 狀態效果
export class StatusEffect extends Schema {
    @type("string") id: string = "";
    @type("string") type: string = ""; // buff, debuff, heal, damage
    @type("number") duration: number = 0; // 持續時間 (ms)
    @type("number") value: number = 0; // 效果數值
}
// 單位基底
export class GameUnit extends Schema {
    @type("string") id: string = "";
    @type("number") type: number = UnitType.enemy;
    @type("string") owner: string = "";
    @type("number") hp: number = 10;
    @type("number") maxHp: number = 10;
    @type("number") radius: number = 20; // 體積/碰撞半徑

    @type("boolean") isDead: boolean = false;
    @type({ map: Skill }) skills = new MapSchema<Skill>();
    @type({ map: StatusEffect }) statusEffects = new MapSchema<StatusEffect>();

    x: number = 0;
    y: number = 0;

    speed: number = 1; // 移動速度
    vx: number = 0; // X 軸速度向量
    vy: number = 0; // Y 軸速度向量

    // 加血方法
    heal(amount: number): number {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - oldHp; // 返回實際恢復的血量
    }

    // 扣血方法
    takeDamage(amount: number): boolean {
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            return true; // 返回是否死亡
        }
        return false;
    }

    // 檢查是否在範圍內
    isInRange(target: GameUnit, range: number): boolean {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.hypot(dx, dy);
        return distance <= range;
    }

    // 添加狀態效果
    addStatusEffect(effect: StatusEffect): void {
        this.statusEffects.set(effect.id, effect);
    }

    // 移除狀態效果
    removeStatusEffect(effectId: string): void {
        this.statusEffects.delete(effectId);
    }

    // 重置狀態
    reset(): void {
        this.hp = this.maxHp;
        this.isDead = false;
        this.statusEffects.clear();

        // 重置技能冷卻
        for (const [, skill] of this.skills) {
            skill.remainingCooldown = 0;
        }
    }
}

