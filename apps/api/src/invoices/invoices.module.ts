import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InvoiceStatusService } from "./invoice-status.service.js";
import { InvoicesController } from "./invoices.controller.js";
import { InvoicesService } from "./invoices.service.js";

@Module({
  imports: [AuthModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceStatusService],
})
export class InvoicesModule {}
