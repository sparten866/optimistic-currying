import React, { useState, useEffect, useCallback } from "react";

/* ================= TYPES ================= */

type Payment = {
  amount: string;
  date: string;
};

type Entry = {
  id: string;
  supplier: string;
  totalAmount: number;
  purchaseDate: string;
  dueDate: string;
  payments: Payment[];
};

/* ================= UTILS ================= */

const PKR = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const fmt = (d: string | number | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
};

const fmtFull = (d: string | number | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const daysDiff = (dateStr: string | number | Date) => {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
};

const getPaid = (e: Entry) =>
  e.payments.reduce((s: number, p) => s + (parseFloat(p.amount) || 0), 0);

const getRemaining = (e: Entry) =>
  Math.max(0, e.totalAmount - getPaid(e));

const getStatus = (e: Entry) => {
  const paid = getPaid(e);
  if (paid <= 0) return "Pending";
  if (paid >= e.totalAmount) return "Paid";
  return "Partial";
};

const isOverdue = (e: Entry) =>
  getRemaining(e) > 0 && daysDiff(e.dueDate) < 0;

const isDueSoon = (e: Entry) => {
  const diff = daysDiff(e.dueDate);
  return getRemaining(e) > 0 && diff >= 0 && diff <= 3;
};

const getPriority = (e: Entry) => {
  if (isOverdue(e)) return 0;
  if (isDueSoon(e)) return 1;
  if (getStatus(e) === "Pending") return 2;
  if (getStatus(e) === "Partial") return 3;
  return 4;
};

/* ================= APP ================= */

const STORAGE_KEY = "supplier-payments-v3";

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  const save = useCallback((data: Entry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEntries(data);
  }, []);

  const addEntry = () => {
    if (!supplier || !amount) return;

    const newEntry: Entry = {
      id: Date.now().toString(),
      supplier,
      totalAmount: parseFloat(amount),
      purchaseDate,
      dueDate,
      payments: [],
    };

    save([newEntry, ...entries]);
    setSupplier("");
    setAmount("");
    setPurchaseDate("");
    setDueDate("");
    setToast({ msg: "Entry Added", type: "success" });
  };

  const addPayment = (id: string, paymentAmount: string) => {
    const updated = entries.map((e) =>
      e.id === id
        ? {
            ...e,
            payments: [
              ...e.payments,
              { amount: paymentAmount, date: new Date().toISOString() },
            ],
          }
        : e
    );
    save(updated);
  };

  const deleteEntry = (id: string) => {
    save(entries.filter((e) => e.id !== id));
  };

  const overdueEntries = entries.filter(isOverdue);
  const dueSoonEntries = entries.filter(isDueSoon);

  const totalOverdue = overdueEntries.reduce(
    (sum, e) => sum + getRemaining(e),
    0
  );

  const totalDueSoon = dueSoonEntries.reduce(
    (sum, e) => sum + getRemaining(e),
    0
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Supplier Payments</h2>

      {overdueEntries.length > 0 && (
        <div style={{ background: "#ffe5e5", padding: 12, marginBottom: 10 }}>
          🔴 {overdueEntries.length} Overdue <br />
          💸 {PKR(totalOverdue)}
        </div>
      )}

      {dueSoonEntries.length > 0 && (
        <div style={{ background: "#fff4cc", padding: 12, marginBottom: 10 }}>
          🟡 {dueSoonEntries.length} Due Soon <br />
          💰 {PKR(totalDueSoon)}
        </div>
      )}

      <input placeholder="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

      <button onClick={addEntry}>Add</button>

      <hr />

      {[...entries]
        .sort((a, b) => {
          const p = getPriority(a) - getPriority(b);
          if (p !== 0) return p;
          return daysDiff(a.dueDate) - daysDiff(b.dueDate);
        })
        .map((e) => (
          <div key={e.id} style={{ marginBottom: 15 }}>
            <h4>{e.supplier}</h4>
            <p>Total: {PKR(e.totalAmount)}</p>
            <p>Paid: {PKR(getPaid(e))}</p>
            <p>Remaining: {PKR(getRemaining(e))}</p>

            <p>
              Status:{" "}
              {isOverdue(e) ? "🔴 Overdue" : isDueSoon(e) ? "🟡 Due Soon" : getStatus(e)}
            </p>

            <p>
              {daysDiff(e.dueDate) < 0
                ? `Overdue by ${Math.abs(daysDiff(e.dueDate))} days`
                : `Due in ${daysDiff(e.dueDate)} days`}
            </p>

            <button onClick={() => addPayment(e.id, "1000")}>+1000</button>
            <button onClick={() => deleteEntry(e.id)}>Delete</button>
          </div>
        ))}
    </div>
  );
}
