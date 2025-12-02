import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// "Nano Banana" - Hardcoded for speed as requested. Move to env in production.
const OPENROUTER_API_KEY = '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';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    const systemPrompt = `
You are Naomi, an elite AI fashion stylist.
You are savage, trendy, and extremely helpful.
You have access to the user's closet: ${JSON.stringify(context || [])}.
You will receive a photo of the user wearing a virtual garment.
Analyze the fit, the style, and how it looks on them.
Be honest but encouraging. If it looks weird, say so (it's a virtual try-on after all).
Keep responses short, punchy, and emoji-rich.
    `;

    // Prepend system prompt to messages
    const finalMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: 'google/gemma-3-27b-it:free', // Vision Capable Model (User Requested)
      messages: finalMessages,
    });

    return NextResponse.json(completion.choices[0].message);
  } catch (error: any) {
    console.error('OpenRouter Error:', error);
    const errorMessage = error?.error?.message || error?.message || 'Failed to fetch response';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
