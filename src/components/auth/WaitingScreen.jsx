import { Clock } from 'lucide-react';

export default function WaitingScreen({ email, onLogout }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      background: 'var(--ai-gris-clair)', fontFamily: 'var(--ai-font)', padding: 24,
    }}>
      <div className="card fade-in" style={{ maxWidth: 380, padding: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--ai-rouge-clair)',
        }}>
          <Clock className="w-6 h-6" style={{ color: 'var(--ai-rouge)' }} />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ai-violet)', margin: 0 }}>
          Compte en attente de validation
        </h2>
        {email && <p style={{ fontSize: 13, color: 'var(--ai-noir70)', marginTop: 8 }}>{email}</p>}
        <p style={{ fontSize: 13, color: 'var(--ai-noir70)', marginTop: 12, lineHeight: 1.5 }}>
          Votre compte doit être approuvé par un administrateur avant d'accéder à
          l'application. Vous recevrez l'accès dès la validation.
        </p>
        <button onClick={onLogout} className="btn-secondary"
          style={{ marginTop: 22, width: '100%', justifyContent: 'center' }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
