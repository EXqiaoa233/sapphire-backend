import { Provide } from "@midwayjs/core";
import { prisma } from "../prisma";


@Provide()
export class SuperuserService {


    async createSuperuser(data: {
        account: string
        password: string
        username: string
        avatar: string
    }) {
        return await prisma.superuser.create({
            data: data
        })
    }

    async getSuperuser(account: string) {
        return await prisma.superuser.findFirst({
            where: {
                account: account,
            },
            include: {
                user: true,
            }
        })
    }
}