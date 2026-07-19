import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type {
  CreateInvoiceDto,
  CreateInvoiceItemDto,
} from "./dto/create-invoice.dto.js";
import type { UpdateInvoiceDto } from "./dto/update-invoice.dto.js";

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

  private calculateTotals(items: CreateInvoiceItemDto[]) {
    const calculatedItems = items.map((item) =>
      this.calculateItem(item),
    );

    const subtotalCents = calculatedItems.reduce(
      (sum, item) => sum + item.lineSubtotalCents,
      0,
    );

    const taxCents = calculatedItems.reduce(
      (sum, item) => sum + item.lineTaxCents,
      0,
    );

    return {
      items: calculatedItems,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
    };
  }

  private async ensureUniqueNumber(
    organizationId: string,
    number: string,
    excludedInvoiceId?: string,
  ) {
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        organizationId,
        number,
        id: excludedInvoiceId
          ? {
              not: excludedInvoiceId,
            }
          : undefined,
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

    await this.ensureUniqueNumber(
      organizationId,
      invoiceNumber,
    );

    const totals = this.calculateTotals(dto.items);

    return this.prisma.invoice.create({
      data: {
        organizationId,
        customerId: customer.id,
        number: invoiceNumber,
        issueDate: dto.issueDate
          ? new Date(dto.issueDate)
          : undefined,
        dueDate: dto.dueDate
          ? new Date(dto.dueDate)
          : undefined,
        currency:
          dto.currency?.trim().toUpperCase() ||
          organization.currency,
        customerName: customer.name,
        customerEmail: customer.email,
        customerTaxId: customer.taxId,
        notes: dto.notes?.trim() || undefined,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        items: {
          create: totals.items,
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

  async updateForOrganization(
    userId: string,
    organizationId: string,
    invoiceId: string,
    dto: UpdateInvoiceDto,
  ) {
    const organization = await this.ensureOrganizationAccess(
      userId,
      organizationId,
    );

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.status !== "DRAFT") {
      throw new BadRequestException(
        "Only draft invoices can be edited",
      );
    }

    const invoiceNumber =
      dto.number?.trim() ?? invoice.number;

    await this.ensureUniqueNumber(
      organizationId,
      invoiceNumber,
      invoiceId,
    );

    const customer = dto.customerId
      ? await this.prisma.customer.findFirst({
          where: {
            id: dto.customerId,
            organizationId,
          },
        })
      : null;

    if (dto.customerId && !customer) {
      throw new NotFoundException("Customer not found");
    }

    const totals = dto.items
      ? this.calculateTotals(dto.items)
      : null;

    return this.prisma.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        customerId:
          dto.customerId === undefined
            ? undefined
            : customer?.id,
        customerName: customer?.name,
        customerEmail:
          dto.customerId === undefined
            ? undefined
            : customer?.email,
        customerTaxId:
          dto.customerId === undefined
            ? undefined
            : customer?.taxId,
        number: invoiceNumber,
        issueDate: dto.issueDate
          ? new Date(dto.issueDate)
          : undefined,
        dueDate: dto.dueDate
          ? new Date(dto.dueDate)
          : undefined,
        currency:
          dto.currency?.trim().toUpperCase() ??
          invoice.currency,
        notes:
          dto.notes === undefined
            ? undefined
            : dto.notes.trim() || null,
        subtotalCents: totals?.subtotalCents,
        taxCents: totals?.taxCents,
        totalCents: totals?.totalCents,
        items: totals
          ? {
              deleteMany: {},
              create: totals.items,
            }
          : undefined,
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

  async deleteForOrganization(
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
      select: {
        id: true,
        status: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.status !== "DRAFT") {
      throw new BadRequestException(
        "Only draft invoices can be deleted",
      );
    }

    await this.prisma.invoice.delete({
      where: {
        id: invoiceId,
      },
    });

    return {
      deleted: true,
      invoiceId,
    };
  }
}
