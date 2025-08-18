// ----------------------------------------------------------
// item-factory.service.ts  （僅示範新增內容，保留你的 InitData）
// ----------------------------------------------------------
import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import {
    ItemBase, EquipmentItem, AffixDefinition, ConsumableItem,
    PlayerItem, PlayerEquipmentData,
    MainGroupData,
    GroupEntrieData,
    DropOptions,
    RandomAffixData
} from 'src/Game/Item/ItemData';
import { GoogleSheetsService } from './google-sheets.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerItemORM } from 'src/ORM/playeritem.entity';
import { Repository } from 'typeorm';
import { EquipmentDataORM } from 'src/ORM/equipmentData.entity';
import { EQUIP_VERSION, ITEM_RATE, ITEM_RATES, ITEM_TYPE, MonsterKind } from 'src/Shared/Enum';


@Injectable()
export class ItemFactoryService {

    @InjectRepository(PlayerItemORM)
    private itemRepo: Repository<PlayerItemORM>

    //基本物品表
    private itemBaseMap: Record<string, ItemBase> = {};

    //裝備表
    private equipmentMap: Record<string, EquipmentItem> = {};

    //物品屬性庫
    private affixPoolMap: Record<string, AffixDefinition> = {};
    //物品屬性隨機表
    private randomAffix: Record<string, RandomAffixData> = {};

    //消耗品表
    private consumableMap: Record<string, ConsumableItem> = {};

    //物品掉落
    private mainGroups: MainGroupData[] = [];
    private groupEntries: GroupEntrieData[] = [];

    public async InitData(
        googleSheetService: GoogleSheetsService,
    ) {

        await googleSheetService.InitData([

            //職業表
            // { tableName: "Profession", classType: ProfessionData },
            //怪物表
            //{ tableName: "Monster", classType: MonsterData },

            //物品基礎表
            { tableName: "ItemBase", classType: ItemBase },
            //物品屬性表
            { tableName: "ItemAffixPool", classType: AffixDefinition },
            //裝備表
            { tableName: "ItemEquipment", classType: EquipmentItem },

            //消耗品
            { tableName: "ConsumableItem", classType: ConsumableItem },

            //其他設定表
            { tableName: "MainGroups", classType: MainGroupData },
            { tableName: "GroupEntries", classType: GroupEntrieData },
            { tableName: "RandomAffix", classType: RandomAffixData }
        ]);

        let items = await googleSheetService.getSheetData<ItemBase>('ItemBase');
        let ItemAffix = await googleSheetService.getSheetData<AffixDefinition>('ItemAffixPool');
        let Equipment = await googleSheetService.getSheetData<EquipmentItem>('ItemEquipment');
        let ConsumbleItem = await googleSheetService.getSheetData<ConsumableItem>('ConsumableItem');
        this.mainGroups = await googleSheetService.getSheetData<MainGroupData>('MainGroups');
        this.groupEntries = await googleSheetService.getSheetData<GroupEntrieData>('GroupEntries');
        let random = await googleSheetService.getSheetData<RandomAffixData>('RandomAffix');
        random.forEach(item => {
            this.randomAffix[item.type] = item;
        });
        items.forEach(item => {
            this.itemBaseMap[item.ItemId] = item;
        });
        Equipment.forEach(item => {
            this.equipmentMap[item.itemId] = item;
        });
        ItemAffix.forEach(item => {
            this.affixPoolMap[item.affixId] = item;
        });
        ConsumbleItem.forEach(item => {
            this.consumableMap[item.itemId] = item;
        });

        console.log('✅ 物品系統初始化 完成');
    }


    /** ===== 產生玩家實體掉落 ===== */
    public generateDrops(opts: DropOptions): (PlayerItem | PlayerEquipmentData)[] {
        const mainId = this.kindToMainGroup(opts.kind);
        const main = this.mainGroups.find(g => g.groupId === mainId);
        if (!main) return [];

        const drops: (PlayerItem | PlayerEquipmentData)[] = [];

        for (let i = 0; i < main.rolls; i++) {
            const entry = this.pickWeighted(mainId);
            this.resolveEntry(entry, opts, drops);
        }


        return drops;
    }

    public async saveItems(items: (PlayerItem | PlayerEquipmentData)[], userId: number) {
        try {
            for (let i in items) {
                let item = items[i];
                let it = new PlayerItemORM();

                if (item.type != 'equipment') {

                    it.itemId = item.itemId;
                    it.rate = item.rate;
                    it.type = item.type;
                    it.price = item.price;
                    it.owner = userId;

                } else {
                    let eqData = item as PlayerEquipmentData;

                    it.itemId = item.itemId;
                    it.rate = item.rate;
                    it.type = item.type;
                    it.price = item.price;
                    it.owner = userId;

                    let eq = new EquipmentDataORM();
                    eq.affix = JSON.stringify(eqData.affixes);
                    eq.value = eqData.value;
                    it.equipmentData = eq;
                }

                await this.itemRepo.save(it);
            }
        } catch (error) {
            console.error(error);
        }
    }


    // ---------- 私有：遞迴解析 ----------
    private resolveEntry(entry: GroupEntrieData, opts: DropOptions, outArr: any) {

        if (entry == undefined) {
            console.error("掉落物品錯誤");
        }

        const qtyRnd = randomInt(entry.qtyMin, entry.qtyMax + 1);

        if (entry.refType === 'group') {
            for (let i = 0; i < qtyRnd; i++) {
                const sub = entry.weight === -1                     // 金幣等必掉子群組
                    ? entry
                    : this.pickWeighted(entry.refId);
                this.resolveEntry(sub, opts, outArr);
            }
            return;
        }
        const base = this.itemBaseMap[entry.refId];
        if (!base) {
            console.error('找不到物品:', entry.refId)
            return;
        }
        // ------------------ item ------------------
        if (entry.refId === 'currency_gold') {
            outArr.push(
                new PlayerItem(base.Name, entry.refId, 50, ITEM_TYPE.currency, 'common')
            );
            return;
        }
        let EquipmentLevel: EQUIP_VERSION = EQUIP_VERSION.normal;
        //如果是裝備群組 要決定物品階層
        if (entry.groupId == 'Equip_AllBase') {

            const tier = Math.max(1, Math.ceil(opts.level / 10));

            if (tier > 3) EquipmentLevel = EQUIP_VERSION.superior;
            if (tier > 5) EquipmentLevel = EQUIP_VERSION.exceptional;
            if (tier > 8) EquipmentLevel = EQUIP_VERSION.elite;

            entry.refId = entry.refId + "_" + EquipmentLevel;
        }



        // ===== 普通物品（垃圾 / 材料 / 藥水 …）=====
        if (base.Type !== 'equipment') {

            outArr.push(new PlayerItem(base.Name, base.ItemId, base.Price, base.Type, 'common'));
            return;
        }

        // ===== 裝備 =====
        const equipMeta = this.equipmentMap[base.ItemId];
        const rate = this.rollQuality(opts.kind);
        const affixCount = this.affixCountByRate(rate);
        const affixes = rate === 'legend'
            ? this.buildLegendAffixes(base.ItemId)
            : this.buildRandomAffixes(equipMeta, affixCount, opts.level);

        outArr.push(new PlayerEquipmentData(
            base.Name,
            base.ItemId, base.Price,
            ITEM_TYPE.equipment,
            rate, this.getEquitValue(equipMeta, opts.level, EquipmentLevel),
            affixes
        ));
    }
    private getItemName(itemId: string): string {
        return this.itemBaseMap[itemId].Name;
    }
    private getEquitValue(meta: EquipmentItem, level: number, eLv: EQUIP_VERSION): number {
        const tier = Math.max(1, Math.ceil(level / 10));     // 1‑60 → T1‑T6


        const 裝備基值 = {
            "plate": 2,
            "cloth": 1,
            "leather": 1.5,
            "bow": 8,
            "dagger": 5,
            "oneHandSword": 10,
            "twoHandSword": 20,
            "staff": 3,
            "tome": 0,
            "shield": 20,
        }
        const rate = {
            'normal': 1,
            'superior': 1.5,
            'exceptional': 2,
            'elite': 4,
        }

        let base = 裝備基值[meta.type];
        switch (meta.slot) {
            case 'boots':
                base = 裝備基值[meta.type] * 2;
                break;
            case 'gloves':
                base = 裝備基值[meta.type] * 1;
                break;
            case 'chest':
                base = 裝備基值[meta.type] * 10;
                break;
            case 'head':
                base = 裝備基值[meta.type] * 5;
                break;

        }


        return (base * rate[eLv]) + (base * (tier * 0.5));
    }
    // ---------- 抽 affix ----------
    private buildRandomAffixes(meta: EquipmentItem, n: number, level: number) {
        if (n === 0) return [];

        const tier = Math.max(1, Math.ceil(level / 10));     // 1‑60 → T1‑T6
        const pool = this.randomAffix[meta.type];
        const picks: AffixDefinition[] = [];

        let mainAffix = pool.mainAffix.split(',');
        let subAffix = pool.subAffix.split(',');

        //主屬性
        let mainMaxCount = n;
        for (let i = 0; i < mainMaxCount && i < mainAffix.length; i++) {
            let key = mainAffix[i].trim();
            picks.push(this.affixPoolMap[key]);
        }

        //副屬性
        let subMaxCount = n;
        for (let i = 0; i < subMaxCount && i < subAffix.length; i++) {
            let key = subAffix[i].trim();
            picks.push(this.affixPoolMap[key]);
        }


        const coef = [0, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4][tier];   // T1‑T6
        return picks.map(p => ({
            key: p.key,
            value: Math.round(randomInt(p.min, p.max + 1) * coef)
        }));
    }

    private buildLegendAffixes(itemId: string) {
        // TODO: 改成讀唯一裝表；示意固定 affix
        return [{ key: 'legendaryPower', value: 1 }];
    }

    // ---------- 工具 ----------
    private pickWeighted(groupId: string) {
        const list = this.groupEntries.filter(e => e.groupId === groupId && e.weight > 0);
        const sum = list.reduce((a, e) => a + e.weight, 0);
        let roll = Math.random() * sum;
        for (const e of list) if ((roll -= e.weight) <= 0) return e;
        return list[list.length - 1];
    }

    private kindToMainGroup(k: MonsterKind) {
        return k === 'normal' ? 'Mob_Normal' : k === 'elite' ? 'Mob_Elite' : 'Mob_Boss';
    }

    private rollQuality(k: MonsterKind): ITEM_RATE {
        const tbl = {
            normal: [65, 25, 9, 1, 0.05],
            elite: [30, 35, 25, 9.5, 0.5],
            boss: [0, 0, 0, 95, 5]
        }[k];
        let r = Math.random() * 100;
        for (let i = 0; i < tbl.length; i++) {
            if ((r -= tbl[i]) <= 0) return ITEM_RATES[i];
        }
        return 'common';
    }

    private affixCountByRate(rate: string) {
        return { common: 1, uncommon: 2, rare: 3, epic: 4 }[rate] ?? 0;
    }
}