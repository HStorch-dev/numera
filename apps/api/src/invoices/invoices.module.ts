import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InvoiceStatusService } from "./invoice-status.service.js";
import { InvoicesController } from "./invoices.controller.js";
import { InvoicesService } from "./invoices.service.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";

@Module({
  imports: [AuthModule],
  controllers: [
    InvoicesController,
    PaymentsController,
  ],
  providers: [
    InvoicesService,
    InvoiceStatusService,
    PaymentsService,
  ],
})
export class InvoicesModule {}