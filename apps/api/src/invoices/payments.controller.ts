import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CreatePaymentDto } from "./dto/create-payment.dto.js";
import { PaymentsService } from "./payments.service.js";

@Controller(
  "organizations/:organizationId/invoices/:invoiceId/payments",
)
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Param("invoiceId", new ParseUUIDPipe())
    invoiceId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createForInvoice(
      user.id,
      organizationId,
      invoiceId,
      dto,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Param("invoiceId", new ParseUUIDPipe())
    invoiceId: string,
  ) {
    return this.paymentsService.findForInvoice(
      user.id,
      organizationId,
      invoiceId,
    );
  }
}