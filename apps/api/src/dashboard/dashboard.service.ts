import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationDashboard(
    userId: string,
    organizationId: string,
  ) {
    const organization =
      await this.prisma.organization.findFirst({
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
        },
      });

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    const [
      customerCount,
      invoices,
      paymentTotal,
      paymentCount,
      recentInvoices,
    ] = await Promise.all([
      this.prisma.customer.count({
        where: {
          organizationId,
        },
      }),

      this.prisma.invoice.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          status: true,
          totalCents: true,
          payments: {
            select: {
              amountCents: true,
            },
          },
        },
      }),

      this.prisma.payment.aggregate({
        where: {
          organizationId,
        },
        _sum: {
          amountCents: true,
        },
      }),

      this.prisma.payment.count({
        where: {
          organizationId,
        },
      }),

      this.prisma.invoice.findMany({
        where: {
          organizationId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          number: true,
          status: true,
          customerName: true,
          currency: true,
          totalCents: true,
          dueDate: true,
          createdAt: true,
        },
      }),
    ]);

    const invoiceStatuses: Record<string, number> = {
      DRAFT: 0,
      SENT: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELED: 0,
    };

    let totalInvoicedCents = 0;
    let outstandingCents = 0;
    let overdueCents = 0;

    for (const invoice of invoices) {
      invoiceStatuses[invoice.status] += 1;

      const paidCents = invoice.payments.reduce(
        (sum, payment) => sum + payment.amountCents,
        0,
      );

      const remainingCents = Math.max(
        invoice.totalCents - paidCents,
        0,
      );

      if (invoice.status !== "CANCELED") {
        totalInvoicedCents += invoice.totalCents;
      }

      if (
        invoice.status === "SENT" ||
        invoice.status === "PARTIALLY_PAID" ||
        invoice.status === "OVERDUE"
      ) {
        outstandingCents += remainingCents;
      }

      if (invoice.status === "OVERDUE") {
        overdueCents += remainingCents;
      }
    }

    return {
      organization,
      overview: {
        customerCount,
        invoiceCount: invoices.length,
        paymentCount,
        totalInvoicedCents,
        totalPaidCents:
          paymentTotal._sum.amountCents ?? 0,
        outstandingCents,
        overdueCents,
      },
      invoiceStatuses,
      recentInvoices,
    };
  }
}