import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class AccountORM {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column()
    account: string = "";

    @Column()
    openId: string = "";

    @Column()
    password: string = "";

    @CreateDateColumn()
    createTime?: Date;
    @UpdateDateColumn()
    updateTime?: Date;
}