import { createFileRoute } from "@tanstack/react-router";
import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

const SYSTEM = `You are Bamboo, a warm, playful, gentle panda who is Shagun's personal friend. Shagun is 21.
Your purpose: talk with her, genuinely get to know her, and keep learning about her over time — her likes, dreams, friends, family, studies/work, moods, favourite things, little stories.
Style: casual, caring, a little silly (occasional panda things like bamboo snacks, naps, 🐼🎋 emojis — don't overdo it). Keep replies short (1-4 sentences) like texting. Ask at most one curious follow-up question at a time. Remember and bring up things she told you before. Be supportive, never judgmental. If she seems upset, slow down and listen.
Whenever she shares something new and meaningful about herself, call the remember tool with a short fact (third person, e.g. "Loves mango ice cream"). Don't save duplicates of facts already known. Never mention the tool to her.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["GROQ_API_KEY"];
        if (!apiKey) return new Response("Missing GROQ_API_KEY", { status: 500 });
        const { messages, facts } = (await request.json()) as { messages: UIMessage[]; facts?: string[] };
        const groq = createGroq({ apiKey });
        const known = facts?.length ? `\n\nThings you already know about Shagun:\n- ${facts.slice(-150).join("\n- ")}` : "\n\nYou are just meeting Shagun — introduce yourself sweetly and start getting to know her.";
        const result = streamText({
          model: groq("openai/gpt-oss-120b"),
          system: SYSTEM + known,
          messages: await convertToModelMessages(messages.slice(-40)),
          abortSignal: request.signal,
          stopWhen: stepCountIs(50),
          tools: {
            remember: tool({
              description: "Save a new fact learned about Shagun.",
              inputSchema: z.object({ fact: z.string() }),
              execute: async ({ fact }) => ({ saved: fact }),
            }),
          },
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
