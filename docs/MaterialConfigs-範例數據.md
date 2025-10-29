# 素材系統 Google Sheets 範例數據

## 📋 MaterialConfigs 表格結構

請在 Google Sheets 中創建名為 **MaterialConfigs** 的工作表，包含以下欄位：

### 欄位定義

| 欄位名稱 | 類型 | 說明 | 範例 |
|---------|------|------|------|
| id | string | 素材ID (唯一識別碼) | poison_essence |
| name | string | 素材名稱 | 毒素精華 |
| description | string | 素材描述 | 蘊含劇毒的綠色結晶，用於製作毒素武器 |
| rarity | string | 稀有度 | common, rare, epic |
| category | string | 分類 | essence, ore, special |
| stackSize | number | 最大堆疊數 | 999 |
| sellPrice | number | 出售價格 | 5 |
| baseDropRate | number | 基礎掉落率 (%) | 15 |
| minDropQuantity | number | 最小掉落數量 | 1 |
| maxDropQuantity | number | 最大掉落數量 | 3 |
| iconPath | string | 圖示路徑 | /assets/items/materials/poison_essence.png |
| usedInRecipes | string | 用於配方 (逗號分隔) | poison_dagger,poison_staff |
| dropFromEnemyLevel | number | 敵人等級需求 | 1 |
| enabled | boolean | 是否啟用 | true |

---

## 📊 範例數據 (複製到 Google Sheets)

### 1. 元素精華類 (Essence)

```
id: poison_essence
name: 毒素精華
description: 蘊含劇毒的綠色結晶，用於製作毒素武器
rarity: common
category: essence
stackSize: 999
sellPrice: 5
baseDropRate: 15
minDropQuantity: 1
maxDropQuantity: 3
iconPath: /assets/items/materials/poison_essence.png
usedInRecipes: poison_weapon_branch
dropFromEnemyLevel: 1
enabled: true
```

```
id: frost_essence
name: 冰霜精華
description: 永不融化的冰晶，用於製作冰霜武器
rarity: common
category: essence
stackSize: 999
sellPrice: 5
baseDropRate: 15
minDropQuantity: 1
maxDropQuantity: 3
iconPath: /assets/items/materials/frost_essence.png
usedInRecipes: frost_weapon_branch
dropFromEnemyLevel: 1
enabled: true
```

```
id: flame_essence
name: 火焰精華
description: 永恆燃燒的火焰結晶，用於製作火焰武器
rarity: common
category: essence
stackSize: 999
sellPrice: 5
baseDropRate: 15
minDropQuantity: 1
maxDropQuantity: 3
iconPath: /assets/items/materials/flame_essence.png
usedInRecipes: flame_weapon_branch
dropFromEnemyLevel: 1
enabled: true
```

```
id: lightning_essence
name: 閃電精華
description: 閃爍不定的雷電能量，用於製作閃電武器
rarity: common
category: essence
stackSize: 999
sellPrice: 5
baseDropRate: 15
minDropQuantity: 1
maxDropQuantity: 3
iconPath: /assets/items/materials/lightning_essence.png
usedInRecipes: lightning_weapon_branch
dropFromEnemyLevel: 1
enabled: true
```

```
id: explosive_essence
name: 爆炸精華
description: 不穩定的爆炸能量核心，用於製作爆炸武器
rarity: common
category: essence
stackSize: 999
sellPrice: 5
baseDropRate: 15
minDropQuantity: 1
maxDropQuantity: 3
iconPath: /assets/items/materials/explosive_essence.png
usedInRecipes: explosive_weapon_branch
dropFromEnemyLevel: 1
enabled: true
```

---

### 2. 礦石類 (Ore)

```
id: iron_ore
name: 鐵礦石
description: 最基礎的鍛造材料，用於製作普通武器
rarity: common
category: ore
stackSize: 999
sellPrice: 2
baseDropRate: 20
minDropQuantity: 2
maxDropQuantity: 5
iconPath: /assets/items/materials/iron_ore.png
usedInRecipes: all_weapon_branches
dropFromEnemyLevel: 1
enabled: true
```

```
id: mithril_ore
name: 秘銀礦
description: 輕盈且堅固的魔法金屬，用於製作稀有武器
rarity: rare
category: ore
stackSize: 999
sellPrice: 10
baseDropRate: 8
minDropQuantity: 1
maxDropQuantity: 2
iconPath: /assets/items/materials/mithril_ore.png
usedInRecipes: all_weapon_branches
dropFromEnemyLevel: 5
enabled: true
```

```
id: adamantite_ore
name: 精金礦
description: 最堅硬的傳奇金屬，用於製作史詩武器
rarity: epic
category: ore
stackSize: 999
sellPrice: 20
baseDropRate: 3
minDropQuantity: 1
maxDropQuantity: 1
iconPath: /assets/items/materials/adamantite_ore.png
usedInRecipes: all_weapon_branches
dropFromEnemyLevel: 10
enabled: true
```

---

### 3. 特殊材料 (Special)

```
id: weapon_scroll
name: 武器卷軸
description: 記錄武器鍛造方法的古老卷軸
rarity: rare
category: special
stackSize: 99
sellPrice: 50
baseDropRate: 5
minDropQuantity: 1
maxDropQuantity: 1
iconPath: /assets/items/materials/weapon_scroll.png
usedInRecipes: all_weapon_branches
dropFromEnemyLevel: 3
enabled: true
```

```
id: blessing_stone
name: 祝福石
description: 增加製作成功率的神秘寶石
rarity: epic
category: special
stackSize: 99
sellPrice: 100
baseDropRate: 2
minDropQuantity: 1
maxDropQuantity: 1
iconPath: /assets/items/materials/blessing_stone.png
usedInRecipes: all_weapon_branches
dropFromEnemyLevel: 8
enabled: true
```

---

## 🎯 Google Sheets 表格範例

直接複製以下格式到 Google Sheets (Tab 分隔):

```
id	name	description	rarity	category	stackSize	sellPrice	baseDropRate	minDropQuantity	maxDropQuantity	iconPath	usedInRecipes	dropFromEnemyLevel	enabled
poison_essence	毒素精華	蘊含劇毒的綠色結晶，用於製作毒素武器	common	essence	999	5	15	1	3	/assets/items/materials/poison_essence.png	poison_weapon_branch	1	TRUE
frost_essence	冰霜精華	永不融化的冰晶，用於製作冰霜武器	common	essence	999	5	15	1	3	/assets/items/materials/frost_essence.png	frost_weapon_branch	1	TRUE
flame_essence	火焰精華	永恆燃燒的火焰結晶，用於製作火焰武器	common	essence	999	5	15	1	3	/assets/items/materials/flame_essence.png	flame_weapon_branch	1	TRUE
lightning_essence	閃電精華	閃爍不定的雷電能量，用於製作閃電武器	common	essence	999	5	15	1	3	/assets/items/materials/lightning_essence.png	lightning_weapon_branch	1	TRUE
explosive_essence	爆炸精華	不穩定的爆炸能量核心，用於製作爆炸武器	common	essence	999	5	15	1	3	/assets/items/materials/explosive_essence.png	explosive_weapon_branch	1	TRUE
iron_ore	鐵礦石	最基礎的鍛造材料，用於製作普通武器	common	ore	999	2	20	2	5	/assets/items/materials/iron_ore.png	all_weapon_branches	1	TRUE
mithril_ore	秘銀礦	輕盈且堅固的魔法金屬，用於製作稀有武器	rare	ore	999	10	8	1	2	/assets/items/materials/mithril_ore.png	all_weapon_branches	5	TRUE
adamantite_ore	精金礦	最堅硬的傳奇金屬，用於製作史詩武器	epic	ore	999	20	3	1	1	/assets/items/materials/adamantite_ore.png	all_weapon_branches	10	TRUE
weapon_scroll	武器卷軸	記錄武器鍛造方法的古老卷軸	rare	special	99	50	5	1	1	/assets/items/materials/weapon_scroll.png	all_weapon_branches	3	TRUE
blessing_stone	祝福石	增加製作成功率的神秘寶石	epic	special	99	100	2	1	1	/assets/items/materials/blessing_stone.png	all_weapon_branches	8	TRUE
```

---

## 📝 使用步驟

### 1. 在 Google Sheets 創建表格
- 創建新工作表命名為 `MaterialConfigs`
- 複製上方表格數據
- 確保欄位名稱與數據格式正確

### 2. 更新 google-sheets-service.ts
在 `src/Service/google-sheets.service.ts` 中添加:

```typescript
private async fetchMaterialConfigs(): Promise<MaterialConfigDefinition[]> {
    const sheet = this.doc.sheetsByTitle['MaterialConfigs'];
    if (!sheet) {
        console.warn('⚠️ MaterialConfigs 工作表不存在');
        return [];
    }

    const rows = await sheet.getRows();
    return rows.map(row => ({
        id: row.get('id'),
        name: row.get('name'),
        description: row.get('description'),
        rarity: row.get('rarity') as MaterialRarity,
        category: row.get('category') as MaterialCategory,
        stackSize: parseInt(row.get('stackSize')) || 999,
        sellPrice: parseInt(row.get('sellPrice')) || 0,
        baseDropRate: parseFloat(row.get('baseDropRate')) || 0,
        minDropQuantity: parseInt(row.get('minDropQuantity')) || 1,
        maxDropQuantity: parseInt(row.get('maxDropQuantity')) || 1,
        iconPath: row.get('iconPath'),
        usedInRecipes: row.get('usedInRecipes'),
        dropFromEnemyLevel: parseInt(row.get('dropFromEnemyLevel')) || 1,
        enabled: row.get('enabled') === 'TRUE'
    }));
}
```

### 3. 執行同步命令
```bash
npm run sync-sheets
```

### 4. 驗證數據
檢查 `data/google-sheets-cache.json` 是否包含 `MaterialConfigs` 陣列

---

## 🎮 掉落機率設計說明

### 基礎掉落率 (baseDropRate)
- **元素精華**: 15% (普通)
- **鐵礦石**: 20% (很常見)
- **秘銀礦**: 8% (稀有)
- **精金礦**: 3% (非常稀有)
- **武器卷軸**: 5% (稀有)
- **祝福石**: 2% (極稀有)

### 掉落數量範圍
- **元素精華**: 1-3 個 (足夠製作)
- **鐵礦石**: 2-5 個 (大量需求)
- **高級礦石**: 1-2 個 (珍貴)
- **特殊材料**: 1 個 (限量)

### 敵人等級需求 (dropFromEnemyLevel)
- **Lv.1+**: 基礎材料 (元素精華、鐵礦石)
- **Lv.3+**: 武器卷軸
- **Lv.5+**: 秘銀礦
- **Lv.8+**: 祝福石
- **Lv.10+**: 精金礦

---

## ✅ 完成後確認清單

- [ ] Google Sheets 已創建 MaterialConfigs 工作表
- [ ] 10 筆素材數據已填入
- [ ] 欄位名稱與類型正確
- [ ] enabled 欄位為 TRUE/FALSE
- [ ] 執行 `npm run sync-sheets` 成功
- [ ] `google-sheets-cache.json` 包含 MaterialConfigs
- [ ] ConfigManager 可以讀取素材配置

完成後我們就可以繼續實作素材掉落系統！
