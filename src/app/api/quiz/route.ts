import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quizzes, questions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      const allQuizzes = await db.select().from(quizzes).limit(20);
      return NextResponse.json({ quizzes: allQuizzes });
    }

    const quizId = parseInt(id, 10);
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId))
      .orderBy(questions.orderIndex);

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questions: quizQuestions.map((q) => ({
          question: q.questionText,
          type: q.questionType,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          timerSeconds: q.timerSeconds,
          points: q.pointsCorrect
        }))
      }
    });
  } catch (error: any) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
