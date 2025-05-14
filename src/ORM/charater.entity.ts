

import { 職業種類 } from "src/Shared/Enum";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { AccountORM } from "./account.entity";
import { LevelUtils } from "src/Util/Utils";
@Entity("character")
export class CharacterORM {

    @PrimaryGeneratedColumn()
    id: number;

    // @Column()
    // userId: number;

    @Column()
    name: string = "";

    @Column()
    exp: number = 0;

    @Column()
    type: 職業種類 = 職業種類.平民;

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

    public toJSON(): any {

        return {
            lv: this.Lv,
            name: this.name,
            exp: this.exp,
            type: this.type,
        }

    }
}