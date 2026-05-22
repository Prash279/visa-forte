import { redirect } from 'next/navigation'
import { getCurrentAuthSession } from '@/lib/auth-server'
import CanDocTool from './CanDocTool'
import '../admin.css'

export const metadata = { title: 'CanDoc Review — Visa Forte Admin' }

export default async function CanDocPage(): Promise<React.JSX.Element> {
  const authSession = await getCurrentAuthSession()
  if (!authSession?.session) redirect('/login')
  if (authSession.user?.email !== 'prashant@visaforte.com') redirect('/')
  return <CanDocTool />
}
