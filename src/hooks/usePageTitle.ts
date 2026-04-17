import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — UPF-Connect` : 'UPF-Connect';
    return () => {
      document.title = 'UPF-Connect';
    };
  }, [title]);
}
