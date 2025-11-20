import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
// Note: API Key is strictly from process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Cleans or transforms a list of raw strings using Gemini Flash.
 * Uses structured JSON output to ensure the array length matches the input.
 */
export const cleanDataWithAI = async (
  rawData: string[],
  instruction: string
): Promise<string[]> => {
  const modelId = "gemini-2.5-flash";

  // We need strict output: an array of strings of the same length.
  // We use responseSchema to enforce this.
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `
        You are a data cleaning assistant.
        Task: ${instruction}
        
        Input Data:
        ${JSON.stringify(rawData)}
        
        Requirements:
        1. Process each item in the input array.
        2. Return an array of exactly the same length.
        3. If a value cannot be cleaned, keep the original or return an empty string based on context.
        4. Do not add any explanations, just the JSON array.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    if (response.text) {
      const cleanedArray = JSON.parse(response.text);
      if (Array.isArray(cleanedArray)) {
        return cleanedArray;
      }
    }
    throw new Error("Invalid response format from AI");
  } catch (error) {
    console.error("AI Cleaning Error:", error);
    throw error;
  }
};

/**
 * Analyzes a sample DOM structure text (simplified) to suggest field names.
 * (Optional advanced feature)
 */
export const suggestFieldNames = async (
  sampleText: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Suggest a short, concise column header name (snake_case) for this data sample: "${sampleText}". Return ONLY the name.`,
    });
    return response.text ? response.text.trim() : "unknown_field";
  } catch (e) {
    return "field";
  }
};
