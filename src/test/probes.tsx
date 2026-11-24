// Tiny components that tests render beside the page under test.
import { useLocation } from 'react-router';

/** Prints the current path and query, so a test can see where a page sent the user. */
export function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{`${pathname}${search}`}</p>;
}

/** Stands in for any page the test does not care about. */
export function Elsewhere() {
  const { pathname } = useLocation();
  return <h1>Elsewhere: {pathname}</h1>;
}
