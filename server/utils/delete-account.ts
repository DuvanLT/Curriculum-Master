interface BatchClient {
  batch(
    stmts: { sql: string; args: any[] }[],
    mode?: string,
  ): Promise<unknown>
}

/**
 * Elimina la cuenta de un usuario de forma atómica.
 *
 * `orders` referencia a `users` con FK NO ACTION (sin cascade), así que sus
 * filas deben borrarse explícitamente ANTES que el usuario; de lo contrario el
 * DELETE falla con "FOREIGN KEY constraint failed". El resto de tablas hijas
 * (experiences, educations, applications, job_analyses, generated_cvs,
 * next_steps) se limpian solas por ON DELETE CASCADE.
 *
 * Se ejecuta como batch (transacción): si algo falla, no queda a medias.
 */
export async function deleteUserAccount(db: BatchClient, userId: string): Promise<void> {
  await db.batch(
    [
      { sql: 'DELETE FROM orders WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [userId] },
    ],
    'write',
  )
}
