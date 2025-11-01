# WeaponConfigs 表更新範本

## 新增欄位說明

在 `WeaponConfigs` 工作表中，需要在 `fixedProperties` 欄位後新增兩個欄位：

1. **fixedModifiers** - 武器詞綴（用逗號分隔）
2. **fixedBonuses** - 屬性加成（用逗號分隔）

---

## CSV 範本

```csv
ㄎ
```

---

## 範例說明

### iron_sword（鐵劍）
- **fixedProperties**: `burn` - 造成燃燒效果
- **fixedModifiers**: `piercing` - 具有穿透能力
- **fixedBonuses**: `strength` - 增加力量屬性

### fire_staff（火焰法杖）
- **fixedProperties**: `burn` - 造成燃燒效果
- **fixedModifiers**: `chain_attack` - 連鎖攻擊
- **fixedBonuses**: `intelligence` - 增加智力屬性

### ice_bow（寒冰弓）
- **fixedProperties**: `freeze` - 造成冰凍效果
- **fixedModifiers**: `piercing,bounce_attack` - 穿透且彈射（多個用逗號分隔）
- **fixedBonuses**: `agility` - 增加敏捷屬性

### poison_dagger（毒刃）
- **fixedProperties**: `poison` - 造成中毒效果
- **fixedModifiers**: `critical_chance` - 提高暴擊率
- **fixedBonuses**: `agility` - 增加敏捷屬性

### lightning_wand（閃電法杖）
- **fixedProperties**: `stun` - 造成眩暈效果
- **fixedModifiers**: `homing` - 追蹤攻擊
- **fixedBonuses**: `intelligence` - 增加智力屬性

---

## 可用的配置值

### StatusEffectDefinitions（狀態效果）
- `burn` - 燃燒
- `freeze` - 冰凍
- `poison` - 中毒
- `slow` - 緩速
- `stun` - 眩暈
- `bleed` - 流血
- `knockback` - 擊退

### WeaponModifiers（武器詞綴）
- `piercing` - 穿透
- `chain_attack` - 連鎖攻擊
- `bounce_attack` - 彈射攻擊
- `homing` - 追蹤攻擊
- `explosive` - 爆炸攻擊
- `penetrating_shot` - 穿透射擊
- `critical_chance` - 暴擊率加成
- `critical_damage` - 暴擊傷害加成
- `attack_speed_bonus` - 攻擊速度加成
- `range_bonus` - 攻擊範圍加成
- `projectile_speed` - 投射物速度
- `projectile_size` - 投射物大小
- `sweep_angle` - 掃擊角度
- `multi_shot` - 多重射擊

### AttributeBonus（屬性加成）
- `strength` - 力量加成
- `intelligence` - 智力加成
- `agility` - 敏捷加成
- `vitality` - 體質加成
- `attack_speed` - 攻擊速度加成
- `max_hp` - 最大生命加成

---

## 更新步驟

1. 開啟你的 Google Sheets
2. 找到 `WeaponConfigs` 工作表
3. 在 `fixedProperties` 欄位後插入兩個新欄位：
   - `fixedModifiers`
   - `fixedBonuses`
4. 根據上面的範本填入資料
5. 儲存工作表
6. 在本地執行快取更新：
   ```bash
   # 如果有更新腳本
   npm run update-cache
   
   # 或者重啟伺服器讓 GoogleSheetCache 自動更新
   npm run dev
   ```

---

## 注意事項

1. **多個值用逗號分隔**：例如 `piercing,bounce_attack`
2. **可以留空**：如果某個武器沒有詞綴或加成，欄位可以留空
3. **ID 必須存在**：填入的 ID 必須存在於對應的定義表中（StatusEffectDefinitions、WeaponModifiers、AttributeBonus）
4. **大小寫敏感**：ID 必須完全匹配（全部小寫，使用底線）

---

## 測試建議

建立一個測試武器包含所有三種屬性：

```csv
test_weapon,test_weapon,測試武器,包含所有屬性的測試武器,weapon.test,100,1000,300,BaseSword,MeleeWeapon,,burn.freeze,piercing.chain_attack,strength.intelligence,,true
```

這個武器會：
- 造成燃燒和冰凍效果
- 具有穿透和連鎖攻擊
- 增加力量和智力

在遊戲中生成這個武器並檢查：
1. 狀態效果是否正確應用
2. 武器詞綴是否影響傷害計算
3. 屬性加成是否增加角色屬性
