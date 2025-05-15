import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn, JoinColumn, OneToOne } from "typeorm";
import { PlayerItemORM } from "./playeritem.entity";

@Entity()
export class EquipmentDataORM {

    @PrimaryColumn()
    id: number;

    @OneToOne(() => PlayerItemORM, item => item.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'id' })  // 關聯欄位就是同名
    item: PlayerItemORM;


    @Column()
    affix: string;
    @Column()
    value: number;
    @CreateDateColumn()
    createTime?: Date;
    @UpdateDateColumn()
    updateTime?: Date;

    public toJSON() {
        return {
            affix: this.affix,
            value: this.value,
        }

    }
}