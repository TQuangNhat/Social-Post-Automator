
import { CopywritingFramework, OpenAIModel } from "../types";

// This function is duplicated from geminiService.ts for simplicity.
// In a larger app, this could be shared in a common utils file.
const getFrameworkInstruction = (framework: CopywritingFramework): string => {
    switch (framework) {
        case CopywritingFramework.AIDA:
            return "Structure the post using the AIDA (Attention, Interest, Desire, Action) framework.";
        // FIX: Corrected typo from `Copywriting` to `CopywritingFramework`.
        case CopywritingFramework.PAS:
            return "Structure the post using the PAS (Problem, Agitate, Solution) framework.";
        case CopywritingFramework.Storytelling:
            return "Write the post by telling a short, compelling story related to the topic.";
        case CopywritingFramework.Auto:
        default:
            return "Analyze the topic and choose the most effective copywriting framework (like AIDA, PAS, or storytelling) to structure the post.";
    }
}

export default async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { topic, framework, model } = await req.json() as { topic: string, framework: CopywritingFramework, model: OpenAIModel };

    if (!topic || !framework || !model) {
        return new Response(JSON.stringify({ error: 'Missing required parameters: topic, framework, model' }), { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error("OPENAI_API_KEY environment variable not set on the server.");
        return new Response(JSON.stringify({ error: 'AI service is not configured on the server.' }), { status: 500 });
    }

    const frameworkInstruction = getFrameworkInstruction(framework);
    const systemPrompt = `You are a helpful social media assistant. ${frameworkInstruction} Write engaging and friendly content. Include relevant hashtags. The post should be suitable for a general audience and kept concise, under 150 words.`;
    const userPrompt = `The topic is: "${topic}".`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 256,
                top_p: 1,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error from OpenAI API:", errorData);
            // Forward the status and error from OpenAI
            return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch from OpenAI' }), { status: response.status });
        }

        const data = await response.json();
        const caption = data.choices[0]?.message?.content || "No content generated.";

        return new Response(JSON.stringify({ caption }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in backend proxy calling OpenAI:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return new Response(JSON.stringify({ error: `Server error: ${errorMessage}` }), { status: 500 });
    }
};
