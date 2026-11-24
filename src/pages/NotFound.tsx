import { Link } from 'react-router';

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        We could not find that page. It may have moved, or the link is wrong.
      </p>
      <p>
        <Link to="/">Go to the home page</Link>
      </p>
    </>
  );
}
