import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataCenter } from "src/Provider/DataCenter";

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'mysql', // 或 'postgres'
            host: 'localhost',
            port: 3306,     // 或 postgres 是 5432
            username: 'root',
            password: 'root',
            database: 'game',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // 開發環境可以設 true，自動建立表格
        }),

    ],
    controllers: [],
    providers: [DataCenter,
    ],
    exports: [], // 給別人用就 export
})
export class DataModule { }