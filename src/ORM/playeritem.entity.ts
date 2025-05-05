import { ITEM_TYPE, PlayerEquipmentData } from "src/Game/Item/ItemData";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne } from "typeorm";
import { EquipmentDataORM } from "./equipmentData.entity";

@Entity()
export class PlayerItemORM {

    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column()
    itemId: string;

    @Column()
    type: ITEM_TYPE;

    @Column()
    rate: 'common' | 'uncommon' | 'rate' | 'epic' | 'legend';

    @Column()
    price: number;

    @Index('owner')
    @Column()
    owner: number;


    @OneToOne(() => EquipmentDataORM, equip => equip.item, {
        cascade: true,
    })
    equipmentData?: EquipmentDataORM;

    @CreateDateColumn()
    createTime?: Date;
    @UpdateDateColumn()
    updateTime?: Date;
}