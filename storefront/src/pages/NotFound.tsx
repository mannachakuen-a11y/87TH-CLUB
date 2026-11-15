import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <main className="main page" id="main">
      <h1>Page not found</h1>
      <p>
        The page you were looking for does not exist. <Link to="/collections/new-arrivals" className="u">Shop New Arrivals</Link>
      </p>
    </main>
  );
}
