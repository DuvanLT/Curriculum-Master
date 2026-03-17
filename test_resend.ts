import { Resend } from 'resend'
import * as dotenv from 'dotenv'
dotenv.config()

const resend = new Resend(process.env.NUXT_RESEND_API_KEY)

async function testEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'mancipe.duvanh@gmail.com', // Using a placeholder, I should probably ask or check if there's a specific one
      subject: 'Test Email - Bring Jobs',
      html: '<strong>This is a test email.</strong>'
    })

    if (error) {
      console.error('Resend Error:', error)
    } else {
      console.log('Email sent successfully:', data)
    }
  } catch (e: any) {
    console.error('Execution Error:', e.message)
  }
}

testEmail()
