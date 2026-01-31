import * as tls from "tls";

// Base64 encode for email (string)
function base64Encode(str) {
  return Buffer.from(str, "utf-8").toString("base64");
}

// Base64 encode for binary data (Uint8Array or Buffer)
function base64EncodeBinary(data) {
  return Buffer.from(data).toString("base64");
}

// Build MIME message with optional attachments
function buildMimeMessage(from, recipients, encodedSubject, html, attachments) {
  const hasAttachments = attachments && attachments.length > 0;
  const mixedBoundary = `----=_Mixed_${Date.now()}`;
  const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const headers = [
    `From: Cox & Kings <${from}>`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
  ];

  if (hasAttachments) {
    // Use multipart/mixed for emails with attachments
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);

    const messageParts = [
      ...headers,
      ``,
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      `Please view this email in an HTML-capable email client.`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(html)
        .match(/.{1,76}/g)
        ?.join("\n") || "",
      ``,
      `--${altBoundary}--`,
    ];

    // Add each attachment
    for (const attachment of attachments) {
      const encodedContent = base64EncodeBinary(attachment.content);
      messageParts.push(
        ``,
        `--${mixedBoundary}`,
        `Content-Type: ${attachment.contentType}`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        encodedContent.match(/.{1,76}/g)?.join("\n") || "",
      );
    }

    messageParts.push(``, `--${mixedBoundary}--`);
    return messageParts.join("\r\n");
  } else {
    // Use multipart/alternative for emails without attachments
    headers.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    );

    return [
      ...headers,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      `Please view this email in an HTML-capable email client.`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(html)
        .match(/.{1,76}/g)
        ?.join("\n") || "",
      ``,
      `--${altBoundary}--`,
    ].join("\r\n");
  }
}

export async function sendEmail(options) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not configured");
  }

  try {
    console.log("[SMTP] Starting email send process...");

    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Clean subject - encode for UTF-8
    const cleanSubject = options.subject
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
      .trim();
    const encodedSubject = `=?UTF-8?B?${base64Encode(cleanSubject)}?=`;

    console.log("[SMTP] Building MIME message...");

    // Build MIME message (with or without attachments)
    const message = buildMimeMessage(
      gmailUser,
      recipients,
      encodedSubject,
      options.html,
      options.attachments,
    );

    console.log(`[SMTP] Message size: ${message.length} bytes`);
    console.log(`[SMTP] Attachments: ${options.attachments?.length || 0}`);
    console.log("[SMTP] Connecting to smtp.gmail.com:465...");

    const conn = tls.connect({
      host: "smtp.gmail.com",
      port: 465,
    });

    return new Promise((resolve, reject) => {
      let buffer = "";

      function readResponse() {
        return new Promise((resolveRead) => {
          const onData = (data) => {
            buffer += data.toString();
            // Check if we have a complete response (ends with \r\n)
            if (buffer.includes("\r\n")) {
              conn.off("data", onData);
              const response = buffer;
              buffer = "";
              console.log(`[SMTP] <- ${response.trim()}`);
              resolveRead(response);
            }
          };
          conn.on("data", onData);
        });
      }

      async function sendCommand(cmd) {
        // Don't log password
        const logCmd =
          cmd.startsWith("AUTH") || cmd.length > 50
            ? cmd.substring(0, 20) + "..."
            : cmd;
        console.log(`[SMTP] -> ${logCmd}`);
        conn.write(cmd + "\r\n");
        return await readResponse();
      }

      async function runSmtpConversation() {
        try {
          // SMTP conversation
          console.log("[SMTP] Reading greeting...");
          await readResponse(); // greeting

          console.log("[SMTP] Sending EHLO...");
          await sendCommand(`EHLO localhost`);

          console.log("[SMTP] Authenticating...");
          await sendCommand(`AUTH LOGIN`);
          await sendCommand(Buffer.from(gmailUser).toString("base64"));
          await sendCommand(Buffer.from(gmailPassword).toString("base64"));

          console.log("[SMTP] Setting sender...");
          await sendCommand(`MAIL FROM:<${gmailUser}>`);

          console.log("[SMTP] Setting recipients...");
          for (const recipient of recipients) {
            await sendCommand(`RCPT TO:<${recipient}>`);
          }

          console.log("[SMTP] Sending DATA command...");
          await sendCommand(`DATA`);

          console.log("[SMTP] Sending message body...");
          // For large messages, send in chunks to avoid timeouts
          const messageWithTerminator = message + "\r\n.\r\n";
          const chunkSize = 65536; // 64KB chunks

          if (messageWithTerminator.length > chunkSize) {
            console.log(`[SMTP] Large message detected, sending in chunks...`);
            const totalChunks = Math.ceil(
              messageWithTerminator.length / chunkSize,
            );
            for (let i = 0; i < messageWithTerminator.length; i += chunkSize) {
              const chunk = messageWithTerminator.substring(i, i + chunkSize);
              const chunkNum = Math.floor(i / chunkSize) + 1;
              console.log(
                `[SMTP] Sending chunk ${chunkNum}/${totalChunks} (${chunk.length} bytes)`,
              );
              conn.write(chunk);
              // Small delay to allow buffer to flush
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          } else {
            conn.write(messageWithTerminator);
          }

          console.log("[SMTP] Waiting for server response...");
          await readResponse();

          console.log("[SMTP] Sending QUIT...");
          await sendCommand(`QUIT`);

          conn.end();

          console.log(
            `[SMTP] Email sent successfully to: ${recipients.join(", ")}`,
          );
          resolve({ success: true, messageId: `gmail-${Date.now()}` });
        } catch (error) {
          console.error("[SMTP] Error in conversation:", error);
          conn.end();
          reject(error);
        }
      }

      conn.on("secureConnect", () => {
        console.log("[SMTP] TLS connection established");
        runSmtpConversation().catch(reject);
      });

      conn.on("error", (error) => {
        console.error("[SMTP] Connection error:", error);
        reject(error);
      });
    });
  } catch (error) {
    console.error("[SMTP] Error:", error);
    return { success: false, error: error.message };
  }
}
