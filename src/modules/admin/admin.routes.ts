import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import * as adminService from "./admin.service.js";
import { listUsersSchema, updateUserStatusSchema, resolveDisputeSchema, listMessageAuditSchema, listRegistrationsSchema } from "./admin.schemas.js";

export async function adminRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get(
    "/overview",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (_request, reply) => {
      const data = await adminService.getAdminOverview();
      return reply.send({ data, message: "OK" });
    }
  );

  app.get(
    "/users",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const query = listUsersSchema.parse(request.query);
      const data = await adminService.listUsers(query);
      return reply.send({ data, message: "OK" });
    }
  );

  app.put<{ Params: { id: string } }>(
    "/users/:id/status",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const body = updateUserStatusSchema.parse(request.body);
      const data = await adminService.updateUserStatus(request.params.id, body);
      return reply.send({ data, message: "Updated" });
    }
  );

  app.get(
    "/disputes",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const data = await adminService.listDisputes();
      return reply.send({ data, message: "OK" });
    }
  );

  app.get(
    "/registrations",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const query = listRegistrationsSchema.parse(request.query);
      const data = await adminService.listRegistrations(query);
      return reply.send({ data, message: "OK" });
    }
  );

  app.get<{ Params: { id: string } }>(
    "/registrations/:id",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const data = await adminService.getRegistrationDetails(request.params.id);
      return reply.send({ data, message: "OK" });
    }
  );

  app.get(
    "/messages",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const query = listMessageAuditSchema.parse(request.query);
      const data = await adminService.listMessageAudit(query);
      return reply.send({ data, message: "OK" });
    }
  );

  app.put<{ Params: { id: string } }>(
    "/disputes/:id",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const body = resolveDisputeSchema.parse(request.body);
      const data = await adminService.resolveDispute(
        request.params.id,
        request.user!.id,
        body
      );
      return reply.send({ data, message: "Resolved" });
    }
  );

  app.get(
    "/waitlist",
    { preHandler: [authGuard, roleGuard("ADMIN")] },
    async (request, reply) => {
      const csv = await adminService.exportWaitlistCsv();
      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", "attachment; filename=waitlist.csv");
      return reply.send(csv);
    }
  );
}
