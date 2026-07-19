import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type {
  CreateInvoiceDto,
  CreateInvoiceItemDto,
} from "./dto/create-invoice.dto.js";

@Injectable()
export class InvoicesService {
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
        currency: true,
      },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    return organization;
  }

  private calculateItem(item: CreateInvoiceItemDto) {
    const taxRateBps = item.taxRateBps ?? 0;
    const lineSubtotalCents = item.quantity * item.unitPriceCents;
    const lineTaxCents = Math.round(
      (lineSubtotalCents * taxRateBps) / 10000,
    );

    return {
      description: item.description.trim(),
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      taxRateBps,
      lineSubtotalCents,
      lineTaxCents,
      lineTotalCents: lineSubtotalCents + lineTaxCents,
    };
  }

  async createForOrganization(
    userId: string,
    organizationId: string,
    dto: CreateInvoiceDto,
  ) {
    const organization = await this.ensureOrganizationAccess(
      userId,
      organizationId,
    );

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    const invoiceNumber = dto.number.trim();

    const existingInvoice = await this.prisma.invoice.findUnique({
      where: {
        organizationId_number: {
          organizationId,
          number: invoiceNumber,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingInvoice) {
      throw new ConflictException(
        "Invoice number already exists in this organization",
      );
    }

    const items = dto.items.map((item) => this.calculateItem(item));

    const subtotalCents = items.reduce(
      (sum, item) => sum + item.lineSubtotalCents,
      0,
    );

    const taxCents = items.reduce(
      (sum, item) => sum + item.lineTaxCents,
      0,
    );

    return this.prisma.invoice.create({
      data: {
        organizationId,
        customerId: customer.id,
        number: invoiceNumber,
        issueDate: dto.issueDate
          ? new Date(dto.issueDate)
          : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        currency:
          dto.currency?.trim().toUpperCase() ||
          organization.currency,
        customerName: customer.name,
        customerEmail: customer.email,
        customerTaxId: customer.taxId,
        notes: dto.notes?.trim() || undefined,
        subtotalCents,
        taxCents,
        totalCents: subtotalCents + taxCents,
        items: {
          create: items,
        },
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  async findForOrganization(
    userId: string,
    organizationId: string,
  ) {
    await this.ensureOrganizationAccess(userId, organizationId);

    return this.prisma.invoice.findMany({
      where: {
        organizationId,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOneForOrganization(
    userId: string,
    organizationId: string,
    invoiceId: string,
  ) {
    await this.ensureOrganizationAccess(userId, organizationId);

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }
}
