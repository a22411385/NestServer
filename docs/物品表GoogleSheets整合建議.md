# 物品表 Google Sheets 整合建議

## 📊 建議的 Google Sheets 表格結構

基於您現有的 `WeaponConfigs` 和 `WeaponProperties` 結構，建議新增一個 `ItemConfigs` 表格。

### 新增表格: ItemConfigs

#### 欄位設計
與您的 `WeaponConfigs` 保持相似的結構風格：

```
Column A: id               (物品ID)
Column B: name             (物品名稱)  
Column C: type             (物品類型)
Column D: description      (物品描述)
Column E: baseValue        (基礎價值)
Column F: rarity          (稀有度)
Column G: stackSize       (堆疊上限)
Column H: sellPrice       (販賣價格)
Column I: category        (分類)
Column J: usable          (可使用)
Column K: effects         (效果字串)
Column L: enabled         (是否啟用)
```

---

## 📋 建議的物品資料 (複製貼上格式)

### 表頭行
```
id	name	type	description	baseValue	rarity	stackSize	sellPrice	category	usable	effects	enabled
```

### 資料行 (每行一個物品)

#### 💰 貨幣類
```
gold	金幣	CURRENCY	通用貨幣	1	common	9999	1	currency	false		true
gem	寶石	CURRENCY	珍貴貨幣	100	rare	999	100	currency	false		true
crystal	水晶	CURRENCY	高級貨幣	1000	epic	99	1000	currency	false		true
```

#### 🛠️ 基礎材料
```
iron_ore	鐵礦石	MATERIAL	基礎金屬礦物	5	common	999	2	ore	false		true
copper_ore	銅礦石	MATERIAL	基礎金屬礦物	3	common	999	1	ore	false		true
wood	木材	MATERIAL	基礎建材	2	common	999	1	crafting	false		true
stone	石材	MATERIAL	基礎建材	1	common	999	1	crafting	false		true
leather	皮革	MATERIAL	動物皮毛	8	common	99	3	crafting	false		true
bone	骨頭	MATERIAL	動物骨骼	4	common	99	2	crafting	false		true
fiber	纖維	MATERIAL	植物纖維	2	common	999	1	crafting	false		true
oil	機油	MATERIAL	工業用油	15	uncommon	99	8	crafting	false		true
```

#### ✨ 稀有材料
```
silver_ore	銀礦石	MATERIAL	珍貴金屬礦物	25	uncommon	99	12	ore	false		true
gold_ore	金礦石	MATERIAL	珍貴金屬礦物	50	rare	99	25	ore	false		true
mithril_ore	秘銀礦石	MATERIAL	魔法金屬	200	epic	10	100	ore	false		true
adamant_ore	精金礦石	MATERIAL	傳說金屬	1000	legendary	5	500	ore	false		true
magic_crystal	魔法水晶	MATERIAL	魔力結晶	100	rare	20	50	magic	false		true
elemental_core	元素核心	MATERIAL	元素精華	300	epic	10	150	magic	false		true
dragon_scale	龍鱗	MATERIAL	龍族鱗片	500	epic	5	250	rare_drop	false		true
phoenix_feather	鳳凰羽毛	MATERIAL	神鳥羽毛	800	legendary	3	400	rare_drop	false		true
```

#### 🌿 藥草材料
```
herb_common	普通草藥	MATERIAL	基礎藥草	3	common	99	1	herb	false		true
herb_healing	治療草藥	MATERIAL	恢復用草藥	10	uncommon	50	5	herb	false		true
herb_mana	魔力草藥	MATERIAL	魔力恢復草藥	12	uncommon	50	6	herb	false		true
herb_rare	稀有草藥	MATERIAL	珍貴藥草	50	rare	20	25	herb	false		true
mushroom_red	紅蘑菇	MATERIAL	毒性蘑菇	8	common	99	4	herb	false		true
mushroom_blue	藍蘑菇	MATERIAL	魔力蘑菇	15	uncommon	50	7	herb	false		true
```

#### 🧪 消耗品
```
health_potion_small	小型治療藥水	CONSUMABLE	恢復50生命值	25	common	10	12	potion	true	heal:50	true
health_potion_medium	中型治療藥水	CONSUMABLE	恢復150生命值	75	uncommon	10	37	potion	true	heal:150	true
health_potion_large	大型治療藥水	CONSUMABLE	恢復400生命值	200	rare	5	100	potion	true	heal:400	true
mana_potion_small	小型魔力藥水	CONSUMABLE	恢復30魔力值	20	common	10	10	potion	true	mana:30	true
mana_potion_medium	中型魔力藥水	CONSUMABLE	恢復100魔力值	60	uncommon	10	30	potion	true	mana:100	true
mana_potion_large	大型魔力藥水	CONSUMABLE	恢復250魔力值	150	rare	5	75	potion	true	mana:250	true
stamina_potion	體力藥水	CONSUMABLE	恢復全部體力	40	uncommon	10	20	potion	true	stamina:100	true
buff_strength	力量藥水	CONSUMABLE	增加力量30分鐘	100	rare	5	50	buff	true	buff:strength:1800	true
buff_speed	速度藥水	CONSUMABLE	增加速度30分鐘	80	rare	5	40	buff	true	buff:speed:1800	true
buff_defense	防禦藥水	CONSUMABLE	增加防禦30分鐘	120	rare	5	60	buff	true	buff:defense:1800	true
```

#### 🍖 食物
```
bread	麵包	CONSUMABLE	基礎食物	5	common	20	2	food	true	heal:20	true
meat	肉類	CONSUMABLE	蛋白質食物	15	common	20	7	food	true	heal:40,buff:strength:300	true
fruit	水果	CONSUMABLE	維他命食物	8	common	20	4	food	true	heal:25,mana:15	true
fish	魚類	CONSUMABLE	海鮮食物	20	uncommon	10	10	food	true	heal:60,mana:30	true
cake	蛋糕	CONSUMABLE	高級食物	50	rare	5	25	food	true	heal:100,mana:50,buff:happiness:600	true
```

#### 📜 任務物品
```
scroll_teleport	傳送卷軸	MISC	回城卷軸	100	uncommon	10	50	scroll	true	teleport:town	true
scroll_identify	鑑定卷軸	MISC	物品鑑定	50	common	20	25	scroll	true	identify	true
key_bronze	青銅鑰匙	MISC	開啟青銅寶箱	20	common	10	10	key	true	unlock:bronze	true
key_silver	白銀鑰匙	MISC	開啟白銀寶箱	100	uncommon	5	50	key	true	unlock:silver	true
key_gold	黃金鑰匙	MISC	開啟黃金寶箱	500	rare	3	250	key	true	unlock:gold	true
map_fragment	地圖碎片	MISC	古老地圖的一部分	200	epic	10	100	quest	false		true
ancient_coin	古代錢幣	MISC	神秘的古老錢幣	1000	legendary	5	500	quest	false		true
quest_token	任務證物	MISC	證明完成任務	0	common	99	0	quest	false		true
```

#### 💎 收藏品
```
ruby	紅寶石	MISC	珍貴寶石	500	epic	10	250	gem	false		true
sapphire	藍寶石	MISC	珍貴寶石	600	epic	10	300	gem	false		true
emerald	綠寶石	MISC	珍貴寶石	800	epic	10	400	gem	false		true
diamond	鑽石	MISC	最珍貴寶石	2000	legendary	5	1000	gem	false		true
pearl	珍珠	MISC	海中珍寶	300	rare	20	150	gem	false		true
artifact_piece	神器碎片	MISC	古代神器的一部分	5000	legendary	1	2500	artifact	false		true
```

---

## 📝 複製指南

1. **複製表頭**: 將表頭行複製到 Google Sheets 第一列
2. **複製資料**: 將每個分類的資料逐行複製到工作表
3. **格式檢查**: 確認每行有 12 個欄位 (包含最後的 enabled)
4. **儲存更新**: 讓您的 Google Sheets 快取系統更新資料

## 🔄 下一步

當您完成 Google Sheets 更新並且快取檔案包含 `ItemConfigs` 資料後，我們就可以：

1. **建立 ItemConfig 介面**: 定義 TypeScript 型別
2. **實作 ItemDropTable**: 基於物品表的掉落機制  
3. **整合掉落系統**: 讓 DropSystem 使用新的物品表
4. **測試物品掉落**: 驗證各種物品的掉落和撿拾

---

*這個設計與您現有的武器系統保持一致的架構模式*
