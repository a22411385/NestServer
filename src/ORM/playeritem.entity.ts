
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne } from "typeorm";
import { EquipmentDataORM } from "./equipmentData.entity";
import { ITEM_TYPE } from "src/Shared/Enum";

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

    public toJSON() {
        return {
            itemId: this.itemId,
            rate: this.rate,
            price: this.price,
            equipmentData: this.equipmentData
        }
    }
}