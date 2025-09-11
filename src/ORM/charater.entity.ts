

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { AccountORM } from "./account.entity";
import { LevelUtils } from "../Util/Utils";
import { CharacterTalentData } from "@/Types/Game/TalentTypes";

@Entity("character")
export class CharacterORM {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string = "";

    @Column()
    exp: number = 0;

    @Column({ type: 'text', nullable: true })
    talentData: string = "{}"; // JSON 格式儲存天賦資料

    @CreateDateColumn()
    createTime?: Date;

    @UpdateDateColumn()
    updateTime?: Date;

    @ManyToOne(() => AccountORM, account => account.characters, {
        onDelete: 'CASCADE', // 若帳號被刪除，角色也會自動刪除
    })
    user: AccountORM;

    public get Lv(): number {
        const lv = LevelUtils.getLevelByExp(this.exp);
        return lv;
    }

    /**
     * 獲取角色天賦資料
     */
    public getTalentData(): CharacterTalentData {
        try {
            const parsed = JSON.parse(this.talentData || "{}");
            return {
                characterId: this.id.toString(),
                totalPoints: parsed.totalPoints || 0,
                usedPoints: parsed.usedPoints || 0,
                availablePoints: parsed.availablePoints || 0,
                allocatedTalents: parsed.allocatedTalents || {},
                lastResetTime: parsed.lastResetTime ? new Date(parsed.lastResetTime) : undefined
            };
        } catch (error) {
            console.warn(`解析角色 ${this.id} 天賦資料失敗:`, error);
            return {
                characterId: this.id.toString(),
                totalPoints: 0,
                usedPoints: 0,
                availablePoints: 0,
                allocatedTalents: {}
            };
        }
    }

    /**
     * 設定角色天賦資料
     */
    public setTalentData(talentData: CharacterTalentData): void {
        try {
            this.talentData = JSON.stringify(talentData);
        } catch (error) {
            console.error(`序列化角色 ${this.id} 天賦資料失敗:`, error);
        }
    }

    public toJSON(): any {
        return {
            id: this.id,
            lv: this.Lv,
            name: this.name,
            exp: this.exp,
            talentData: this.getTalentData()
        }
    }
}