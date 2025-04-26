

import { 職業種類 } from "src/Shared/Enum";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
@Entity("character")
export class CharacterORM {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index('user')
    userId: number;

    @Column()
    name: string = "";

    @Column()
    lv: number = 1;

    @Column()
    exp: number = 0;

    @Column()
    type: 職業種類 = 0;

    @CreateDateColumn()
    createTime?: Date;
    @UpdateDateColumn()
    updateTime?: Date;
}