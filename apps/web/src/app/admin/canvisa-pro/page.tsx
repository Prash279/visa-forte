import { redirect } from 'next/navigation';
import { getCurrentAuthSession } from '@/lib/auth-server';
import CanVisaProTool from './CanVisaProTool';
import '../admin.css';

export const metadata = { title: 'CanVisa Pro — Visa Forte Consultant' };

export default async function CanVisaProPage() {
  const authSession = await getCurrentAuthSession();

  if (!authSession?.session) redirect('/login');

  const userEmail = authSession.user?.email ?? '';
  if (userEmail !== 'prashant@visaforte.com') redirect('/');

  return <CanVisaProTool />;
}
