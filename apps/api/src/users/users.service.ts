import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  create(input: CreateUserInput) {
    return this.prisma.user.create({
      data: input,
    });
  }
}
