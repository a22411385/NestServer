# 武器屬性系統 - 快速查找表

## 📋 PropertyType 屬性類型總表

### 🏷️ 基礎屬性 (Basic)
| propertyType | displayName | 描述 | valueType |
|-------------|-------------|------|-----------|
| `attack_damage` | 攻擊力 | 增加武器基礎攻擊力 | range |
| `attack_speed` | 攻擊速度 | 減少攻擊間隔時間 | range |
| `attack_range` | 攻擊距離 | 增加武器攻擊範圍 | range |
| `projectile_speed` | 投射物速度 | 增加投射物的飛行速度 | range |
| `area_of_effect` | 範圍效果 | 增加技能或攻擊的影響範圍 | range |
| `pierce_count` | 穿透次數 | 投射物可以穿透的敵人數量 | range |
| `heal_amount` | 治療量 | 增加治療技能的恢復量 | range |
| `buff_duration` | 增益持續 | 增加增益效果的持續時間 | range |
| `support_radius` | 支援範圍 | 增加支援技能的影響範圍 | range |
| `sweep_angle` | 掃擊角度 | 增加近戰武器的攻擊扇形角度 | range |

### ⚔️ 戰鬥效果 (Combat)
| propertyType | displayName | 描述 | valueType | compositeFormat |
|-------------|-------------|------|-----------|----------------|
| `knockback` | 擊退 | 攻擊時將敵人向後推 | single | - |
| `critical_chance` | 暴擊機率 | 增加造成暴擊的機率 | range | - |
| `critical_damage` | 暴擊傷害 | 增加暴擊時的傷害倍數 | range | - |
| `life_steal` | 生命偷取 | 攻擊時回復等同於傷害百分比的生命值 | range | - |
| `piercing` | 穿透 | 攻擊可以穿透多個敵人 | range | - |
| `chain_attack` | 連鎖攻擊 | 攻擊可以跳躍到附近敵人 | composite | "count|damage_ratio" |
| `splash_damage` | 濺射傷害 | 攻擊對範圍內敵人造成額外傷害 | composite | "range|damage_ratio" |

### 🔥 狀態效果 (Status)
| propertyType | displayName | 描述 | valueType | compositeFormat |
|-------------|-------------|------|-----------|----------------|
| `stun` | 暈眩 | 攻擊時有機率造成敵人暈眩 | composite | "probability|duration" |
| `freeze` | 冰凍 | 攻擊時造成敵人冰凍無法移動 | single | - |
| `burn` | 燃燒 | 攻擊時有機率造成持續燃燒傷害 | composite | "probability|duration|damage" |
| `poison` | 中毒 | 攻擊時有機率造成持續中毒傷害 | composite | "probability|duration|damage" |
| `slow` | 減速 | 攻擊時有機率造成敵人移動減速 | composite | "probability|duration|intensity" |

### 💪 角色屬性 (Attribute)
| propertyType | displayName | 描述 | valueType |
|-------------|-------------|------|-----------|
| `strength` | 力量 | 增加角色的力量屬性 | range |
| `intelligence` | 智力 | 增加角色的智力屬性 | range |
| `vitality` | 體力 | 增加角色的體力屬性 | range |
| `agility` | 敏捷 | 增加角色的敏捷屬性 | range |

## 📊 Category 分類總表

| category | 中文名稱 | 包含屬性數量 | 主要用途 |
|----------|----------|------------|---------|
| `basic` | 基礎屬性 | 10個 | 武器基本數值調整 |
| `combat` | 戰鬥效果 | 7個 | 戰鬥中的特殊效果 |
| `status` | 狀態效果 | 5個 | 對敵人施加的負面狀態 |
| `attribute` | 角色屬性 | 4個 | 角色基礎屬性加成 |

## 🔗 CompositeFormat 複合格式總表

| compositeFormat | 中文說明 | 使用範例 | 解析說明 |
|----------------|----------|----------|----------|
| `probability,duration` | 機率+持續時間 | "25,3" | 25%機率持續3秒 |
| `probability,duration,damage` | 機率+持續時間+傷害 | "30,4,12" | 30%機率持續4秒每秒12傷害 |
| `probability,duration,intensity` | 機率+持續時間+強度 | "40,2,50" | 40%機率持續2秒50%效果 |
| `count,damage_ratio` | 數量+傷害比例 | "3,70" | 跳躍3次每次70%傷害 |
| `range,damage_ratio` | 範圍+傷害比例 | "150,80" | 150像素範圍80%傷害 |

## 🎯 ValueType 數值類型總表

| valueType | 中文說明 | 使用場景 | 範例 |
|-----------|----------|----------|------|
| `single` | 單一固定值 | 固定效果值 | freeze: 2 (冰凍2秒) |
| `range` | 範圍隨機值 | 隨機屬性加成 | strength: 10-25 (力量10-25點) |
| `composite` | 複合值 | 複雜狀態效果 | burn: "25,3,10" (25%機率燃燒3秒每秒10傷害) |

## 🗡️ 武器配置範例

### 近戰武器類型
- **球棒**: 擊退+暈眩+掃擊，隨機: 力量、體力、暴擊、生命偷取
- **毒刃**: 中毒+攻速，隨機: 敏捷、力量、暴擊、生命偷取
- **戰錘**: 擊退+濺射+暈眩，隨機: 力量、體力、暴擊傷害、掃擊角度
- **暗影刃**: 暴擊+生命偷取，隨機: 敏捷、力量、暴擊傷害、穿透

### 投射武器類型
- **火球**: 燃燒+範圍效果，隨機: 智力、體力、投射速度、暴擊傷害
- **冰球**: 冰凍+減速，隨機: 智力、體力、投射速度、範圍效果
- **閃電箭**: 連鎖攻擊+暈眩，隨機: 智力、敏捷、暴擊機率、穿透
- **魔法飛彈**: 穿透次數+投射速度，隨機: 智力、體力、暴擊機率、範圍效果
- **爆裂箭**: 濺射傷害+擊退，隨機: 敏捷、力量、暴擊傷害、範圍效果

### 支援武器類型
- **治療法杖**: 治療量+支援範圍，隨機: 智力、體力、增益持續、範圍效果

## 🎲 品質與隨機詞綴

| 品質 | 英文 | 隨機詞綴數 | 顏色建議 |
|------|------|----------|---------|
| 普通 | NORMAL | 0個 | 灰色 |
| 魔法 | MAGIC | 1個 | 藍色 |
| 稀有 | RARE | 2個 | 黃色 |
| 史詩 | EPIC | 3個 | 紫色 |
| 傳奇 | LEGENDARY | 4個 | 橙色 |

## 🔧 實作建議

### 屬性解析順序
1. 載入 WeaponProperties 建立屬性資料庫
2. 解析 WeaponConfigs 中的 fixedProperties 字串
3. 根據武器品質決定隨機詞綴數量
4. 從 randomProperties 池中隨機選擇並生成數值
5. 合併固定屬性與隨機屬性為最終屬性列表

### 複合值解析
```typescript
// 範例: burn 屬性 "25|3|10"
const [probability, duration, damage] = value.split('|').map(Number);
// 結果: 25%機率、持續3秒、每秒10點傷害
```

### 屬性疊加規則
- `stacked: true` - 可疊加 (如力量、攻擊力)
- `stacked: false` - 不疊加，取最高值 (如暈眩、冰凍效果)
