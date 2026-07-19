import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CreateInvoiceDto } from "./dto/create-invoice.dto.js";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto.js";
import { InvoicesService } from "./invoices.service.js";

@Controller("organizations/:organizationId/invoices")
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.createForOrganization(
      user.id,
      organizationId,
      dto,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
  ) {
    return this.invoicesService.findForOrganization(
      user.id,
      organizationId,
    );
  }

  @Get(":invoiceId")
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Param("invoiceId", new ParseUUIDPipe())
    invoiceId: string,
  ) {
    return this.invoicesService.findOneForOrganization(
      user.id,
      organizationId,
      invoiceId,
    );
  }

  @Patch(":invoiceId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Param("invoiceId", new ParseUUIDPipe())
    invoiceId: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.updateForOrganization(
      user.id,
      organizationId,
      invoiceId,
      dto,
    );
  }

  @Delete(":invoiceId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Param("invoiceId", new ParseUUIDPipe())
    invoiceId: string,
  ) {
    return this.invoicesService.deleteForOrganization(
      user.id,
      organizationId,
      invoiceId,
    );
  }
}
