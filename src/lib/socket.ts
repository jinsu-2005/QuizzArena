import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocketUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;

    // If an external production URL is explicitly configured in env (not localhost/127.0.0.1), use it
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }

    // When testing on LAN (e.g. mobile phone scanning QR code with 192.168.x.x)
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:3001`;
    }
  }

  return process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
};

export const getSocket = (): Socket => {
  if (!socket) {
    const url = getSocketUrl();
    socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
  }
  return socket;
};
