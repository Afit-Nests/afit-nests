export async function createNotification(client, { userId, type, title, body = '', link = null }) {
  if (!userId) return null
  const result = await client.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, body, link],
  )
  return result.rows[0]
}

export async function writeAuditLog(client, { actorId = null, action, targetType, targetId = null, metadata = {} }) {
  const result = await client.query(
    `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [actorId, action, targetType, targetId, JSON.stringify(metadata)],
  )
  return result.rows[0]
}
