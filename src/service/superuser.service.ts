import { Provide } from "@midwayjs/core";
import { prisma } from "../prisma";


@Provide()
export class SuperuserService {


    async createSuperuser(data: {
        account: string
        password: string
        username: string
        avatar: string
        salt: string
    }) {
        return await prisma.superuser.create({
            data: data
        })
    }

    async updateSuperuser(data: {
        id: number;
        password: string;
        salt: string;
    }) {
        return await prisma.superuser.update({
            where: {
                id: data.id
            },
            data: {
                password: data.password,
                salt: data.salt
            }
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