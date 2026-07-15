import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type { CreateOrganizationDto } from "./dto/create-organization.dto.js";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  createForUser(userId: string, dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name.trim(),
        currency: dto.currency?.trim().toUpperCase() || "ILS",
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      select: {
        id: true,
        name: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findForUser(userId: string) {
    const organizations = await this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return organizations.map(({ members, ...organization }) => ({
      ...organization,
      role: members[0]?.role,
    }));
  }

  async findOneForUser(userId: string, organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    const { members, ...organizationData } = organization;

    return {
      ...organizationData,
      role: members[0]?.role,
    };
  }
}
