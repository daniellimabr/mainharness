import { useEffect, useState } from "react";

interface Order {
  id: number;
  customer: string;
  total: number;
  createdAt: string;
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    void fetch("/api/orders")
      .then((r) => r.json())
      .then(setOrders);
  }, []);
  return (
    <table>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td>{o.customer}</td>
            <td>{o.total}</td>
            <td>{o.createdAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
