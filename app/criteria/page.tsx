import { getWcagCriteria } from "@/lib/wcag";

export default async function CriteriaPage() {
  const criteria = await getWcagCriteria();

  return (
    <section className="card" aria-labelledby="criteria-heading">
      <h2 id="criteria-heading">Criteria</h2>
      <p>Sample WCAG criteria loaded from local JSON data.</p>
      <ul className="criteria-list">
        {criteria.map((item) => (
          <li key={item.id}>
            <strong>{item.id}</strong> {item.title}
            <span className="badge">Level {item.level}</span>
            <br />
            <span>{item.shortExplanation}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
