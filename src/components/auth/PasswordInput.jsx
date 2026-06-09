import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with a show/hide (eye) toggle.
 * Accepts the same `inputStyle` used across the auth screens so it blends in.
 */
export default function PasswordInput({ value, onChange, placeholder, required, inputStyle, autoComplete, onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={{ ...inputStyle, paddingRight: 38 }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: 'var(--ai-noir70)', display: 'flex', alignItems: 'center',
        }}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
