import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const response = await axios.post(
      "https://anex.us/grades/getData/",
      new URLSearchParams(req.body),
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
