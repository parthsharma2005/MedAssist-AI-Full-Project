import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function test() {
  console.log("Testing Gemini Interactions API...");

  try {
    const response = await ai.interactions.create({
      model: "gemini-3.7-flash",
      input: "Say hello in one short sentence."
    });

    console.log("\nSUCCESS:");
    console.log(response.output_text);
  } catch (error) {
    console.log("\nGEMINI ERROR:");
    console.log(error);
  }
}

test();