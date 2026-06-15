import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="page">
      <p className="eyebrow">404</p>
      <h1 className="display-xl">Vilse i skogen.</h1>
      <p className="lede">Den här sidan finns inte.</p>
      <Link to="/" className="btn">
        ← Till start
      </Link>
    </main>
  );
}
