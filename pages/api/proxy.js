import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.setHeader("Allow", ["POST"]).status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // ✅ Ensure we properly parse the body (for Vercel)
    const requestBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const response = await axios.post(
      "https://anex.us/grades/getData/",
      new URLSearchParams(requestBody), // Ensure body is formatted properly
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Proxy API Error:", error);
    res.status(500).json({ error: "Failed to fetch data from Anex" });
  }
}
