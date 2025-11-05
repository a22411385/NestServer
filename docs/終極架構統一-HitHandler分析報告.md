# 🎯 終極架構統一 - HitHandler 分析報告

## 💡 核心洞察

> **近戰和投射物的命中邏輯本質上是相同的，可以統一成一個 HitHandler！**

---

## 🔍 現有架構分析

### 目前的命中流程

#### 近戰武器
```typescript
MeleeWeapon.attack()
  → 找到範圍內的敵人
  → combatSystem.applyDamage(target)
  → 完成
```

#### 投射物武器
```typescript
ProjectileWeapon.attack()
  → 創建 Bullet
  → Bullet 飛行...
  → Bullet 碰撞檢測
  → ProjectileBasic.onHit()
      → findAffectedTargets()（子類實現）
      → calculateDamage()
      → combatSystem.applyDamage(targets)
  → 完成
```

---

## 🎯 命中邏輯的本質

無論近戰還是遠程，命中邏輯都是：

| 步驟 | 近戰 | 投射物 | **本質** |
|------|------|--------|---------|
| 1. 目標選擇 | 攻擊者周圍敵人 | 碰撞目標 + 可能的範圍敵人 | **找到受影響的目標** |
| 2. 傷害計算 | 武器傷害 + 屬性加成 | 子彈傷害 + 屬性加成 | **計算最終傷害** |
| 3. 應用傷害 | applyDamage() | applyDamage() | **應用到目標** |
| 4. 額外效果 | 狀態效果、行為 | 狀態效果、行為 | **執行額外行為** |

**核心發現**：邏輯流程完全相同！

---

## ⚖️ 差異分析

### 真正的差異在哪？

| 特性 | 近戰 | 投射物 | **差異本質** |
|------|------|--------|-------------|
| **執行時機** | 立即 | 延遲（飛行後） | ⚠️ **時機不同** |
| **判定位置** | 攻擊者位置 | 子彈位置 | ⚠️ **位置來源不同** |
| **運行時狀態** | 無 | 有（位置、方向、pierceCount） | ⚠️ **狀態管理不同** |
| **命中邏輯** | 範圍檢測 | 碰撞檢測 + 範圍檢測 | ✅ **本質相同** |
| **傷害計算** | DamageSystem | DamageSystem | ✅ **完全相同** |
| **狀態效果** | StatusEffectSystem | StatusEffectSystem | ✅ **完全相同** |

**結論**：
- ⚠️ **時機和位置**是差異，但不影響命中邏輯
- ✅ **命中邏輯本身可以統一**

---

## 🏗️ 統一架構設計

### 方案：HitHandler（命中處理器）

```typescript
/**
 * 統一的命中處理器
 * 處理近戰和投射物的命中邏輯
 */
export class HitHandler {
    constructor(
        private gameRoom: GameRoom,
        private damageSystem: DamageSystem,
        private combatSystem: CombatSystem,
    ) {}

    /**
     * 統一的命中處理入口
     */
    public handle(context: HitContext): AttackResult {
        // 1. 基礎驗證
        if (!context.attacker || context.attacker.isDead) {
            return this.failResult('NO_ATTACKER');
        }

        // 2. 對直接命中的目標造成傷害
        const primaryResult = this.handlePrimaryTarget(context);

        if (!primaryResult.success) {
            return primaryResult;
        }

        // 3. 執行行為（可能產生額外傷害、效果）
        this.executeBehaviors(context, primaryResult);

        return primaryResult;
    }

    /**
     * 處理主要目標（直接命中的目標）
     */
    private handlePrimaryTarget(context: HitContext): AttackResult {
        const { attacker, target, damage, statusEffects, weaponId } = context;

        // 計算最終傷害
        const finalDamage = this.damageSystem.calculateFinalDamage({
            attacker,
            target,
            baseDamage: damage,
            elementTags: context.elementTags || ['physical'],
            weaponModifiers: context.modifiers,
            damageType: 'physical',
            source: weaponId,
        });

        // 應用傷害和狀態效果
        this.combatSystem.applyDamage({
            attacker,
            target,
            damage: finalDamage,
            statusEffects: statusEffects || [],
        });

        return {
            success: true,
            weaponId,
            targetIds: [target.id],
            baseDamage: finalDamage,
            attackData: {
                position: context.position,
                direction: context.direction || { x: 0, y: 0 },
                range: context.range || 0,
            },
        };
    }

    /**
     * 執行命中行為
     */
    private executeBehaviors(context: HitContext, result: AttackResult): void {
        if (!context.behaviors) return;

        for (const behavior of context.behaviors) {
            if (behavior.trigger === 'onHit') {
                this.executeBehavior(behavior, context, result);
            }

            // 檢查擊殺行為
            if (context.target.isDead && behavior.trigger === 'onKill') {
                this.executeBehavior(behavior, context, result);
            }
        }
    }

    /**
     * 執行單個行為
     */
    private executeBehavior(
        behavior: Behavior,
        context: HitContext,
        result: AttackResult,
    ): void {
        switch (behavior.action) {
            case 'aoeExplode':
                this.actionAoeExplode(behavior, context);
                break;
            case 'split':
                this.actionSplit(behavior, context);
                break;
            case 'chain':
                this.actionChain(behavior, context);
                break;
            // ... 其他行為
        }
    }

    /**
     * 行為：AOE 爆炸
     */
    private actionAoeExplode(behavior: Behavior, context: HitContext): void {
        const { radius, damageMultiplier = 1.0 } = behavior.config;

        // 找到範圍內的其他敵人（排除主要目標）
        const targets = this.findTargetsInRadius(
            context.position,
            radius,
            context.attacker,
            context.target, // 排除主要目標
        );

        // 對每個敵人造成傷害
        for (const target of targets) {
            const damage = context.damage * damageMultiplier;
            this.combatSystem.applyDamage({
                attacker: context.attacker,
                target,
                damage,
                statusEffects: context.statusEffects || [],
            });
        }

        console.log(`💥 [AOE Explode] 爆炸範圍 ${radius}，額外命中 ${targets.length} 個敵人`);
    }

    /**
     * 行為：分裂
     */
    private actionSplit(behavior: Behavior, context: HitContext): void {
        const { count, spreadAngle = 60, damageMultiplier = 1.0 } = behavior.config;

        // 只有投射物才能分裂
        if (context.type !== 'projectile') return;

        // 生成子彈（通過 BulletManager）
        const baseAngle = Math.atan2(context.direction.y, context.direction.x);

        for (let i = 0; i < count; i++) {
            const angleOffset = (spreadAngle * (i / (count - 1))) - (spreadAngle / 2);
            const fragmentAngle = baseAngle + (angleOffset * Math.PI / 180);

            this.gameRoom.bulletManager.createBullet(
                context.position.x,
                context.position.y,
                {
                    ...context.bulletConfig,
                    damage: context.damage * damageMultiplier,
                    directionX: Math.cos(fragmentAngle),
                    directionY: Math.sin(fragmentAngle),
                },
            );
        }

        console.log(`🌟 [Split] 分裂成 ${count} 個子彈`);
    }

    /**
     * 範圍搜索敵人
     */
    private findTargetsInRadius(
        center: Vec2,
        radius: number,
        attacker: ServerGameUnit,
        exclude?: ServerGameUnit,
    ): ServerGameUnit[] {
        const targets: ServerGameUnit[] = [];

        for (const [, unit] of this.gameRoom.state.allUnits) {
            if (unit.isDead || unit === exclude || unit === attacker) {
                continue;
            }

            const distance = Math.hypot(
                unit.position.x - center.x,
                unit.position.y - center.y,
            );

            if (distance <= radius) {
                targets.push(unit);
            }
        }

        return targets;
    }

    private failResult(reason: string): AttackResult {
        return {
            success: false,
            weaponId: '',
            baseDamage: 0,
            reason,
        };
    }
}

/**
 * 命中上下文（統一近戰和投射物）
 */
export interface HitContext {
    type: 'melee' | 'projectile';
    attacker: ServerGameUnit;
    target: ServerGameUnit;
    damage: number;
    position: Vec2;
    direction?: Vec2;
    range?: number;
    
    // 武器屬性
    weaponId: string;
    elementTags?: string[];
    modifiers?: any[];
    statusEffects?: StatusEffect[];
    
    // 行為配置
    behaviors?: Behavior[];
    
    // 投射物專用
    bulletConfig?: any;
}
```

---

## 🔄 使用方式

### 近戰武器

```typescript
class MeleeWeapon {
    onAttack(owner: ServerGameUnit, target: ServerGameUnit) {
        const result = this.gameRoom.hitHandler.handle({
            type: 'melee',
            attacker: owner,
            target: target,
            damage: this.weaponSchema.damage,
            position: owner.position,
            weaponId: this.weaponId,
            elementTags: this.weaponSchema.getElementTags(),
            statusEffects: this.weaponSchema.statusEffects,
            behaviors: this.weaponSchema.behaviors,
        });

        return result;
    }
}
```

### 投射物

```typescript
class BulletManager {
    onBulletHit(bullet: ServerBullet, target: ServerGameUnit) {
        const result = this.gameRoom.hitHandler.handle({
            type: 'projectile',
            attacker: gameRoom.state.allUnits.get(bullet.ownerId),
            target: target,
            damage: bullet.damage,
            position: bullet.getCurrentPosition(),
            direction: { x: bullet.directionX, y: bullet.directionY },
            range: bullet.areaOfEffect,
            weaponId: bullet.weaponId,
            elementTags: Array.from(bullet.elementTags),
            statusEffects: Array.from(bullet.statusEffects),
            behaviors: this.parseBehaviors(bullet),
            bulletConfig: bullet.getConfig(), // 用於分裂時創建子彈
        });

        // 穿透邏輯
        if (bullet.pierceCount > 0) {
            bullet.pierceCount--;
            // 不銷毀，繼續飛行
        } else {
            bullet.markForDestroy();
        }

        return result;
    }
}
```

---

## 📊 架構對比

### ❌ 之前的架構

```
MeleeWeapon → 直接調用 combatSystem
ProjectileWeapon → Bullet → ProjectileBasic.onHit() → combatSystem
    ├── BasicProjectile
    ├── ExplosiveProjectile
    └── PiercingProjectile
```

**問題**：
- 近戰和投射物邏輯分離
- 需要多個 Projectile 子類
- 代碼重複

---

### ✅ 新架構

```
MeleeWeapon → HitHandler.handle()
ProjectileWeapon → Bullet → BulletManager.onHit() → HitHandler.handle()

HitHandler
├── handlePrimaryTarget()（基礎命中）
└── executeBehaviors()（行為執行）
    ├── aoeExplode
    ├── split
    ├── chain
    └── ...
```

**優勢**：
- ✅ 統一的命中邏輯
- ✅ 投射物只是數據載體
- ✅ 所有特殊行為通過 behaviors
- ✅ 極度簡化

---

## 🎯 投射物的新定位

### 投射物 = 數據載體 + 物理實體

```typescript
class ServerBullet {
    // 物理屬性（碰撞檢測需要）
    position: Vec2;
    directionX: number;
    directionY: number;
    speed: number;
    
    // 攻擊屬性（傳遞給 HitHandler）
    ownerId: string;
    weaponId: string;
    damage: number;
    elementTags: string[];
    statusEffects: StatusEffect[];
    behaviors: Behavior[];
    
    // 運行時狀態
    pierceCount: number;
    
    // 不再需要 ProjectileBasic 處理命中邏輯！
}
```

---

## 🗑️ 可以刪除的部分

### 完全不需要了
- ❌ `ProjectileBasic.ts`（抽象基類）
- ❌ `BasicProjectile.ts`
- ❌ `ExplosiveProjectile.ts`
- ❌ `PiercingProjectile.ts`
- ❌ `ProjectileRegistry.ts`
- ❌ 所有對應的客戶端類

### 替代方案
- ✅ `HitHandler`（統一命中處理器）
- ✅ `Behavior` 配置（所有特殊邏輯）

---

## 🎉 最終架構

### 核心類別（極簡）

```
GameRoom
├── HitHandler（命中處理器）
├── DamageSystem（傷害計算）
├── CombatSystem（戰鬥系統）
├── BulletManager（子彈管理）
└── WeaponSystem（武器系統）
    ├── MeleeWeapon
    └── ProjectileWeapon
```

### 投射物流程

```
1. ProjectileWeapon.attack()
   → 創建 Bullet（數據載體）

2. BulletManager.update()
   → 碰撞檢測
   → 發現命中

3. BulletManager.onBulletHit()
   → 調用 HitHandler.handle()
      → 基礎命中邏輯
      → 執行 behaviors（aoeExplode, split...）
   
   → 判斷穿透
      → pierceCount > 0: 繼續飛行
      → pierceCount = 0: 銷毀
```

---

## 💡 優勢總結

### ✅ 極度統一
- 近戰和投射物使用**相同的命中邏輯**
- 減少代碼重複

### ✅ 極度簡化
- **刪除所有 Projectile 類**
- 投射物只是數據載體

### ✅ 極度靈活
- 所有行為通過配置
- 無限組合可能

### ✅ 易於維護
- 命中邏輯集中在 HitHandler
- 修改一處，近戰和投射物都受益

---

## 🔄 遷移建議

### Phase 1: 創建 HitHandler
- [ ] 實現 HitHandler 類
- [ ] 實現基礎行為（aoeExplode, split）
- [ ] 測試近戰武器使用 HitHandler

### Phase 2: 遷移投射物
- [ ] BulletManager 改用 HitHandler
- [ ] 測試投射物命中

### Phase 3: 刪除舊系統
- [ ] 刪除 ProjectileBasic 和所有子類
- [ ] 刪除 ProjectileRegistry
- [ ] 清理客戶端對應類

---

## 🎯 結論

**你的洞察完全正確！**

**不需要 ProjectileBasic，只需要一個統一的 HitHandler！**

**最終架構：**
- ✅ 1 個 HitHandler（近戰 + 投射物統一）
- ✅ Bullet 只是數據載體（不處理邏輯）
- ✅ 所有特殊行為通過 behaviors 配置

**這是最簡化、最統一的架構！** 🚀
