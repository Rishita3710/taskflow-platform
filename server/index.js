/**
 * Custom server entry point.
 *
 * Why a custom server instead of plain `next dev`/`next start`?
 * Socket.io needs a raw Node `http.Server` to attach to. Next.js's
 * default CLI creates and hides that server internally, so to run
 * real-time discussion threads (live comments, typing indicators,
 * presence) in the SAME process as the Next.js app, we create the
 * HTTP server ourselves, hand requests to Next's request handler,
 * and attach Socket.io to the same server.
 *
 * Run with: npm run dev   (development)
 *           npm run start (production, after `npm run build`)
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // Auth middleware: verify the JWT access token passed by the client
  // during the socket handshake, so we know which user/org is connecting.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.data.user = payload;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, organizationId } = socket.data.user;
    console.log(`[socket] connected: user=${userId} org=${organizationId}`);

    // Join a personal room for direct notifications (e.g. "you were mentioned")
    socket.join(`user:${userId}`);
    // Join an org-wide room for org-level broadcast (e.g. announcements)
    socket.join(`org:${organizationId}`);

    // Client explicitly joins a task room when they open that task's page,
    // so comment events only go to people actively viewing that discussion.
    socket.on("task:join", (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on("task:leave", (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    // Typing indicator inside a task's discussion thread
    socket.on("task:typing", ({ taskId, userName }) => {
      socket.to(`task:${taskId}`).emit("task:typing", { userId, userName });
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: user=${userId}`);
    });
  });

  // Expose the io instance to Next.js API routes running in this same process
  globalThis.__socketIO = io;

  httpServer.listen(port, () => {
    console.log(`> TaskFlow ready on http://${hostname}:${port}`);
    console.log(`> Socket.io attached at /api/socket.io`);
  });
});
