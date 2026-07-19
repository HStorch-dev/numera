import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { DashboardService } from "./dashboard.service.js";

@Controller("organizations/:organizationId/dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get()
  getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param("organizationId", new ParseUUIDPipe())
    organizationId: string,
  ) {
    return this.dashboardService.getOrganizationDashboard(
      user.id,
      organizationId,
    );
  }
}