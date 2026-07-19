import { IsIn } from "class-validator";

export const invoiceStatuses = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELED",
] as const;

export type InvoiceStatusValue =
  (typeof invoiceStatuses)[number];

export class UpdateInvoiceStatusDto {
  @IsIn(invoiceStatuses)
  status!: InvoiceStatusValue;
}
