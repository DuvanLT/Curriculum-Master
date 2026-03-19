import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const body = await readBody(event)
  const answers = Array.isArray(body?.answers) ? body.answers : []
  const db = useDb()
  const {
    EXAM_QUESTION_COUNT,
    evaluateExamAnswers,
    loadExamQuestionPool
  } = await import('../utils/competencyExam')

  const questionPool = await loadExamQuestionPool(db)
  const result = evaluateExamAnswers(questionPool, answers)

  if (result.answers.length !== EXAM_QUESTION_COUNT) {
    throw createError({
      statusCode: 400,
      statusMessage: `Debes responder las ${EXAM_QUESTION_COUNT} preguntas antes de enviar el examen.`
    })
  }

  const completedAt = new Date().toISOString()
  const attemptId = crypto.randomUUID()

  await db.execute({
    sql: `
      INSERT INTO competency_exam_attempts
      (id, user_id, status, profile_label, total_questions, answers_count, scores_json, confirmed_skills_json, completed_at)
      VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?)
    `,
    args: [
      attemptId,
      session.user.id,
      result.profileLabel,
      EXAM_QUESTION_COUNT,
      result.answers.length,
      JSON.stringify(result.scores),
      JSON.stringify(result.confirmedSkills),
      completedAt
    ]
  })

  for (const answer of result.answers) {
    await db.execute({
      sql: `
        INSERT INTO competency_exam_answers
        (id, attempt_id, question_id, option_id, skill_key, score_value)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        crypto.randomUUID(),
        attemptId,
        answer.questionId,
        answer.optionId,
        answer.skillKey,
        answer.scoreValue
      ]
    })
  }

  return {
    success: true,
    result: {
      profile_label: result.profileLabel,
      confirmed_skills: result.confirmedSkills,
      completed_at: completedAt
    }
  }
})
