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
      rejectUnauthorized: false // <--- DEZE IS CRUCIAAL: Schakelt certificaatverificatie uit
    }
  })
    .on("error", (err) => console.error(isPublisher ? "Publisher Redis Client Error" : "Redis Client Error", err));

  await client.connect(); // Verbind hier
  return client;
};

// Exporteer je clients
export const redis = await createAndConnectRedisClient();
export const redisPublisher = await createAndConnectRedisClient(true);