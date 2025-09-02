import { Client } from "colyseus";
import { BaseMessageHandler } from "./Base/BaseMessageHandler";
import { PermissionLevel } from "@/Types";
import { StatType } from "@/Colyseus/Schema/Unit/Hero";

/**
 * 角色處理器
 * 處理角色屬性、技能、升級相關的消息
 */
export class CharacterHandler extends BaseMessageHandler {
    private supportedTypes = [
        "allocate_stat",
        "allocate_skill",
        "reset_stats",
        "reset_skills"
    ];

    getPermissionLevel(): PermissionLevel {
        return PermissionLevel.USER;
    }

    canHandle(type: string): boolean {
        return this.supportedTypes.includes(type);
    }

    getSupportedTypes(): string[] {
        return [...this.supportedTypes];
    }

    async handle(client: Client, message: any): Promise<void> {
        const { type, data } = message;

        try {
            switch (type) {
                case "allocate_stat":
                    this.handleStatAllocation(client, data);
                    break;
                case "allocate_skill":
                    this.handleSkillAllocation(client, data);
                    break;
                case "reset_stats":
                    this.handleStatReset(client, data);
                    break;
                case "reset_skills":
                    this.handleSkillReset(client, data);
                    break;
                default:
                    throw new Error(`Unsupported character type: ${type}`);
            }

            this.logHandle(type, client.id, true);
        } catch (error) {
            this.logHandle(type, client.id, false, error.message);
            this.sendError(client, error.message);
        }
    }

    /**
     * 處理屬性點分配
     */
    private handleStatAllocation(client: Client, data: any): void {
        if (!this.validateMessage(data, ['stat', 'points'])) {
            throw new Error("屬性分配數據格式錯誤");
        }

        // 使用 UnitManager 來處理屬性分配
        this.room.unitManager.handleStatAllocation(client, {
            stat: data.stat as StatType,
            points: data.points || 1
        });

        this.sendSuccess(client, {
            message: "屬性分配成功",
            stat: data.stat,
            points: data.points
        });
    }

    /**
     * 處理技能點分配
     */
    private handleSkillAllocation(client: Client, data: any): void {
        if (!this.validateMessage(data, ['skillId', 'points'])) {
            throw new Error("技能分配數據格式錯誤");
        }

        // TODO: 實作技能系統
        throw new Error("技能系統尚未實作");
    }

    /**
     * 處理屬性重置
     */
    private handleStatReset(client: Client, data: any): void {
        // 使用 UnitManager 來處理屬性重置
        this.room.unitManager.handleStatReset(client);

        this.sendSuccess(client, { message: "屬性重置成功" });
    }

    /**
     * 處理技能重置
     */
    private handleSkillReset(client: Client, data: any): void {
        // TODO: 實作技能重置
        throw new Error("技能重置尚未實作");
    }
}
