// Lightweight URL ↔ state bridge for our SPA.
// Maps `state.view` (+ selectedBuilding id) onto the URL, and vice-versa.

export function pathFromState(view, id) {
  switch (view) {
    case 'dashboard':    return '/';
    case 'inventory':    return '/buildings';
    case 'profile':      return id ? `/buildings/${encodeURIComponent(id)}` : '/buildings';
    case 'new-building': return '/new-building';
    case 'map':          return '/map';
    case 'parameters':   return '/parameters';
    case 'calculator':   return '/calculator';
    default:             return '/';
  }
}

export function stateFromPath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/';
  if (p === '/' || p === '/dashboard') return { view: 'dashboard',    id: null };
  if (p === '/buildings')              return { view: 'inventory',    id: null };
  if (p.startsWith('/buildings/'))     return { view: 'profile',      id: decodeURIComponent(p.slice('/buildings/'.length)) };
  if (p === '/new-building')           return { view: 'new-building', id: null };
  if (p === '/map')                    return { view: 'map',          id: null };
  if (p === '/parameters')             return { view: 'parameters',   id: null };
  if (p === '/calculator')             return { view: 'calculator',   id: null };
  return { view: 'dashboard', id: null };
}

// Helper for anchor click handlers — open in new tab on ctrl/meta/middle-click.
export function isModifiedClick(e) {
  return e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1;
}
