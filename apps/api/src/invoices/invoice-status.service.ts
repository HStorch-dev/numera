import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type { InvoiceStatusValue } from "./dto/update-invoice-status.dto.js";

@Injectable()
export class InvoiceStatusService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allowedTransitions: Record<
    InvoiceStatusValue,
    readonly InvoiceStatusValue[]
  > = {
    DRAFT: ["SENT", "CANCELED"],
    SENT: [
      "PARTIALLY_PAID",
      "PAID",
      "OVERDUE",
      "CANCELED",
    ],
    PARTIALLY_PAID: ["PAID", "OVERDUE", "CANCELED"],
    OVERDUE: ["PARTIALLY_PAID", "PAID", "CANCELED"],
    PAID: [],
    CANCELED: [],
  };

  async updateStatus(
    userId: string,
    organizationId: string,
    invoiceId: string,
    targetStatus: InvoiceStatusValue,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
        organization: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    const currentStatus = invoice.status as InvoiceStatusValue;

    if (currentStatus === targetStatus) {
      return invoice;
    }

    if (
      !this.allowedTransitions[currentStatus].includes(targetStatus)
    ) {
      throw new BadRequestException(
        `Cannot change invoice status from ${currentStatus} to ${targetStatus}`,
      );
    }

    return this.prisma.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        status: targetStatus,
      },
    });
  }
}
