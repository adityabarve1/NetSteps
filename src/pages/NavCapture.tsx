import { useEffect } from 'react';
import { useNavigate } from 'react-router';

// Hands the router's navigate function to the test, so it can change the URL.
export function NavCapture({
  onReady,
}: {
  onReady: (go: (to: string) => void) => void;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    onReady((to) => {
      void navigate(to);
    });
  }, [navigate, onReady]);
  return null;
}
