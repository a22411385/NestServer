import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import md5 from 'md5';
import { AccountORM } from 'src/System/ORM';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {

    @InjectRepository(AccountORM)
    private usersRepo: Repository<AccountORM>

    constructor(private jwtService: JwtService) {

    }

    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.usersRepo.findOne({ where: { account: username } });

        console.log(user);
        if (user && user.password === md5(password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;

    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.userId };
        return {
            access_token: this.jwtService.sign(payload, {
                secret: process.env.JWT_KEY,
                expiresIn: '24h'
            }),
        };
    }
}