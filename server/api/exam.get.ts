import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const db = useDb()
  const {
    EXAM_QUESTION_COUNT,
    buildExamQuestionSet,
    getLatestExamAttempt,
    loadExamQuestionPool
  } = await import('../utils/competencyExam')

  const questionPool = await loadExamQuestionPool(db)
  const questions = buildExamQuestionSet(questionPool, EXAM_QUESTION_COUNT)
  const latestAttempt = await getLatestExamAttempt(db, session.user.id)

  return {
    total_questions: questions.length,
    questions,
    latest_attempt: latestAttempt
  }
})
