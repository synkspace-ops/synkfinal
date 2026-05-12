import { FastifyInstance, FastifyPluginOptions } from "fastify";
import * as authService from "./auth.service.js";

export async function authRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/register", async (request, reply) => {
    try {
      const body = request.body as { role?: unknown; email?: unknown; password?: unknown };
      const result = await authService.registerUser({
        role: typeof body?.role === "string" ? body.role : "",
        email: typeof body?.email === "string" ? body.email : "",
        password: typeof body?.password === "string" ? body.password : "",
      });
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof authService.AuthServiceError) {
        const status =
          err.code === "AUTH_INVALID_INPUT"
            ? 400
            : err.code === "AUTH_USER_EXISTS"
              ? 409
              : err.code === "AUTH_USER_NOT_FOUND"
                ? 404
                : err.code === "AUTH_INVALID_CREDENTIALS"
                  ? 401
                  : err.code === "AUTH_PASSWORD_SETUP_REQUIRED"
                    ? 409
                  : 500;
        return reply.status(status).send({ success: false, error: { code: err.code } });
      }
      request.log.error({ err }, "auth.register unexpected error");
      return reply.status(500).send({ success: false, error: { code: "AUTH_SERVER_ERROR" } });
    }
  });

  app.post("/login", async (request, reply) => {
    try {
      const body = request.body as { email?: unknown; password?: unknown };
      const result = await authService.loginUser({
        email: typeof body?.email === "string" ? body.email : "",
        password: typeof body?.password === "string" ? body.password : "",
        ip: request.ip,
        userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : "",
      });
      return reply.status(200).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof authService.AuthServiceError) {
        const status =
          err.code === "AUTH_INVALID_INPUT"
            ? 400
            : err.code === "AUTH_USER_NOT_FOUND"
              ? 404
            : err.code === "AUTH_INVALID_CREDENTIALS"
              ? 401
              : err.code === "AUTH_PASSWORD_SETUP_REQUIRED"
                ? 409
                : err.code === "AUTH_USER_SUSPENDED"
                  ? 403
                  : 500;
        return reply.status(status).send({ success: false, error: { code: err.code } });
      }
      request.log.error({ err }, "auth.login unexpected error");
      return reply.status(500).send({ success: false, error: { code: "AUTH_SERVER_ERROR" } });
    }
  });

  app.post("/complete-invite", async (request, reply) => {
    try {
      const body = request.body as { email?: unknown; password?: unknown };
      const result = await authService.completeInvite({
        email: typeof body?.email === "string" ? body.email : "",
        password: typeof body?.password === "string" ? body.password : "",
      });
      return reply.status(200).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof authService.AuthServiceError) {
        const status =
          err.code === "AUTH_INVALID_INPUT"
            ? 400
            : err.code === "AUTH_USER_NOT_FOUND"
              ? 404
              : err.code === "AUTH_USER_EXISTS"
                ? 409
                : 500;
        return reply.status(status).send({ success: false, error: { code: err.code } });
      }
      request.log.error({ err }, "auth.completeInvite unexpected error");
      return reply.status(500).send({ success: false, error: { code: "AUTH_SERVER_ERROR" } });
    }
  });

  app.post("/refresh", async (_request, reply) => {
    return reply.status(401).send({
      success: false,
      error: { code: "AUTH_INVALID_CREDENTIALS" },
    });
  });

  app.get("/me", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const result = await authService.getCurrentUser(token);
      return reply.status(200).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof authService.AuthServiceError) {
        const status =
          err.code === "AUTH_INVALID_INPUT"
            ? 400
            : err.code === "AUTH_USER_NOT_FOUND"
              ? 404
            : err.code === "AUTH_INVALID_CREDENTIALS"
              ? 401
              : err.code === "AUTH_USER_SUSPENDED"
                ? 403
                : 500;
        return reply.status(status).send({ success: false, error: { code: err.code } });
      }
      request.log.error({ err }, "auth.me unexpected error");
      return reply.status(500).send({ success: false, error: { code: "AUTH_SERVER_ERROR" } });
    }
  });
}
