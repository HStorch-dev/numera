import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type { CreatePaymentDto } from "./dto/create-payment.dto.js";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureInvoiceAccess(
    userId: string,
    organizationId: string,
    invoiceId: string,
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
        totalCents: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  async createForInvoice(
    userId: string,
    organizationId: string,
    invoiceId: string,
    dto: CreatePaymentDto,
  ) {
    const invoice = await this.ensureInvoiceAccess(
      userId,
      organizationId,
      invoiceId,
    );

    if (invoice.status === "DRAFT") {
      throw new BadRequestException(
        "Cannot add a payment to a draft invoice",
      );
    }

    if (invoice.status === "CANCELED") {
      throw new BadRequestException(
        "Cannot add a payment to a canceled invoice",
      );
    }

    if (invoice.status === "PAID") {
      throw new BadRequestException(
        "Invoice is already fully paid",
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const currentInvoice = await transaction.invoice.findFirst({
        where: {
          id: invoiceId,
          organizationId,
        },
        select: {
          id: true,
          status: true,
          totalCents: true,
        },
      });

      if (!currentInvoice) {
        throw new NotFoundException("Invoice not found");
      }

      const paymentTotals = await transaction.payment.aggregate({
        where: {
          invoiceId,
        },
        _sum: {
          amountCents: true,
        },
      });

      const previouslyPaidCents =
        paymentTotals._sum.amountCents ?? 0;

      const paidTotalCents =
        previouslyPaidCents + dto.amountCents;

      if (paidTotalCents > currentInvoice.totalCents) {
        throw new BadRequestException(
          "Payment exceeds the remaining invoice balance",
        );
      }

      const payment = await transaction.payment.create({
        data: {
          organizationId,
          invoiceId,
          amountCents: dto.amountCents,
          paidAt: dto.paidAt
            ? new Date(dto.paidAt)
            : undefined,
          method: dto.method?.trim() || undefined,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
        },
      });

      const remainingCents =
        currentInvoice.totalCents - paidTotalCents;

      const invoiceStatus =
        remainingCents === 0
          ? "PAID"
          : "PARTIALLY_PAID";

      await transaction.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: invoiceStatus,
        },
      });

      return {
        payment,
        invoiceStatus,
        totalCents: currentInvoice.totalCents,
        paidTotalCents,
        remainingCents,
      };
    });
  }

  async findForInvoice(
    userId: string,
    organizationId: string,
    invoiceId: string,
  ) {
    const invoice = await this.ensureInvoiceAccess(
      userId,
      organizationId,
      invoiceId,
    );

    const [payments, paymentTotals] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          invoiceId,
          organizationId,
        },
        orderBy: [
          {
            paidAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      }),
      this.prisma.payment.aggregate({
        where: {
          invoiceId,
          organizationId,
        },
        _sum: {
          amountCents: true,
        },
      }),
    ]);

    const paidTotalCents =
      paymentTotals._sum.amountCents ?? 0;

    return {
      invoiceId,
      invoiceStatus: invoice.status,
      totalCents: invoice.totalCents,
      paidTotalCents,
      remainingCents: Math.max(
        invoice.totalCents - paidTotalCents,
        0,
      ),
      payments,
    };
  }
}