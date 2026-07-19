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
import { CustomersService } from "./customers.service.js";
import { CreateCustomerDto } from "./dto/create-customer.dto.js";

@Controller("organizations/:organizationId/customers")
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.createForOrganization(
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
    return this.customersService.findForOrganization(
      user.id,
      organizationId,
    );
  }

  @Get(":customerId")
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
    @Param("customerId", new ParseUUIDPipe())
    customerId: string,
  ) {
    return this.customersService.findOneForOrganization(
      user.id,
      organizationId,
      customerId,
    );
  }
}
