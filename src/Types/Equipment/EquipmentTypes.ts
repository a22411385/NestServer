/**
 * 裝備系統類型定義
 */

// 重新導入統一的屬性加成接口
import { AttributeBonus } from "../Game/GameTypes";

export { AttributeBonus };

// 向下兼容的舊接口名稱（標記為已廢棄）
/** @deprecated 使用 AttributeBonus 替代 */
export type EquipmentBonus = AttributeBonus;