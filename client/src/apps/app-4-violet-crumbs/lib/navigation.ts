import { useNavigate } from 'react-router-dom';

export const VC_BASE = '/apps/violet-crumbs';

export const vcPath = (path: string): string =>
  path === '/' ? VC_BASE : `${VC_BASE}${path}`;

export function useVCNavigate() {
  const navigate = useNavigate();
  return (to: string | number, options?: Parameters<ReturnType<typeof useNavigate>>[1]) => {
    if (typeof to === 'number') return navigate(to);
    // If already absolute with /apps/violet-crumbs, don't double-prefix
    if (to.startsWith(VC_BASE)) return navigate(to);
    return navigate(vcPath(to));
  };
}
