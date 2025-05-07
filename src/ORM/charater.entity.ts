

import { 職業種類 } from "src/Shared/Enum";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { AccountORM } from "./account.entity";
@Entity("character")
export class CharacterORM {

    @PrimaryGeneratedColumn()
    id: number;

    // @Column()
    // userId: number;

    @Column()
    name: string = "";

    @Column()
    lv: number = 1;

    @Column()
    exp: number = 0;

    @Column('string')
    type: 職業種類 = 職業種類.平民;

    @CreateDateColumn()
    createTime?: Date;
    @UpdateDateColumn()
    updateTime?: Date;

    @ManyToOne(() => AccountORM, account => account.characters, {
        onDelete: 'CASCADE', // 若帳號被刪除，角色也會自動刪除
    })
    user: AccountORM;

}