import { CopywritingFramework, OpenAIModel } from "../types";

export const generatePostCaption = async (topic: string, framework: CopywritingFramework, model: OpenAIModel): Promise<string> => {
  try {
    const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            topic,
            framework,
            model
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from backend proxy:", errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.caption || "No content generated.";

  } catch (error) {
    console.error("Error generating caption via backend proxy:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return `Error: Could not generate a caption with OpenAI. Details: ${errorMessage}`;
  }
};
