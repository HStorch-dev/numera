import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type { CreateCustomerDto } from "./dto/create-customer.dto.js";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOrganizationAccess(
    userId: string,
    organizationId: string,
  ) {
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
      },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }
  }

  async createForOrganization(
    userId: string,
    organizationId: string,
    dto: CreateCustomerDto,
  ) {
    await this.ensureOrganizationAccess(userId, organizationId);

    return this.prisma.customer.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        email: dto.email?.trim().toLowerCase() || undefined,
        phone: dto.phone?.trim() || undefined,
        taxId: dto.taxId?.trim() || undefined,
        address: dto.address?.trim() || undefined,
        notes: dto.notes?.trim() || undefined,
      },
    });
  }

  async findForOrganization(
    userId: string,
    organizationId: string,
  ) {
    await this.ensureOrganizationAccess(userId, organizationId);

    return this.prisma.customer.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findOneForOrganization(
    userId: string,
    organizationId: string,
    customerId: string,
  ) {
    await this.ensureOrganizationAccess(userId, organizationId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }
}
