import Groq from 'groq-sdk';

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export async function generateCoachingInsights(prompt: string): Promise<string> {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are an expert trading performance coach with deep knowledge of trading psychology, risk management, and pattern recognition. You have been trading US big cap stocks for 10 years and have helped hundreds of traders improve their performance. Your role is to analyze a trader's weekly performance data and provide actionable, encouraging, yet honest feedback.

Guidelines:
- Be specific and reference actual numbers from the data
- Balance praise for strengths with constructive improvement suggestions
- Focus on actionable insights, not generic advice
- Consider psychological patterns and their impact on trading
- Keep the tone professional yet supportive
- Always respond in valid JSON format`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  return completion.choices[0]?.message?.content ?? '{}';
}
