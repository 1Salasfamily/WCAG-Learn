import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="card" aria-labelledby="home-heading">
        <h2 id="home-heading">Welcome to WCAG Learn</h2>
        <p>
          This project is initialized as a Next.js App Router application and
          is ready for deployment on Vercel.
        </p>
        <p>
          Continue to the criteria page to view a sample dataset loaded from
          <code> data/wcag.json</code>.
        </p>
        <p>
          <Link href="/criteria">Go to Criteria</Link>
        </p>
      </section>
    </>
  );
}
