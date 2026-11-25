import { useEffect } from 'react';
import { siteConfig } from '@/config/site';

// Shows "<title> - <site name>" in the browser tab while the page is open, and
// puts the old title back when it closes. Only one page state is on screen at a
// time, and React runs the old state's cleanup before the next one's effect, so
// the saved "old title" is always the one from before the lesson page.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const before = document.title;
    document.title = `${title} - ${siteConfig.name}`;
    return () => {
      document.title = before;
    };
  }, [title]);
}
