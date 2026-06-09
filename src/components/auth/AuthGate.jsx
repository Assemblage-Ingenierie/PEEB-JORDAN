import { useAuth } from '../../context/AuthContext';
import AuthLanding from './AuthLanding';
import WaitingScreen from './WaitingScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import CompleteProfileModal from './CompleteProfileModal';

function Loader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ai-gris-clair)', fontFamily: 'var(--ai-font)',
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid var(--ai-gris)',
        borderTopColor: 'var(--ai-rouge)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export default function AuthGate({ children }) {
  const { authState, session, profile, logout, finishRecovery } = useAuth();

  if (authState === 'recovery')  return <ResetPasswordScreen onDone={finishRecovery} />;
  if (authState === 'loading')   return <Loader />;
  if (authState === 'loggedout') return <AuthLanding />;

  // Authenticated (waiting or approved): if the profile is incomplete
  // (typical for Google sign-ups), collect the missing fields first.
  const incomplete = profile &&
    (!profile.first_name?.trim() || !profile.last_name?.trim() || !profile.job_title?.trim());
  if (incomplete) return <CompleteProfileModal />;

  if (authState === 'waiting')   return <WaitingScreen email={session?.user?.email ?? ''} onLogout={logout} />;

  return children;
}
