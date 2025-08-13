const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
  }

  async initialize(apiKey) {
    if (!apiKey) return false;

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      return true;
    } catch (error) {
      console.error("Error initializing Gemini:", error);
      return false;
    }
  }

  async translateToEnglish(query) {
    if (!this.model) return query;

    try {
      const prompt = `Translate the following search query to English. Return only the translation, no explanations:

"${query}"`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("Error translating query:", error);
      return query;
    }
  }

  async searchWithAI(query, type) {
    if (!this.model) {
      return [];
    }

    try {
      const englishQuery = await this.translateToEnglish(query);

      const prompt = `You are a movie and TV show expert assistant. Your task is to analyze the user's search query and return the exact titles of the most relevant movies/shows.

        User's search: "${englishQuery}"
        Type: ${type}

        Important instructions:
        1. The search is in English - analyze the context and intent
        2. Return only the exact titles, separated by commas
        3. Do not include explanations or additional text
        4. Prioritize results most relevant to the search intent
        5. Consider genre, theme, style, and specific elements mentioned
        6. Maximum 20 titles per search

        Example response: The Matrix, The Matrix Reloaded, The Matrix Revolutions`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const titles = response
        .text()
        .split(",")
        .map((title) => title.trim())
        .filter((title) => title.length > 0);

      return titles;
    } catch (error) {
      console.error("Error processing AI search:", error);
      return []; // Return empty array in case of error
    }
  }
}

module.exports = new GeminiService();
