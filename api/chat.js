 module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
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
          "You are SR CRESCO KNOWLEDGE AI. Help farmers with agriculture, crops, soil, weather, government schemes, markets and smart farming. Answer clearly and practically.",
        input: message
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
            }
          }
        }
      }
    }

    return res.status(200).json({
      reply: reply || "OpenAI returned no text response."
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
};
