import makeWaSocket, { useMultiFileAuthState, DisconnectReason, proto, getContentType } from "@whiskeysockets/baileys";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import { Boom } from "@hapi/boom";

const logger = MAIN_LOGGER.child({});
logger.level = "silent";

async function start() {
  console.log("iniciando socket...");

  const { state, saveCreds } = await useMultiFileAuthState(`${__dirname}/session`);

  const sock = makeWaSocket({
    auth: state,
    printQRInTerminal: true,
    logger,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting") {
      console.log("Conectando...");
    }

    if (connection === "open") {
      console.log("Conectado");
    }

    if (connection === "close") {
      const status = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = status !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("Reconectando...");

        start();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    for (const message of m.messages) {
      console.log(message);

      const remoteJid = message.key.remoteJid as string;

      if (!message.message) return;

      const body = getBody(message.message);

      if (body === "oi") {
        await sock.sendMessage(remoteJid, { text: "ola" });
      }
    }
  });
}

function getBody(message: proto.IMessage) {
  const contentType = getContentType(message);

  if (!contentType) return "";

  if (contentType === "conversation") return message[contentType];
  if (contentType === "extendedTextMessage") return message[contentType]?.text;
  if (contentType === "imageMessage") return message[contentType]?.caption;
  if (contentType === "videoMessage") return message[contentType]?.caption;
  if (contentType === "documentMessage") return message[contentType]?.caption;

  return "";
}

start();
