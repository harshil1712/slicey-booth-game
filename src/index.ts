import { instrument } from "@fiberplane/hono-otel";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "./db/schema";
import { WebsocketServer } from "./gameDO";
import { partyserverMiddleware } from "hono-party";

export type Bindings = {
  DB: D1Database;
  WebSocketServer: DurableObjectNamespace<WebsocketServer>;
};

export { WebsocketServer };

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", partyserverMiddleware());

app.get("/", (c) => {
  return c.text("Honc from above! ☁️🪿");
});

app.get("/api/users", async (c) => {
  const db = drizzle(c.env.DB);
  const users = await db.select().from(schema.users);
  return c.json({ users });
});

app.post("/api/user", async (c) => {
  const db = drizzle(c.env.DB);
  const { name, email } = await c.req.json();

  const [newUser] = await db
    .insert(schema.users)
    .values({
      name: name,
      email: email,
    })
    .returning();

  return c.json(newUser, 201);
});

// app.get("/game/:gameId/admin", async (c) => {
//   const gameId = c.req.param("gameId");

//   const asset = await c.env.ASSETS.unstable_getByPathname("game.html");
//   return new Response(asset.readableStream, {
//     headers: { "Content-Type": asset.contentType },
//   });
// });

// app.get("/game/:gameId", async (c) => {
//   const gameId = c.req.param("gameId");
//   console.log(`Game ID: ${gameId}`);
//   const gameDO = c.env.WebSocketServer.idFromName(gameId);
//   const stub = c.env.WebSocketServer.get(gameDO);

//   return await stub.fetch(c.req.raw);
// });

export default instrument(app);
