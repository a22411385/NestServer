# 視覺效果 Tags 標籤系統說明

## 📋 核心職責

`tags` 欄位在視覺效果配置表（VisualEffectDefinitions）中扮演 **元數據分類和擴展邏輯** 的角色。

### 主要職責

#### 1️⃣ 效果分類與索引
```typescript
// 快速查詢特定類型的效果
const fireEffects = visualEffects.filter(e => 
    e.tags?.includes('fire')
);

const explosiveEffects = visualEffects.filter(e => 
    e.tags?.includes('explosive')
);
```

#### 2️⃣ 動態行為擴展
```typescript
// 根據標籤決定額外的視覺行為
if (effect.tags?.includes('critical')) {
    // 暴擊效果：額外的相機震動
    cameraManager.shake(0.5, 300);
    // 暴擊音效加強
    audioManager.playWithPitch('critical', 1.2);
}

if (effect.tags?.includes('dot')) {
    // DOT 效果：顯示持續傷害數字
    showDotNumbers(effect);
}
```

#### 3️⃣ 效果組合與變體
```typescript
// 組合多個標籤實現複雜效果
const effect = {
    effectId: 'fire_explosion',
    tags: 'fire,explosive,aoe,burn'
    // fire: 使用火焰顏色主題
    // explosive: 播放爆炸動畫
    // aoe: 顯示範圍圈
    // burn: 附加燃燒狀態效果視覺
};
```

#### 4️⃣ 與遊戲系統關聯
```typescript
// 與武器標籤系統關聯
const weaponTags = weaponModifier.tags; // 'fire,explosive'
const matchingVisualEffect = findEffectByTags(weaponTags);

// 根據武器標籤自動選擇視覺效果
if (weaponTags.includes('fire') && weaponTags.includes('explosive')) {
    return 'fire_explosion'; // 匹配最佳效果
} else if (weaponTags.includes('fire')) {
    return 'fire_projectile'; // 匹配部分效果
}
```

#### 5️⃣ 數據分析與統計
```typescript
// 統計各元素效果的使用量
const elementStats = visualEffects.reduce((acc, effect) => {
    const tags = effect.tags?.split(',') || [];
    tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
}, {});

// 輸出：{ fire: 5, ice: 4, lightning: 3, poison: 2, ... }
```

---

## 🏷️ 標籤分類系統

### 1. 元素標籤（Element Tags）
描述效果的元素屬性，與傷害類型對應

| 標籤 | 說明 | 範例效果 |
|------|------|---------|
| `fire` | 火焰元素 | fire_explosion, fire_projectile |
| `ice` / `cold` | 冰霜元素 | ice_shard, freeze_aura |
| `lightning` | 閃電元素 | lightning_bolt, shock_explosion |
| `poison` | 毒素元素 | poison_cloud, poison_projectile |
| `bleed` | 流血（物理） | bleed_slash, blood_explosion |
| `holy` | 神聖元素 | holy_beam, healing_aura |
| `shadow` | 暗影元素 | shadow_bolt, shadow_explosion |
| `arcane` | 奧術元素 | arcane_missile, arcane_explosion |
| `physical` | 純物理 | hit_spark, knockback_impact |

**用途：**
- 與傷害類型系統對應（DamageSystem）
- 決定效果的顏色主題
- 元素增幅效果的視覺反饋

---

### 2. 行為標籤（Behavior Tags）
描述效果的行為特性

| 標籤 | 說明 | 視覺特徵 |
|------|------|---------|
| `projectile` | 投射物 | 飛行軌跡、拖尾 |
| `explosive` | 爆炸性 | 粒子爆發、範圍擴散 |
| `aoe` | 範圍效果 | 範圍圈、波紋擴散 |
| `dot` | 持續傷害 | 持續粒子、數字跳動 |
| `chain` | 連鎖效果 | 電弧軌跡、連線 |
| `pierce` | 穿透效果 | 貫穿軌跡、殘影 |
| `splash` | 濺射效果 | 液體濺射、分裂粒子 |
| `beam` | 光束效果 | 直線光柱、持續射線 |

**用途：**
- 決定動畫播放方式
- 控制粒子系統行為
- 影響音效選擇

---

### 3. 影響標籤（Impact Tags）
描述效果對目標的影響

| 標籤 | 說明 | 額外視覺 |
|------|------|---------|
| `damage` | 造成傷害 | 傷害數字、血液飛濺 |
| `critical` | 暴擊效果 | 放大特效、強化震動 |
| `knockback` | 擊退效果 | 運動軌跡、衝擊波 |
| `stun` | 暈眩效果 | 眩暈星星、震動特效 |
| `slow` | 減速效果 | 冰霜光環、減速圖示 |
| `pull` | 拉扯效果 | 吸引軌跡、漩渦 |
| `healing` | 治療效果 | 綠色光芒、恢復數字 |
| `buff` | 增益效果 | 光環、上升粒子 |
| `debuff` | 減益效果 | 暗色光環、下降粒子 |
| `control` | 控制效果 | 鎖鏈、禁錮圖示 |

**用途：**
- 觸發額外的視覺反饋
- 顯示對應的 UI 圖示
- 播放特定的音效

---

### 4. 狀態標籤（State Tags）
描述效果的狀態特性

| 標籤 | 說明 | 應用場景 |
|------|------|---------|
| `instant` | 瞬發效果 | 立即播放並結束 |
| `continuous` | 持續效果 | 循環播放動畫 |
| `toggle` | 開關效果 | 可啟用/停用 |
| `passive` | 被動效果 | 環境效果、光環 |

---

## 💡 使用場景

### 場景 1：武器攻擊效果匹配
```typescript
// 伺服器端：根據武器標籤選擇視覺效果
class ProjectileWeapon {
    getVisualEffectId(): string {
        const weaponTags = this.modifiers
            .flatMap(mod => mod.tags?.split(',') || [])
            .filter((tag, index, self) => self.indexOf(tag) === index);
        
        // 優先匹配完全相符的效果
        const exactMatch = VisualEffectManager.findByTags(weaponTags);
        if (exactMatch) return exactMatch.effectId;
        
        // 降級匹配部分標籤
        if (weaponTags.includes('fire')) {
            return weaponTags.includes('explosive') 
                ? 'fire_explosion' 
                : 'fire_projectile';
        }
        
        return 'basic_projectile';
    }
}
```

### 場景 2：動態效果增強
```typescript
// 客戶端：根據標籤動態調整效果
class VisualEffectManager {
    playEffect(effectId: string, context: EffectContext) {
        const config = this.getConfig(effectId);
        const tags = config.tags?.split(',') || [];
        
        // 基礎效果播放
        const effect = this.createEffect(config);
        
        // 根據標籤添加額外視覺
        if (tags.includes('critical')) {
            effect.scale *= 1.5;              // 暴擊效果放大
            effect.particleCount *= 2;        // 粒子加倍
            this.cameraShake(0.5);            // 相機震動
        }
        
        if (tags.includes('aoe')) {
            this.showRangeCircle(context.position, context.radius);
        }
        
        if (tags.includes('chain')) {
            this.drawChainPath(context.targets);
        }
        
        return effect;
    }
}
```

### 場景 3：效果查詢與過濾
```typescript
// 工具函數：按標籤查詢效果
class VisualEffectQuery {
    // 查詢包含所有指定標籤的效果
    findByAllTags(tags: string[]): VisualEffectDefinition[] {
        return this.effects.filter(effect => {
            const effectTags = effect.tags?.split(',') || [];
            return tags.every(tag => effectTags.includes(tag));
        });
    }
    
    // 查詢包含任意標籤的效果
    findByAnyTag(tags: string[]): VisualEffectDefinition[] {
        return this.effects.filter(effect => {
            const effectTags = effect.tags?.split(',') || [];
            return tags.some(tag => effectTags.includes(tag));
        });
    }
    
    // 按元素分組
    groupByElement(): Record<string, VisualEffectDefinition[]> {
        const elements = ['fire', 'ice', 'lightning', 'poison', 'holy', 'shadow', 'arcane'];
        return elements.reduce((acc, element) => {
            acc[element] = this.findByAnyTag([element]);
            return acc;
        }, {} as Record<string, VisualEffectDefinition[]>);
    }
}
```

### 場景 4：效果統計與報表
```typescript
// 分析工具：統計標籤使用情況
class VisualEffectAnalytics {
    generateReport() {
        const tagStats = new Map<string, number>();
        const elementStats = new Map<string, number>();
        
        for (const effect of this.effects) {
            const tags = effect.tags?.split(',') || [];
            
            // 統計所有標籤
            tags.forEach(tag => {
                tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
            });
            
            // 統計元素標籤
            const elementTags = ['fire', 'ice', 'lightning', 'poison', 'holy', 'shadow', 'arcane'];
            tags.filter(tag => elementTags.includes(tag))
                .forEach(element => {
                    elementStats.set(element, (elementStats.get(element) || 0) + 1);
                });
        }
        
        return {
            totalEffects: this.effects.length,
            tagStats: Array.from(tagStats.entries()).sort((a, b) => b[1] - a[1]),
            elementStats: Array.from(elementStats.entries()).sort((a, b) => b[1] - a[1]),
            mostUsedTags: Array.from(tagStats.entries()).slice(0, 10),
        };
    }
}
```

---

## 📐 標籤命名規範

### 1. 使用小寫字母
```
✅ fire, explosive, critical
❌ Fire, EXPLOSIVE, Critical
```

### 2. 使用下劃線分隔複合詞
```
✅ area_of_effect (可縮寫為 aoe)
✅ damage_over_time (可縮寫為 dot)
❌ areaOfEffect, AreaOfEffect
```

### 3. 保持簡短且描述性
```
✅ fire, ice, knockback
❌ fire_element_damage, ice_cold_freezing_effect
```

### 4. 標籤順序建議
```
[元素] → [行為] → [影響] → [狀態]

範例：
fire,explosive,damage          // 火焰爆炸傷害
ice,projectile,slow            // 冰霜投射減速
lightning,chain,damage,aoe     // 閃電連鎖範圍傷害
```

---

## 🎯 Tags 排列順序規範（詳細版）

### 標準四層排列順序

為了保持一致性和可讀性，Tags 必須按照以下固定順序排列：

```
第一層：元素標籤 (Element Tags)
第二層：行為標籤 (Behavior Tags)  
第三層：影響標籤 (Impact Tags)
第四層：狀態標籤 (Status Tags)
```

---

### 第一層：元素標籤（Element Tags）
**定義效果的基礎元素屬性，必須放在最前面**

#### 標準元素列表（優先順序）
```
fire        - 火焰
ice         - 冰霜
lightning   - 閃電
poison      - 毒素
blood       - 血液
holy        - 神聖
shadow      - 暗影
arcane      - 奧術
physical    - 物理
```

#### 規則
- 每個效果通常只有一個主元素
- 如有複合元素，主元素在前，次元素在後
- 元素標籤**必須是第一個標籤**

```typescript
✅ 正確示例
"fire,explosive,aoe,burn"          // 火焰在最前
"ice,projectile,slow,frozen"       // 冰霜在最前

❌ 錯誤示例
"explosive,fire,aoe,burn"          // 火焰不在第一位
"projectile,ice,slow"              // 冰霜不在第一位
```

---

### 第二層：行為標籤（Behavior Tags）
**定義效果的動作特性和觸發方式**

#### 攻擊類型（Attack Type）
```
projectile  - 投射物
melee       - 近戰
ranged      - 遠程
```

#### 運動特性（Motion Behavior）
```
homing      - 追蹤
bouncing    - 彈跳
piercing    - 穿透
chain       - 連鎖
explosive   - 爆炸
```

#### 觸發方式（Trigger Type）
```
on_hit      - 命中時
on_death    - 死亡時
on_cast     - 施放時
on_crit     - 暴擊時
```

#### 排列順序（同層內）
```
1. 攻擊類型（projectile, melee, ranged）
2. 運動特性（homing, bouncing, piercing, chain, explosive）
3. 觸發方式（on_hit, on_death, on_cast, on_crit）
```

```typescript
✅ 正確示例
"fire,projectile,homing,explosive,on_hit"     // 攻擊→運動→觸發
"lightning,ranged,chain,bouncing,on_crit"     // 攻擊→運動→觸發

❌ 錯誤示例
"fire,on_hit,projectile,explosive"            // 觸發在攻擊類型前
"lightning,chain,ranged,on_crit"              // 運動在攻擊類型前
```

---

### 第三層：影響標籤（Impact Tags）
**定義效果的作用範圍和傷害類型**

#### 範圍類型（Area Type）
```
aoe         - 範圍效果
single      - 單體
line        - 直線
cone        - 錐形
```

#### 傷害類型（Damage Type）
```
dot         - 持續傷害
burst       - 爆發傷害
instant     - 瞬間傷害
damage      - 一般傷害
```

#### 控場效果（Crowd Control）
```
knockback   - 擊退
stun        - 暈眩
freeze      - 冰凍
slow        - 減速
```

#### 排列順序（同層內）
```
1. 範圍類型（aoe, single, line, cone）
2. 傷害類型（dot, burst, instant, damage）
3. 控場效果（knockback, stun, freeze, slow）
```

```typescript
✅ 正確示例
"fire,projectile,aoe,burst,knockback"         // 範圍→傷害→控場
"poison,ranged,single,dot,slow"               // 範圍→傷害→控場

❌ 錯誤示例
"fire,projectile,knockback,aoe,burst"         // 控場在範圍前
"poison,ranged,slow,single,dot"               // 控場在範圍前
```

---

### 第四層：狀態標籤（Status Tags）
**定義附加的狀態效果，必須放在最後**

#### 負面狀態（Debuff）
```
burn        - 燃燒
bleed       - 流血
poison_stack- 中毒堆疊
frozen      - 冰凍狀態
cursed      - 詛咒
```

#### 正面狀態（Buff）
```
heal        - 治療
buff        - 增益
shield      - 護盾
```

#### 特殊狀態（Special）
```
critical    - 暴擊特效
combo       - 連擊特效
lifesteal   - 生命偷取
```

#### 排列順序（同層內）
```
1. 負面狀態（burn, bleed, poison_stack, frozen）
2. 正面狀態（heal, buff, shield）
3. 特殊狀態（critical, combo, lifesteal）
```

```typescript
✅ 正確示例
"fire,projectile,aoe,burn"                    // 狀態在最後
"ice,melee,single,frozen"                     // 狀態在最後
"physical,ranged,burst,critical"              // 特殊狀態在最後

❌ 錯誤示例
"fire,burn,projectile,aoe"                    // 狀態不在最後
"ice,frozen,melee,single"                     // 狀態不在最後
```

---

### 完整排列範例（四層結構）

#### 範例 1：火焰爆炸箭
```csv
effectId,tags,description
fire_explosion_arrow,"fire,projectile,explosive,aoe,burst,burn","火焰投射物爆炸造成範圍燃燒"
```

**解析**：
```
第一層 [元素]：fire                    - 火焰元素
第二層 [行為]：projectile,explosive    - 投射物+爆炸行為
第三層 [影響]：aoe,burst               - 範圍+爆發傷害
第四層 [狀態]：burn                    - 燃燒狀態
```

---

#### 範例 2：連鎖閃電
```csv
effectId,tags,description
chain_lightning,"lightning,ranged,chain,bouncing,on_hit,line,instant,stun","閃電連鎖彈跳暈眩敵人"
```

**解析**：
```
第一層 [元素]：lightning                      - 閃電元素
第二層 [行為]：ranged,chain,bouncing,on_hit   - 遠程+連鎖+彈跳+命中觸發
第三層 [影響]：line,instant,stun              - 直線+瞬間傷害+暈眩
第四層 [狀態]：(無)                           - 無額外狀態
```

---

#### 範例 3：冰霜減速箭
```csv
effectId,tags,description
frost_arrow,"ice,projectile,homing,single,instant,slow,frozen","追蹤冰箭減速並冰凍目標"
```

**解析**：
```
第一層 [元素]：ice                     - 冰霜元素
第二層 [行為]：projectile,homing       - 投射物+追蹤
第三層 [影響]：single,instant,slow     - 單體+瞬間+減速
第四層 [狀態]：frozen                  - 冰凍狀態
```

---

#### 範例 4：暴擊特效
```csv
effectId,tags,description
critical_strike,"physical,melee,single,burst,critical","近戰暴擊爆發特效"
```

**解析**：
```
第一層 [元素]：physical          - 物理元素
第二層 [行為]：melee             - 近戰
第三層 [影響]：single,burst      - 單體+爆發
第四層 [狀態]：critical          - 暴擊特效
```

---

#### 範例 5：毒雲持續傷害
```csv
effectId,tags,description
poison_cloud,"poison,ranged,on_cast,aoe,dot,slow,poison_stack","施放毒雲持續傷害並堆疊中毒"
```

**解析**：
```
第一層 [元素]：poison                    - 毒素元素
第二層 [行為]：ranged,on_cast            - 遠程+施放時
第三層 [影響]：aoe,dot,slow              - 範圍+持續傷害+減速
第四層 [狀態]：poison_stack              - 中毒堆疊狀態
```

---

### 排列順序檢查清單

使用以下檢查清單確保 Tags 順序正確：

```
✅ 步驟 1：最前面是元素標籤？
   → fire, ice, lightning, poison, blood, holy, shadow, arcane, physical

✅ 步驟 2：接著是行為標籤？
   → projectile/melee/ranged → homing/chain/explosive → on_hit/on_cast

✅ 步驟 3：然後是影響標籤？
   → aoe/single/line → dot/burst/instant → knockback/stun/slow

✅ 步驟 4：最後是狀態標籤？
   → burn/bleed/frozen → heal/buff → critical/combo
```

---

### 快速驗證公式

```
Element → Behavior → Impact → Status
(元素)  → (行為)   → (影響) → (狀態)

記憶口訣：「元行影狀」(元素→行為→影響→狀態)
```

---

### 常見錯誤與修正

#### 錯誤 1：元素不在第一位
```typescript
❌ 錯誤："explosive,fire,aoe,burn"
✅ 正確："fire,explosive,aoe,burn"
```

#### 錯誤 2：狀態不在最後
```typescript
❌ 錯誤："fire,burn,projectile,aoe"
✅ 正確："fire,projectile,aoe,burn"
```

#### 錯誤 3：同層順序錯誤
```typescript
❌ 錯誤："fire,on_hit,projectile,aoe"        // 觸發在攻擊類型前
✅ 正確："fire,projectile,on_hit,aoe"

❌ 錯誤："fire,projectile,knockback,aoe"     // 控場在範圍前
✅ 正確："fire,projectile,aoe,knockback"
```

#### 錯誤 4：混亂的多層標籤
```typescript
❌ 錯誤："chain,lightning,on_hit,aoe,stun,bouncing"
✅ 正確："lightning,chain,bouncing,on_hit,aoe,stun"

解析正確順序：
第一層：lightning
第二層：chain,bouncing,on_hit
第三層：aoe,stun
```

---

### 工具輔助（未來實現）

```typescript
/**
 * Tags 排序驗證工具
 * 可用於開發時自動檢查和修正 Tags 順序
 */
class TagsSorter {
    private static LAYER_ORDER = {
        // 第一層：元素
        element: ['fire', 'ice', 'lightning', 'poison', 'blood', 'holy', 'shadow', 'arcane', 'physical'],
        
        // 第二層：行為
        behavior: [
            'projectile', 'melee', 'ranged',           // 攻擊類型
            'homing', 'bouncing', 'piercing', 'chain', 'explosive',  // 運動特性
            'on_hit', 'on_death', 'on_cast', 'on_crit'  // 觸發方式
        ],
        
        // 第三層：影響
        impact: [
            'aoe', 'single', 'line', 'cone',           // 範圍類型
            'dot', 'burst', 'instant', 'damage',       // 傷害類型
            'knockback', 'stun', 'freeze', 'slow'      // 控場效果
        ],
        
        // 第四層：狀態
        status: [
            'burn', 'bleed', 'poison_stack', 'frozen', 'cursed',  // 負面狀態
            'heal', 'buff', 'shield',                  // 正面狀態
            'critical', 'combo', 'lifesteal'           // 特殊狀態
        ]
    };

    /**
     * 自動排序 Tags
     */
    static sort(tags: string): string {
        const tagArray = tags.split(',').map(t => t.trim());
        
        const sorted = tagArray.sort((a, b) => {
            const layerA = this.getLayerIndex(a);
            const layerB = this.getLayerIndex(b);
            
            if (layerA !== layerB) {
                return layerA - layerB;
            }
            
            // 同層內按定義順序排列
            return this.getTagIndexInLayer(a) - this.getTagIndexInLayer(b);
        });
        
        return sorted.join(',');
    }

    /**
     * 驗證 Tags 順序
     */
    static validate(tags: string): { valid: boolean; message: string; suggestion?: string } {
        const sorted = this.sort(tags);
        
        if (sorted === tags) {
            return { valid: true, message: '✅ Tags 順序正確' };
        }
        
        return { 
            valid: false, 
            message: '❌ Tags 順序不正確',
            suggestion: `建議順序：${sorted}`
        };
    }

    /**
     * 獲取標籤所屬層級
     */
    private static getLayerIndex(tag: string): number {
        if (this.LAYER_ORDER.element.includes(tag)) return 0;
        if (this.LAYER_ORDER.behavior.includes(tag)) return 1;
        if (this.LAYER_ORDER.impact.includes(tag)) return 2;
        if (this.LAYER_ORDER.status.includes(tag)) return 3;
        return 999; // 未知標籤放最後
    }

    /**
     * 獲取標籤在層內的位置
     */
    private static getTagIndexInLayer(tag: string): number {
        for (const [layer, tags] of Object.entries(this.LAYER_ORDER)) {
            const index = tags.indexOf(tag);
            if (index !== -1) return index;
        }
        return 999;
    }
}

// 使用範例
const test1 = TagsSorter.validate('explosive,fire,burn,aoe');
console.log(test1);
// { valid: false, message: '❌ Tags 順序不正確', suggestion: 'fire,explosive,aoe,burn' }

const test2 = TagsSorter.validate('fire,explosive,aoe,burn');
console.log(test2);
// { valid: true, message: '✅ Tags 順序正確' }
```

---

## 🔗 與其他系統的關聯

### 1. 與武器標籤系統對應
```typescript
// WeaponModifier.tags → VisualEffectDefinition.tags
武器詞綴標籤                視覺效果標籤
├─ fire                  → fire (元素匹配)
├─ explosive             → explosive (行為匹配)
├─ knockback             → knockback (影響匹配)
└─ pierce                → pierce (行為匹配)

// 自動匹配邏輯
const visualEffectId = matchVisualEffectByTags(weapon.modifiers.flatMap(m => m.tags));
```

### 2. 與狀態效果系統關聯
```typescript
// StatusEffectDefinition.elementTags → VisualEffectDefinition.tags
狀態效果標籤              視覺效果標籤
├─ burn (fire)           → fire,dot (持續燃燒效果)
├─ freeze (ice)          → ice,debuff (冰凍視覺)
├─ poison                → poison,dot (毒霧效果)
└─ stun                  → stun,control (暈眩星星)
```

### 3. 與傷害系統關聯
```typescript
// DamageInfo.elementTags → VisualEffectDefinition.tags
傷害元素標籤              視覺效果標籤
├─ physical              → physical,damage
├─ fire,elemental        → fire,damage
├─ ice,elemental         → ice,damage
└─ lightning,elemental   → lightning,damage
```

---

## 🎯 最佳實踐

### ✅ 推薦做法

#### 1. 使用多層標籤
```csv
effectId,tags
fire_explosion,"fire,explosive,aoe,damage"
ice_projectile,"ice,projectile,slow,damage"
healing_aura,"holy,healing,buff,area"
```

#### 2. 保持標籤一致性
```typescript
// 統一的標籤詞彙表
const ELEMENT_TAGS = ['fire', 'ice', 'lightning', 'poison', 'holy', 'shadow', 'arcane'];
const BEHAVIOR_TAGS = ['projectile', 'explosive', 'aoe', 'dot', 'chain', 'pierce'];
const IMPACT_TAGS = ['damage', 'critical', 'knockback', 'stun', 'healing', 'buff'];
```

#### 3. 標籤驅動邏輯
```typescript
// 根據標籤自動應用邏輯，而非硬編碼
function applyEffectLogic(effect: VisualEffect) {
    const tags = effect.tags?.split(',') || [];
    
    for (const tag of tags) {
        const handler = tagHandlers.get(tag);
        if (handler) {
            handler(effect);
        }
    }
}

// 註冊標籤處理器
tagHandlers.set('critical', (effect) => {
    effect.scale *= 1.5;
    cameraShake(0.5);
});

tagHandlers.set('aoe', (effect) => {
    showRangeCircle(effect.position, effect.radius);
});
```

### ❌ 避免做法

#### 1. 過度細分標籤
```
❌ fire_small, fire_medium, fire_large
✅ fire (使用 effectScale 參數控制大小)
```

#### 2. 硬編碼標籤邏輯
```typescript
// ❌ 硬編碼
if (effect.effectId === 'fire_explosion') {
    cameraShake(0.3);
}

// ✅ 標籤驅動
if (effect.tags?.includes('explosive')) {
    cameraShake(0.3);
}
```

#### 3. 標籤命名不一致
```
❌ fire, Ice, LIGHTNING, Poison
✅ fire, ice, lightning, poison
```

---

## 📊 標籤使用統計（範例）

基於 `VisualEffectDefinitions_完整範例.csv` 的 32 個效果：

| 標籤類別 | 標籤 | 使用次數 | 百分比 |
|---------|------|---------|--------|
| 元素 | fire | 5 | 15.6% |
| 元素 | ice | 4 | 12.5% |
| 元素 | lightning | 4 | 12.5% |
| 元素 | poison | 4 | 12.5% |
| 行為 | projectile | 12 | 37.5% |
| 行為 | explosive | 10 | 31.3% |
| 行為 | aoe | 3 | 9.4% |
| 影響 | damage | 20 | 62.5% |
| 影響 | critical | 1 | 3.1% |
| 影響 | healing | 1 | 3.1% |

---

## 🚀 進階應用

### 1. 標籤權重系統
```typescript
// 根據標籤權重計算效果匹配度
const tagWeights = {
    fire: 3,        // 元素權重高
    explosive: 2,   // 行為權重中
    damage: 1,      // 影響權重低
};

function calculateMatchScore(weaponTags: string[], effectTags: string[]): number {
    return weaponTags.reduce((score, tag) => {
        if (effectTags.includes(tag)) {
            return score + (tagWeights[tag] || 1);
        }
        return score;
    }, 0);
}
```

### 2. 標籤繼承系統
```typescript
// 標籤父子關係
const tagHierarchy = {
    elemental: ['fire', 'ice', 'lightning'],
    physical: ['bleed', 'knockback', 'stun'],
    magic: ['holy', 'shadow', 'arcane'],
};

function hasParentTag(tags: string[], parentTag: string): boolean {
    const childTags = tagHierarchy[parentTag] || [];
    return tags.some(tag => childTags.includes(tag));
}
```

### 3. 標籤組合效果
```typescript
// 特定標籤組合觸發特殊效果
const tagCombos = [
    {
        tags: ['fire', 'ice'],
        effect: 'steam_explosion',  // 火+冰 = 蒸汽爆炸
    },
    {
        tags: ['fire', 'poison'],
        effect: 'toxic_fire',       // 火+毒 = 毒火
    },
    {
        tags: ['lightning', 'water'],
        effect: 'electrocution',    // 雷+水 = 觸電
    },
];
```

---

## 📚 總結

### Tags 標籤的核心價值

1. **靈活性** - 支援動態組合和擴展
2. **可維護性** - 減少硬編碼邏輯
3. **可擴展性** - 易於添加新效果類型
4. **一致性** - 統一的分類系統
5. **關聯性** - 與其他遊戲系統無縫整合

### 設計原則

- ✅ 標籤是 **描述性元數據**，不是指令
- ✅ 標籤應該 **易讀易懂**，團隊成員都能理解
- ✅ 標籤應該 **可組合**，支援多重分類
- ✅ 標籤應該 **與遊戲邏輯解耦**，避免過度依賴

---

**最後更新：** 2025年11月3日  
**版本：** 1.0.0
