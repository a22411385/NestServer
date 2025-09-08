import { ItemType } from "@/Colyseus/Schema/Item/ServerItem";

/**
 * 武器配置定義 (從 google-sheets-cache.json 載入)
 */
export interface ItemConfigDefinition {
    id: string;
    name: string;
    type: ItemType;
    description: string;
    baseValue: number;
    rarity: string;
    stackSize: number;
    sellPrice: number;
    category: string;
    usable: boolean;
    effects: string[];
    enabled: boolean;
    npcId?: string; // 🆕 NPC商店ID - 指定哪個NPC會販賣此物品
}