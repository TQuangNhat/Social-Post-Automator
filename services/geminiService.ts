
import { GoogleGenAI } from "@google/genai";
import { CopywritingFramework } from "../types";

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getFrameworkInstruction = (framework: CopywritingFramework): string => {
    switch (framework) {
        case CopywritingFramework.AIDA:
            return "Structure the post using the AIDA (Attention, Interest, Desire, Action) framework.";
        case CopywritingFramework.PAS:
            return "Structure the post using the PAS (Problem, Agitate, Solution) framework.";
        case CopywritingFramework.Storytelling:
            return "Write the post by telling a short, compelling story related to the topic.";
        case CopywritingFramework.Auto:
        default:
            return "Analyze the topic and choose the most effective copywriting framework (like AIDA, PAS, or storytelling) to structure the post.";
    }
}

export const generatePostCaption = async (topic: string, framework: CopywritingFramework): Promise<string> => {
  if (!process.env.API_KEY) {
    return "AI caption generation is disabled. Please configure the API Key.";
  }
  
  try {
    const frameworkInstruction = getFrameworkInstruction(framework);
    
    // FIX: Refactored to use systemInstruction for better prompt structure and context separation, following Gemini API best practices.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a Facebook post about: "${topic}".`,
      config: {
        systemInstruction: `You are an expert social media copywriter. You write engaging and friendly Facebook posts suitable for a general audience, keeping them concise and under 150 words. Always include relevant hashtags. ${frameworkInstruction}`,
        temperature: 0.7,
        topP: 1,
        topK: 1,
        maxOutputTokens: 256,
        thinkingConfig: { thinkingBudget: 100 },
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating caption with Gemini API:", error);
    return "Error: Could not generate a caption. Please check the console for details.";
  }
};
