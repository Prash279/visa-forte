import { redirect } from 'next/navigation';
import { getCurrentAuthSession } from '@/lib/auth-server';
import CanDocTool from './CanDocTool';
import SignOutButton from '../SignOutButton';
import '../admin.css';

export const metadata = { title: 'CanDoc Review — Visa Forte Admin' };

export default async function CanDocPage(): Promise<React.JSX.Element> {
  const authSession = await getCurrentAuthSession();
  if (!authSession?.session) redirect('/login');
  if (authSession.user?.email !== 'prashant@visaforte.com') redirect('/');

  const userEmail = authSession.user?.email ?? '';

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-header-wordmark">Visa Forte</span>
          <span className="admin-header-divider" />
          <span className="admin-header-label">CanDoc Reviewer</span>
        </div>
        <div className="admin-header-right">
          <a
            href="/admin"
            className="admin-footer-link"
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(248,244,238,0.5)',
              textDecoration: 'none',
            }}
          >
            ← Admin
          </a>
          <span className="admin-header-email">{userEmail}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="admin-accent" />
      <main className="admin-main" style={{ maxWidth: '72rem' }}>
        <CanDocTool />
      </main>
    </div>
  );
}
