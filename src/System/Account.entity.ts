import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
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

    @CreateDateColumn()
    createTime?: Date;
    @UpdateDateColumn()
    updateTime?: Date;
}