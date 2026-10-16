export function Expenses({ items, error, onAdd }) {
  if (error) return <p className="error">Ops! Algo deu errado :(</p>;
  if (items.length === 0) return <div className="empty" />;
  return (
    <section>
      <button onClick={onAdd}>Novo</button>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            {i.description}: R$ {i.amount}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Shown after a successful save.
export const SAVED_MESSAGE = "Registro criado";
