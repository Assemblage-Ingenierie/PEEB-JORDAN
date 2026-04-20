import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: 40,
          fontFamily: '"Open Sans", system-ui, sans-serif', background: '#F2F2F2',
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 40, maxWidth: 480,
            border: '1px solid #DFE4E8', boxShadow: '0 4px 16px rgba(0,0,0,.08)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>⚠️</p>
            <h2 style={{ color: '#30323E', fontSize: 18, marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#4D4D4D', fontSize: 13, marginBottom: 24 }}>
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#E30513', color: 'white', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
