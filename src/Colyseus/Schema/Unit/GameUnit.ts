import { MapSchema, Schema, type } from "@colyseus/schema";
import { UnitType } from "../GameState";

export class Vector2 {
    x: number = 0;
    y: number = 0;

    constructor(x: number, y: number) {

        this.x = x;
        this.y = y;
    }
}

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
    @type("number") endTime: number = 0; // 🔧 效果結束時間戳 (ms) - 客戶端可計算剩餘時間
    @type("number") value: number = 0; // 效果數值
    @type("number") stacks: number = 1; // 🆕 疊加層數（默認1層）
    @type("number") maxStacks: number = 5; // 🆕 最大疊加層數（默認5層）
    @type("string") sourceId: string = ""; // 🆕 施加者ID（用於追蹤 DOT 傷害加成）

    // 🔧 伺服器專用屬性（不同步）
    public duration: number = 0; // 持續時間 (ms) - 僅伺服器使用
    public startTime: number = 0; // 效果開始時間戳 (ms) - 僅伺服器計算使用
    public _lastDamageTick?: number; // 最後傷害時間 - 內部使用
}
// 單位基底
export class ServerGameUnit extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = '';
    @type("number") type: number = UnitType.enemy;
    @type("string") owner: string = "";
    @type("number") hp: number = 10;
    @type("number") maxHp: number = 10;
    @type("number") attackDamage: number = 10;
    @type("number") attackSpeed: number = 1000;

    @type("number") attackRange: number = 100; // 攻擊範圍

    // 🎯 擊殺者ID - 用於區分正常擊殺和系統清理
    // 如果有值，表示被某個單位擊殺；如果為空，表示被系統移除
    public killedBy: string = ""; // 不同步到客戶端，僅伺服器使用
    // @type("number") radius: number = 20; // 體積/碰撞半徑 (保留向後兼容)

    // 回復屬性
    @type("number") hpRegen: number = 0;  // 生命回復/秒
    @type("number") mpRegen: number = 0;  // 魔力回復/秒

    // 防禦屬性
    @type("number") physicalDefense: number = 0;  // 物理防禦
    @type("number") magicDefense: number = 0;     // 魔法防禦

    //體型縮放
    @type("number") scale: number = 1;


    // 矩形碰撞屬性
    @type("number") collisionWidth: number = 32; // 碰撞寬度
    @type("number") collisionHeight: number = 32; // 碰撞高度

    //單位面相角度
    @type("number") facingDirection: number = 0;

    @type("boolean") isDead: boolean = false;
    @type({ map: Skill }) skills = new MapSchema<Skill>();

    @type({ map: StatusEffect }) statusEffects = new MapSchema<StatusEffect>();
    @type("number") birthX: number = 0;
    @type("number") birthY: number = 0;
    //@type(Vector2) 

    position: Vector2 = new Vector2(0, 0);
    // @type("number") y: number = 0;

    @type("number") moveSpeed: number = 1; // 移動速度
    // === 基礎數值 (固定，不受裝備影響) - 不需要同步給客戶端 ===
    protected baseHp: number = 100;
    protected baseAttackDamage: number = 10;
    protected baseMoveSpeed: number = 30;




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
    isInRange(target: ServerGameUnit, range: number): boolean {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const distance = Math.hypot(dx, dy);
        return distance <= range;
    }

    /**
     * 獲取考慮縮放的碰撞寬度
     */
    public getScaledCollisionWidth(): number {
        return this.collisionWidth * this.scale;
    }

    /**
     * 獲取考慮縮放的碰撞高度
     */
    public getScaledCollisionHeight(): number {
        return this.collisionHeight * this.scale;
    }

    /**
     * 獲取有效的碰撞半徑（用於向後兼容某些範圍計算）
     */
    public getEffectiveCollisionRadius(): number {
        return Math.max(this.getScaledCollisionWidth(), this.getScaledCollisionHeight()) / 2;
    }

    // 添加狀態效果
    addStatusEffect(effect: StatusEffect): void {
        // 🛡️ 防護檢查：確保效果有效
        if (!effect || !effect.id || !effect.type) {
            console.error(`❌ 嘗試添加無效的狀態效果 (單位: ${this.id}):`, {
                effect: effect,
                id: effect?.id || 'undefined',
                type: effect?.type || 'undefined'
            });
            return;
        }

        // 🛡️ 確保 effect.id 是有效字符串
        if (typeof effect.id !== 'string' || effect.id.trim() === '') {
            console.error(`❌ 狀態效果 ID 無效 (單位: ${this.id}):`, {
                id: effect.id,
                type: typeof effect.id
            });
            return;
        }

        this.statusEffects.set(effect.id, effect);
    }

    // 移除狀態效果
    removeStatusEffect(effectId: string): void {
        // 🛡️ 防護檢查：確保 effectId 有效
        if (!effectId || typeof effectId !== 'string') {
            console.error(`❌ 嘗試移除無效的狀態效果ID: ${effectId} (單位: ${this.id})`);
            return;
        }

        // 🛡️ 檢查效果是否存在
        if (!this.statusEffects.has(effectId)) {
            console.warn(`⚠️ 嘗試移除不存在的狀態效果: ${effectId} (單位: ${this.id})`);
            return;
        }

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

    // 🆕 清理無效的狀態效果
    cleanupInvalidStatusEffects(): void {
        const invalidEffects: string[] = [];

        for (const [effectId, effect] of this.statusEffects) {
            // 檢查是否有無效的 effectId 或 effect
            if (!effectId || !effect || typeof effectId !== 'string' || effectId.trim() === '') {
                console.warn(`🧹 發現無效狀態效果，將清理: effectId=${effectId} (單位: ${this.id})`);
                invalidEffects.push(effectId);
                continue;
            }

            // 檢查 effectId 與 effect.id 是否一致
            if (effectId !== effect.id) {
                console.warn(`🧹 發現不一致的狀態效果，將清理: MapKey=${effectId}, effect.id=${effect.id} (單位: ${this.id})`);
                invalidEffects.push(effectId);
                continue;
            }

            // 檢查是否有無效的 effect 數據
            if (!effect.type || typeof effect.type !== 'string') {
                console.warn(`🧹 發現無效的效果類型，將清理: ${effectId} (type: ${effect.type}) (單位: ${this.id})`);
                invalidEffects.push(effectId);
                continue;
            }
        }

        // 清理所有無效效果
        for (const effectId of invalidEffects) {
            try {
                this.statusEffects.delete(effectId);
                console.log(`✅ 已清理無效狀態效果: ${effectId} (單位: ${this.id})`);
            } catch (error) {
                console.error(`❌ 清理狀態效果時發生錯誤: ${effectId} (單位: ${this.id})`, error);
            }
        }

        if (invalidEffects.length > 0) {
            console.log(`🧹 已清理 ${invalidEffects.length} 個無效狀態效果 (單位: ${this.id})`);
        }
    }
}

