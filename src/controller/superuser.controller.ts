import { Body, Controller, Get, Inject, Post, Query } from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { SuperuserService } from "../service/superuser.service";
import { UserService } from "../service/user.service";
import { createHash, randomBytes } from "crypto";

export interface CreateSuperuserReq {
    account: string
    password: string
    username: string
    linksid: string
}

@Controller('/api/superuser')
export class SuperuserController {
    @Inject()
    ctx: Context

    @Inject()
    superuserService: SuperuserService

    @Inject()
    userService: UserService

    private generateSalt(): string {
        return randomBytes(16).toString('hex')
    }
    private getMd5(password: string, salt: string): string {
        return createHash('md5').update(password + salt).digest('hex');
    }

    @Post('/')
    async createSuperuser(@Body() superuserReq: CreateSuperuserReq) {
        const { account, password, username, linksid } = superuserReq
        if (await this.superuserService.getSuperuser(superuserReq.account)) {
            return { success: true, message: 'Fail', data: '该账户已存在' };
        }
        const user = await this.userService.getUser(linksid)
        if (user == undefined) {
            return { success: true, message: 'Fail', data: '该SteamID无对局记录' };
        }

        if (user.superuserid != undefined) {
            return { success: true, message: 'Fail', data: '该SteamID已链接, 请联系LXS' };
        }

        const avatar = user.avatar
        const salt = this.generateSalt();
        const hashedPassword = this.getMd5(password, salt);

        const superuser = await this.superuserService.createSuperuser({ account: account, password: hashedPassword, username: username, avatar: avatar, salt: salt })
        if (superuser == undefined) {
            return { success: true, message: 'Fail', data: '未知错误' };
        } else {
            await this.userService.linkUserToSuperuser(linksid, superuser.account)
            const { password: _, salt: __, ...safeData } = superuser;
            return { success: true, message: 'Ok', data: safeData };
        }
    }

    @Get('/')
    async getSuperuser(@Query('account') account: string) {
        const superuser = await this.superuserService.getSuperuser(account)
        return { success: true, message: 'Ok', data: superuser };
    }

    @Post('/login')
    async login(@Body() loginReq: { account: string, password: string }) {
        const superuser = await this.superuserService.getSuperuser(loginReq.account)
        if (superuser) {

            let pwd = superuser.password
            let salt = superuser.salt

            if (salt == undefined || salt == '') {
                salt = this.generateSalt();
                pwd = this.getMd5(superuser.password, salt);
                await this.superuserService.updateSuperuser({ id: superuser.id, password: pwd, salt: salt })
            }

            const inputHash = this.getMd5(loginReq.password, salt);
            if (inputHash == pwd) {
                const { password, salt, ...safeData } = superuser
                return { success: true, message: 'Ok', data: safeData };
            } else {
                return { success: true, message: 'Fail', data: '密码错误' };
            }
        } else {
            return { success: true, message: 'Fail', data: '用户不存在' };
        }
    }
}