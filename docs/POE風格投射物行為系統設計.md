# 🎯 POE 風格投射物行為系統設計

## 📋 目標

實現類似 POE 的**輔助寶石系統**，支援複合投射物行為，例如：
- 分裂後子彈命中造成範圍爆炸
- 穿透後彈射到其他敵人
- 命中後觸發額外技能

---

## 🔍 POE 機制分析

### POE 的輔助寶石系統

**核心概念**：主動技能 + 輔助寶石組合

```
主動技能：Fireball（火球術）
+ 輔助寶石 1：Fork（分裂）
+ 輔助寶石 2：Concentrated Effect（集中效應）
= 結果：火球命中後分裂成 2 個，每個造成更高的 AOE 傷害
```

### POE 的觸發時機

| 觸發時機 | 說明 | 範例 |
|---------|------|------|
| `On Cast` | 施放技能時 | 發射 3 個額外投射物 |
| `On Hit` | 命中敵人時 | 分裂成 2 個子彈 |
| `On Kill` | 擊殺敵人時 | 爆炸造成範圍傷害 |
| `On Crit` | 暴擊時 | 凍結敵人 |
| `On Expire` | 投射物消失時 | 在終點爆炸 |

### POE 的行為類型

| 行為類型 | 說明 | 範例 |
|---------|------|------|
| **Modification** | 修改屬性 | 傷害 +50%、範圍 -20% |
| **Chain** | 彈射 | 命中後彈射到下一個敵人 |
| **Fork** | 分裂 | 命中後分裂成 2 個 |
| **Pierce** | 穿透 | 穿透 3 個敵人 |
| **Return** | 返回 | 投射物返回發射者 |
| **Trigger** | 觸發技能 | 命中時施放其他技能 |

---

## 🎯 我們的架構適配方案

### ✅ 方案：投射物行為鏈（Projectile Behavior Chain）

**核心思想**：在投射物配置中添加 `behaviors` 陣列，定義多個行為

```typescript
interface ProjectileBehavior {
    trigger: 'onHit' | 'onKill' | 'onCast' | 'onExpire' | 'onCrit';
    action: 'split' | 'chain' | 'explode' | 'pierce' | 'spawn';
    config: {
        // 行為特定配置
        count?: number;
        childProjectileClass?: string;
        damage?: number;
        radius?: number;
    };
}
```

---

## 📝 配置範例

### 範例 1：分裂爆炸箭（你想要的效果）

**效果**：箭命中後分裂成 3 個子箭，每個子箭造成範圍爆炸傷害

```json
{
    "id": "split_explosive_arrow",
    "projectileClass": "BasicProjectile",
    "tags": "weapon,ranged,bow,fire,projectile",
    "damage": 50,
    "behaviors": [
        {
            "trigger": "onHit",
            "action": "split",
            "config": {
                "count": 3,
                "spreadAngle": 60,
                "childProjectileClass": "ExplosiveProjectile",
                "childDamageMultiplier": 0.6,
                "childTags": "fire,explosive,projectile"
            }
        }
    ]
}
```

**執行流程**：
1. BasicProjectile 命中敵人
2. 觸發 `onHit` → 執行 `split` 行為
3. 生成 3 個 ExplosiveProjectile 子彈
4. 子彈命中時造成 AOE 爆炸傷害

---

### 範例 2：穿透彈射箭（POE 經典組合）

**效果**：箭穿透 2 個敵人後，彈射到其他敵人

```json
{
    "id": "pierce_chain_arrow",
    "projectileClass": "PiercingProjectile",
    "pierceCount": 2,
    "tags": "weapon,ranged,bow,lightning,projectile",
    "behaviors": [
        {
            "trigger": "onExpire",
            "action": "chain",
            "config": {
                "chainCount": 3,
                "chainRange": 200,
                "damageMultiplier": 0.8
            }
        }
    ]
}
```

**執行流程**：
1. PiercingProjectile 穿透 2 個敵人
2. 穿透次數耗盡 → 觸發 `onExpire`
3. 執行 `chain` 行為 → 彈射到附近敵人
4. 重複彈射 3 次

---

### 範例 3：擊殺爆炸（POE Herald of Ice）

**效果**：擊殺敵人時在屍體位置爆炸

```json
{
    "id": "explode_on_kill_arrow",
    "projectileClass": "BasicProjectile",
    "tags": "weapon,ranged,bow,ice,projectile",
    "behaviors": [
        {
            "trigger": "onKill",
            "action": "explode",
            "config": {
                "radius": 120,
                "damageMultiplier": 1.5,
                "tags": "ice,explosion"
            }
        }
    ]
}
```

**執行流程**：
1. BasicProjectile 命中敵人
2. 如果敵人被擊殺 → 觸發 `onKill`
3. 在敵人位置生成冰霜爆炸
4. 爆炸傷害附近敵人

---

### 範例 4：多重行為（暴擊分裂 + 命中冰凍）

**效果**：暴擊時分裂，命中時冰凍

```json
{
    "id": "crit_split_freeze_arrow",
    "projectileClass": "BasicProjectile",
    "tags": "weapon,ranged,bow,ice,projectile",
    "behaviors": [
        {
            "trigger": "onCrit",
            "action": "split",
            "config": {
                "count": 5,
                "childProjectileClass": "BasicProjectile"
            }
        },
        {
            "trigger": "onHit",
            "action": "applyStatus",
            "config": {
                "statusEffects": [
                    { "type": "freeze", "duration": 2000 }
                ]
            }
        }
    ]
}
```

---

## 🔧 實現方案

### 1. 擴展 ServerBullet Schema

```typescript
// Bullet.ts
export class ServerBullet extends Schema {
    // ... 現有屬性
    
    @type(["string"])
    behaviors: ArraySchema<string> = new ArraySchema<string>();
    
    // 解析後的行為配置（運行時）
    private behaviorConfigs: ProjectileBehavior[] = [];
    
    public applyExtendedConfig(config: BulletCreateConfig) {
        // ... 現有邏輯
        
        // ✨ 設置行為
        if (config.behaviors) {
            this.behaviorConfigs = config.behaviors;
            config.behaviors.forEach(b => 
                this.behaviors.push(JSON.stringify(b))
            );
        }
    }
}
```

---

### 2. 修改 ProjectileBasic 支援行為鏈

```typescript
// ProjectileBasic.ts
export abstract class ProjectileBasic {
    
    public onHit(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): AttackResult {
        // 1. 執行前置行為（可能修改命中邏輯）
        this.executePreHitBehaviors(bullet, hitTarget, gameRoom);
        
        // 2. 執行核心命中邏輯
        const result = super.onHit(bullet, hitTarget, gameRoom);
        
        if (!result.success) return result;
        
        // 3. 執行後置行為（分裂、彈射、爆炸）
        this.executePostHitBehaviors(bullet, hitTarget, gameRoom, result);
        
        // 4. 檢查擊殺行為
        if (hitTarget.isDead) {
            this.executeOnKillBehaviors(bullet, hitTarget, gameRoom);
        }
        
        return result;
    }
    
    /**
     * 執行命中後的行為
     */
    protected executePostHitBehaviors(
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
        result: AttackResult,
    ): void {
        const behaviors = this.parseBehaviors(bullet);
        
        for (const behavior of behaviors) {
            if (behavior.trigger === 'onHit') {
                this.executeBehavior(behavior, bullet, hitTarget, gameRoom);
            }
        }
    }
    
    /**
     * 執行單個行為
     */
    protected executeBehavior(
        behavior: ProjectileBehavior,
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): void {
        switch (behavior.action) {
            case 'split':
                this.executeSplit(behavior, bullet, hitTarget, gameRoom);
                break;
            case 'chain':
                this.executeChain(behavior, bullet, hitTarget, gameRoom);
                break;
            case 'explode':
                this.executeExplode(behavior, bullet, hitTarget, gameRoom);
                break;
            // ... 其他行為
        }
    }
    
    /**
     * 執行分裂行為
     */
    protected executeSplit(
        behavior: ProjectileBehavior,
        bullet: ServerBullet,
        hitTarget: ServerGameUnit,
        gameRoom: GameRoom,
    ): void {
        const { count, spreadAngle, childProjectileClass, childDamageMultiplier } = behavior.config;
        const hitPosition = bullet.getCurrentPosition();
        const baseAngle = Math.atan2(bullet.directionY, bullet.directionX);
        
        for (let i = 0; i < count; i++) {
            // 計算散射角度
            const angleOffset = (spreadAngle * (i / (count - 1))) - (spreadAngle / 2);
            const fragmentAngle = baseAngle + (angleOffset * Math.PI / 180);
            
            // 創建子彈配置
            const childConfig: BulletCreateConfig = {
                ...bullet.getConfig(),
                projectileClass: childProjectileClass || bullet.projectileClass,
                damage: bullet.damage * (childDamageMultiplier || 1.0),
                directionX: Math.cos(fragmentAngle),
                directionY: Math.sin(fragmentAngle),
                tags: behavior.config.childTags?.split(',') || bullet.tags,
            };
            
            // 生成子彈
            gameRoom.bulletManager.createBullet(
                hitPosition.x,
                hitPosition.y,
                childConfig
            );
        }
        
        console.log(`💥 [Split] 分裂成 ${count} 個子彈，使用 ${childProjectileClass}`);
    }
    
    /**
     * 解析行為配置
     */
    protected parseBehaviors(bullet: ServerBullet): ProjectileBehavior[] {
        return Array.from(bullet.behaviors)
            .map(b => JSON.parse(b) as ProjectileBehavior);
    }
}
```

---

### 3. 武器配置集成

```typescript
// ProjectileWeapon.ts
protected createBulletConfig(): BulletCreateConfig {
    const config = this.weaponSchema.getProjectileConfig();
    
    return {
        // ... 現有配置
        behaviors: config.behaviors || [], // ✨ 添加行為配置
    };
}
```

---

## 🎨 視覺效果整合

### 標籤自動傳遞

子彈生成時自動繼承或覆蓋標籤：

```typescript
// 分裂時指定子彈標籤
{
    "action": "split",
    "config": {
        "childTags": "fire,explosive,fragment,projectile"
    }
}
```

客戶端 VisualEffectManager 會自動匹配標籤創建對應視覺效果。

---

## 📊 完整範例：火焰分裂爆炸法杖

```json
{
    "id": "fire_split_staff",
    "name": "火焰分裂法杖",
    "type": "staff",
    "attackType": "ranged",
    "damage": 60,
    "attackSpeed": 1.2,
    "range": 400,
    
    "projectileClass": "BasicProjectile",
    "projectileSpeed": 300,
    "tags": "weapon,ranged,staff,fire,projectile",
    
    "behaviors": [
        {
            "trigger": "onHit",
            "action": "split",
            "config": {
                "count": 3,
                "spreadAngle": 90,
                "childProjectileClass": "ExplosiveProjectile",
                "childDamageMultiplier": 0.5,
                "childTags": "fire,explosive,fragment,projectile",
                "childAOE": 80
            }
        }
    ],
    
    "statusEffects": [
        {
            "type": "burn",
            "category": "debuff",
            "duration": 3000,
            "tickInterval": 500,
            "value": 5
        }
    ]
}
```

**效果**：
1. ✅ 發射火焰投射物（標籤：fire, projectile）
2. ✅ 命中敵人造成 60 傷害 + 燃燒 DOT
3. ✅ 命中後分裂成 3 個火焰碎片（標籤：fire, explosive, fragment）
4. ✅ 每個碎片命中造成 30 傷害（60 × 0.5）+ AOE 爆炸
5. ✅ 爆炸範圍 80 單位

---

## 🎯 優勢總結

### ✅ 與現有架構完美整合

| 現有系統 | 新增行為系統 | 整合方式 |
|---------|-------------|---------|
| ProjectileBasic 子類 | behaviors 配置 | 基類添加行為執行鉤子 |
| 標籤系統 | childTags 配置 | 子彈自動繼承標籤 |
| statusEffects | applyStatus 行為 | 行為可添加狀態效果 |

### ✅ POE 風格的靈活組合

```
BasicProjectile + split(3) + explosive
= 命中後分裂成 3 個爆炸彈

PiercingProjectile + pierce(2) + chain(3)
= 穿透 2 個敵人後彈射 3 次

BasicProjectile + onKill(explode) + onCrit(freeze)
= 擊殺爆炸 + 暴擊冰凍
```

### ✅ 配置驅動，無需修改代碼

新增行為只需：
1. 在 `executeBehavior()` 添加 case
2. 實現對應的 `executeXXX()` 方法
3. 配置中使用新行為

---

## 🔄 實現步驟

### Phase 1: 基礎架構
- [ ] ServerBullet 添加 `behaviors` 屬性
- [ ] ProjectileBasic 添加行為執行鉤子
- [ ] 實現 `split` 行為

### Phase 2: 擴展行為
- [ ] 實現 `chain` 行為（彈射）
- [ ] 實現 `explode` 行為（爆炸）
- [ ] 實現 `onKill` 觸發

### Phase 3: 高級特性
- [ ] 實現 `onCrit` 觸發
- [ ] 實現 `return` 行為（返回）
- [ ] 實現行為條件判斷

---

## 🎉 結論

**你的架構非常適合 POE 風格的複合行為系統！**

**優勢**：
- ✅ 投射物邏輯類已經分離（BasicProjectile, ExplosiveProjectile, PiercingProjectile）
- ✅ 標籤系統已經支援視覺效果動態匹配
- ✅ 配置驅動架構易於擴展

**只需要**：
1. 在 ProjectileBasic 添加行為執行鉤子
2. 實現各種行為的執行邏輯
3. 配置中使用 behaviors 陣列

**就能實現無限組合的投射物效果，完全不需要創建新的類別！** 🚀
