import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function buildSocket(): Socket {
  const backendUrl = import.meta.env.VITE_SOCKET_URL ?? window.location.origin;
  const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const socketPath = `${basePath}/socket.io`;

  const client = io(backendUrl, {
    path: socketPath,
    transports: ["websocket", "polling"],
    auth: {
      token: localStorage.getItem("token") ?? undefined,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
  });

  client.on("connect_error", (error) => {
    // eslint-disable-next-line no-console
    console.warn("Socket connection failed", error);
  });

  return client;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = buildSocket();
  }
  return socket;
}

export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
