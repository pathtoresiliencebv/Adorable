import { createClient } from "redis";

// Functie om client aan te maken en te verbinden
const createAndConnectRedisClient = async (isPublisher = false) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.error("REDIS_URL environment variable is not defined.");
    // Gooi een fout als de URL echt ontbreekt, want dan kan de app niet draaien.
    throw new Error("REDIS_URL environment variable is not defined.");
  }

  const client = createClient({
    url: redisUrl,
    socket: {
      tls: true, // Expliciet TLS inschakelen (meestal al geïmpliceerd door rediss://)
      rejectUnauthorized: false, // <--- DEZE IS CRUCIAAL: Schakelt certificaatverificatie uit
      connectTimeout: 10000, // 10 seconden timeout voor connectie
      lazyConnect: true, // Lazy connect voor betere error handling
    },
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        // End of reconnecting on a specific error and flush all commands with a individual error
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        // End of reconnecting after a specific timeout and flush all commands with a individual error
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        // End of reconnecting with built in error
        return undefined;
      }
      // Reconnect after
      return Math.min(options.attempt * 100, 3000);
    }
  })
    .on("error", (err) => {
      console.error(isPublisher ? "Publisher Redis Client Error" : "Redis Client Error", err);
      // Don't crash the app on Redis errors
    })
    .on("connect", () => {
      console.log(isPublisher ? "Publisher Redis Client Connected" : "Redis Client Connected");
    })
    .on("ready", () => {
      console.log(isPublisher ? "Publisher Redis Client Ready" : "Redis Client Ready");
    })
    .on("end", () => {
      console.log(isPublisher ? "Publisher Redis Client Disconnected" : "Redis Client Disconnected");
    });

  try {
    await client.connect(); // Verbind hier
    return client;
  } catch (error) {
    console.error(`Failed to connect to Redis (${isPublisher ? 'publisher' : 'client'}):`, error);
    // Return a mock client that doesn't crash the app
    return {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 0,
      publish: async () => 0,
      subscribe: async () => {},
      on: () => {},
      connect: async () => {},
      disconnect: async () => {},
    } as any;
  }
};

// Exporteer je clients
export const redis = await createAndConnectRedisClient();
export const redisPublisher = await createAndConnectRedisClient(true);