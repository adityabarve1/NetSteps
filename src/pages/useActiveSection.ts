import { useEffect, useState } from 'react';

// The id of the first section that is currently in the top part of the screen,
// for the table of contents. Without IntersectionObserver (old browsers, tests)
// nothing is marked and the page still works.
export function useActiveSection(ids: string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first !== undefined) setActive(first);
      },
      // A section counts while it is in the top 40% of the screen.
      { rootMargin: '0px 0px -60% 0px' },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element !== null) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);

  return active;
}
