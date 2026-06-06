import { type Server as HttpServer } from "http";
import { Server, type Socket, type DefaultEventsMap } from "socket.io";
import { eq } from "drizzle-orm";
import { db, ordersTable, tablesTable } from "@workspace/db";
import { verifyToken, type JwtPayload } from "./jwt";

let socketServer: Server<DefaultEventsMap, DefaultEventsMap> | null = null;

interface SocketAuth {
  token?: string;
  tableToken?: string;
}

declare module "socket.io" {
  interface SocketData {
    user?: JwtPayload;
    tableToken?: string;
  }
}

function getAuth(socket: Socket): SocketAuth {
  return (socket.handshake.auth ?? {}) as SocketAuth;
}

async function verifyTableTokenForOrder(orderId: number, tableToken: string): Promise<boolean> {
  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.qrToken, tableToken));
  if (!table) {
    return false;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  return Boolean(order && order.tableId === table.id);
}

export function initializeSocket(server: HttpServer): Server {
  if (socketServer) return socketServer;

  socketServer = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  socketServer.use((socket, next) => {
    const auth = getAuth(socket);
    if (auth.token) {
      try {
        const payload = verifyToken(auth.token);
        socket.data.user = payload;
        if (payload.role === "vendor" || payload.role === "admin") {
          socket.join("vendors");
        }
      } catch {
        // Ignore invalid auth token for non-protected order subscriptions.
      }
    }

    socket.data.tableToken = auth.tableToken;
    next();
  });

  socketServer.on("connection", (socket) => {
    socket.on("subscribeOrder", async (payload: { orderId: number; tableToken?: string }) => {
      const tableToken = payload.tableToken ?? socket.data.tableToken;
      if (!tableToken) {
        socket.emit("subscription:error", "Missing table token");
        return;
      }

      const allowed = await verifyTableTokenForOrder(payload.orderId, tableToken);
      if (!allowed) {
        socket.emit("subscription:error", "Unauthorized");
        return;
      }

      socket.join(`order:${payload.orderId}`);
      socket.emit("subscription:success", { orderId: payload.orderId });
    });

    socket.on("unsubscribeOrder", (payload: { orderId: number }) => {
      socket.leave(`order:${payload.orderId}`);
    });
  });

  return socketServer;
}

export function getSocketServer(): Server | null {
  return socketServer;
}
