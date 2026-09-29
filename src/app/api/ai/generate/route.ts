import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const requestSchema = z.object({
  topic: z.string(),
  numQuestions: z.number().min(1).max(100),
  difficulty: z.string().default("medium"),
  style: z.string().optional(),
  type: z.string().default("multiple_choice"),
  audience: z.string().optional(),
  instructions: z.string().optional(),
  userAnswer: z.string().optional(),
  userOptions: z.array(z.string()).optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid input", details: result.error }, { status: 400 });
    }
    
    const { topic, numQuestions, difficulty, style, type, audience, instructions, userAnswer, userOptions } = result.data;
    
    const prompt = `You are an elite quizmaster and tournament architect for BuzzArena, a real-time multiplayer buzzer arena.

Analyze the user's input:
--- USER INPUT / TOPIC / QUESTIONS & ANSWERS ---
${topic}
------------------------------------------------
${userAnswer ? `User-specified correct answer to allocate: "${userAnswer}"` : ""}
${userOptions && userOptions.length > 0 ? `User-specified options provided: ${JSON.stringify(userOptions)}` : ""}
- Target number of questions: ${numQuestions}
- Difficulty level: ${difficulty}
- Gameplay style: ${style || "fast-paced competitive buzzer trivia"}
- Question format: ${type}
${audience ? `- Audience / Target Level: ${audience}` : ""}
${instructions ? `- Specific instructions: ${instructions}` : ""}

CRITICAL RULES:
1. USER-SUPPLIED QUESTIONS & CORRECT ANSWERS:
   - If the user provided specific questions and/or correct answers (in the prompt, notes, or userAnswer field), you MUST preserve their exact questions and designated correct answers.
   - If the user specified a correct answer without all 4 options, generate plausible, realistic distractor options and combine them with the user's correct answer so there are exactly 4 options.
   - If the user provided some options, keep those options, fill in any missing options up to 4, and designate the user's correct answer.
   - The user's correct answer MUST be assigned into the "options" array, and "correctAnswer" MUST be an exact, character-for-character match to that option.
   - If the user supplied multiple questions with answers or pasted a list of questions, parse each one, allocate options for each, assign the correct option for each, and then generate any additional questions requested to reach ${numQuestions} questions.
2. FULL DECK GENERATION:
   - Generate exactly ${numQuestions} questions (or as requested). If the user requested 30, 40, or 50 questions, generate all ${numQuestions} questions completely without truncation.
   - Every question must be engaging, factual, and competitive.
3. OPTION ALLOCATION & FORMAT RULES:
   - If Question format is "verbal" (Verbal / Fast-Buzz Mode):
     - DO NOT generate options. "options" MUST be an empty array [].
     - "type" MUST be "verbal".
     - "correctAnswer" MUST be the direct, factual verbal answer that the contender must say aloud (e.g. "Mitochondria", "Paris", "1969", "William Shakespeare", "Leonardo da Vinci").
     - "explanation" should be a concise 1-sentence referee note confirming the answer.
   - If Question format is "multiple_choice":
     - ALWAYS provide an array of 4 distinct, realistic, high-quality options.
     - Randomize the position of the correct answer among the 4 options (do not always place it first).
     - "correctAnswer" MUST be an EXACT, literal match to one of the 4 items in "options".
     - "type" MUST be "multiple_choice".
4. DEFAULT METRICS:
   - "timerSeconds": 15
   - "points": 100
   - "title": A concise, exciting tournament title based on the topic or user content.

Return the output as valid JSON matching this schema:
{
  "title": "A catchy title for the quiz",
  "questions": [
    {
      "question": "The question prompt text",
      "type": "${type === "verbal" ? "verbal" : "multiple_choice"}",
      "options": ${type === "verbal" ? "[]" : '["Plausible Option 1", "Plausible Option 2", "Plausible Option 3", "Plausible Option 4"]'},
      "correctAnswer": "The exact direct answer (or matching option text)",
      "explanation": "Concise 1-sentence referee note explaining the answer",
      "timerSeconds": 15,
      "points": 100
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    let cleanJson = response.text.trim();
    // Extract JSON if wrapped in markdown code blocks
    const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleanJson = match[1].trim();
    } else {
      // If it starts with ```json without closing
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    const quizData = JSON.parse(cleanJson);

    return NextResponse.json({ success: true, quiz: quizData });
  } catch (error: any) {
    console.error("AI Generation API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

