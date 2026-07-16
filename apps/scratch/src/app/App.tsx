import ScratchPage from './ScratchPage';
import LottoPage from './LottoPage';

// No router lib needed for two static pages — just branch on the path.
// Works standalone (base "/", "/lotto") and behind the hub's proxy
// (base "/scratch/", "/scratch/lotto") since we only check the suffix.
function getPage(): 'scratch' | 'lotto' {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path.endsWith('/lotto') ? 'lotto' : 'scratch';
}

export default function App() {
  return getPage() === 'lotto' ? <LottoPage /> : <ScratchPage />;
}
