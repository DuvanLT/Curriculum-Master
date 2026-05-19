import { requireVerifiedUserSession } from '../utils/verified-session'
import { useNeonDb } from '../utils/neon'

export default defineEventHandler(async (event) => {
  // Ensure the user session is authenticated and verified
  await requireVerifiedUserSession(event)

  try {
    const sql = useNeonDb()

    // Query direct to NeonDB filtering jobs where the creation/publication date is within 15 days
    // COALESCE handles null dates gracefully using creado_en as fallback
    const rawJobs = await sql`
      SELECT 
        id,
        titulo,
        empresa,
        ubicacion,
        descripcion,
        link_vacante,
        tipo_contrato,
        salario_max_usd,
        COALESCE(fecha_publicacion_linkedin, creado_en) AS fecha_publicacion
      FROM ofertas_empleo
      WHERE COALESCE(fecha_publicacion_linkedin, creado_en) >= NOW() - INTERVAL '15 days'
      ORDER BY fecha_publicacion DESC
    `

    // Map database fields to the exact structure expected by the frontend UI
    const jobs = rawJobs.map((job: any) => {
      let formattedSalary = ''
      if (job.salario_max_usd) {
        const sal = parseFloat(job.salario_max_usd)
        if (!isNaN(sal)) {
          formattedSalary = `$${sal.toLocaleString('en-US')} USD`
        }
      }

      return {
        id: String(job.id),
        title: job.titulo || 'Sin título',
        company: job.empresa || 'LinkedIn Scraped',
        location: job.ubicacion || 'Remoto',
        snippet: job.descripcion || '',
        salary: formattedSalary,
        source: 'linkedin',
        type: job.tipo_contrato || 'Full-time',
        link: job.link_vacante || '#',
        updated: job.fecha_publicacion ? new Date(job.fecha_publicacion).toISOString() : new Date().toISOString()
      }
    })

    return {
      success: true,
      jobs,
      totalCount: jobs.length
    }
  } catch (error: any) {
    console.error('Error fetching jobs from NeonDB:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al consultar ofertas de LinkedIn en NeonDB: ' + (error.message || 'desconocido')
    })
  }
})
