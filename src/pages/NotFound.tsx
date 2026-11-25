import { Link } from 'react-router';
import { ProsePage } from '@/pages/ProsePage';

export default function NotFound() {
  return (
    <ProsePage>
      <h1>Page not found</h1>
      <p>
        We could not find that page. It may have moved, or the link is wrong.
      </p>
      <p>
        <Link to="/">Go to the home page</Link>
      </p>
    </ProsePage>
  );
}
