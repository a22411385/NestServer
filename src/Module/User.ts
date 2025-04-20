import { Injectable } from '@nestjs/common';
import { AccountORM } from 'src/System/ORM';


@Injectable()
export class userService {

    private readonly users: AccountORM[] = [];

    create(account: string, password) {
        //this.cats.push(cat);
    }


}