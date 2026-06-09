import { useAuth } from '../../context/AuthContext';
import AuthLanding from './AuthLanding';
import WaitingScreen from './WaitingScreen';
import ResetPasswordScreen from './ResetPasswordScreen';

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
  const { authState, session, logout, finishRecovery } = useAuth();

  if (authState === 'recovery')  return <ResetPasswordScreen onDone={finishRecovery} />;
  if (authState === 'loading')   return <Loader />;
  if (authState === 'loggedout') return <AuthLanding />;
  if (authState === 'waiting')   return <WaitingScreen email={session?.user?.email ?? ''} onLogout={logout} />;

  return children;
}
