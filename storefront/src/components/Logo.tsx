import { Link } from "react-router-dom";

/** Original text-based wordmark for the fictional 87TH CLUB brand. */
export default function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" className="logo" aria-label="87TH CLUB home" onClick={onClick}>
      <span className="logo-87">
        87<sup>TH</sup>
      </span>
      <span className="logo-club">CLUB</span>
    </Link>
  );
}
