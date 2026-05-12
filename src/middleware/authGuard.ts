import { FastifyRequest, FastifyReply } from "fastify";
import { AuthServiceError, getCurrentUser } from "../modules/auth/auth.service.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    await reply.status(401).send({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header",
      statusCode: 401,
    });
    return;
  }
  try {
    const { user } = await getCurrentUser(token);
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (err) {
    const suspended = err instanceof AuthServiceError && err.code === "AUTH_USER_SUSPENDED";
    await reply.status(suspended ? 403 : 401).send({
      error: "Unauthorized",
      message: suspended ? "Account is suspended" : "Invalid or expired token",
      statusCode: suspended ? 403 : 401,
    });
  }
}
