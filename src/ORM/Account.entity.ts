import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from "typeorm";
import { CharacterORM } from "./charater.entity";

@Entity({ name: "account" })
export class AccountORM {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index({ unique: true })
    account: string = "";

    @Column()
    openId: string = "";

    @Column()
    password: string = "";


    @OneToMany(() => CharacterORM, character => character.user)
    characters: CharacterORM[];

    @CreateDateColumn()
    createTime?: Date;
    @UpdateDateColumn()
    updateTime?: Date;
}