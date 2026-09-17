 module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required"
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",

        instructions:
          "You are SR CRESCO KNOWLEDGE AI. You are an agriculture-focused AI assistant. Help farmers with crops, soil, irrigation, pests, diseases, weather, government schemes, market information, livestock, beekeeping, smart farming and modern agricultural technology. Understand conversation context and answer follow-up questions naturally. You can answer in Kannada, English, or a mix based on the user's language. Give clear, practical and responsible answers.",

        input: messages.map(function(item) {
          return {
            role: item.role,
            content: item.content
          };
        })
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI API request failed"
      });
    }

    let reply = data.output_text;

    if (!reply && data.output) {
      for (const item of data.output) {
        if (item.content) {
          for (const content of item.content) {
            if (content.text) {
              reply = content.text;
              break;
            }
          }
        }

        if (reply) break;
      }
    }

    return res.status(200).json({
      reply: reply || "OpenAI returned no text response."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
};
