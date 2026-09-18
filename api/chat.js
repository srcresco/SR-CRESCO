 module.exports = async function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://srcresco.github.io"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing"
      });
    }

    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required"
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: messages
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      console.error("OpenAI ERROR:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI API request failed"
      });
    }

    /* =========================================
       EXTRACT TEXT FROM RAW RESPONSES API
    ========================================= */

    let reply = "";

    if (Array.isArray(data.output)) {

      for (const item of data.output) {

        if (
          item.type === "message" &&
          Array.isArray(item.content)
        ) {

          for (const content of item.content) {

            if (
              content.type === "output_text" &&
              typeof content.text === "string"
            ) {

              reply += content.text;
            }

          }
        }
      }
    }

    reply = reply.trim();

    if (!reply) {

      console.error(
        "No text found in OpenAI response:",
        JSON.stringify(data)
      );

      return res.status(500).json({
        error: "OpenAI returned no text response"
      });
    }

    return res.status(200).json({
      reply: reply
    });

  } catch (error) {

    console.error(
      "SR CRESCO AI ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Internal server error"
    });
  }
};
