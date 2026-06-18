import { createError } from 'h3'

export const CV_NOT_READABLE = 'CV_NOT_READABLE'

export function cvNotReadableError(message: string) {
  return createError({
    statusCode: 422,
    message,
    data: { code: CV_NOT_READABLE },
  })
}
