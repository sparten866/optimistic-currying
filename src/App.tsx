import React, { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "supplier-payments-v3";

const PKR = (n: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmt = (d: string | number | Date | null | undefined): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const daysDiff = (dateStr: string): number => {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
};

const badge = (color: string, bg: string): React.CSSProperties => ({
  background: bg,
  color,
  padding: "2px 10px",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.03em",
  whiteSpace: "nowrap",
});

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  color: "#0f172a",
};

interface EntryType {
  label: string;
  emoji: string;
  desc: string;
  color: string;
  bg: string;
  defaultAmount?: number;
  supplierFixed?: string;
}

const TYPES: Record<string, EntryType> = {
  purchase: {
    label: "Purchase",
    emoji: "🐄",
    desc: "Livestock by weight x rate",
    color: "#1e40af",
    bg: "#eff6ff",
  },
  ihc: {
    label: "IHC Certificate",
    emoji: "🏅",
    desc: "Halal cert per shipment",
    color: "#15803d",
    bg: "#f0fdf4",
    defaultAmount: 79870,
    supplierFixed: "IHC – International Halal Certificate",
  },
  aviation: {
    label: "Mafhh Aviation",
    emoji: "✈️",
    desc: "Aviation invoice per shipment",
    color: "#7e22ce",
    bg: "#fdf4ff",
    supplierFixed: "Mafhh Aviation",
  },
};

interface FormState {
  entryType: string;
  supplierName: string;
  invoiceRef: string;
  shipmentRef: string;
  date: string;
  item: string;
  weight: string;
  rate: string;
  amount: string;
  creditDays: string;
  notes: string;
}

const BLANK: FormState = {
  entryType: "purchase",
  supplierName: "",
  invoiceRef: "",
  shipmentRef: "",
  date: new Date().toISOString().split("T")[0],
  item: "Live Animals",
  weight: "",
  rate: "",
  amount: "",
  creditDays: "15",
  notes: "",
};

interface Payment {
  id: string;
  amount: number;
  date: string;
  note: string;
}

interface Entry {
  id: string;
  entryType: string;
  supplierName: string;
  invoiceRef: string;
  shipmentRef: string;
  purchaseDate: string;
  item: string;
  weight: string;
  rate: string;
  totalAmount: number;
  creditDays: string;
  dueDate: string;
  status: string;
  payments: Payment[];
  notes: string;
  createdAt: string;
}

const getPaid = (e: Entry): number =>
  (e.payments || []).reduce((s, p) => s + (parseFloat(String(p.amount)) || 0), 0);
const getRemaining = (e: Entry): number => Math.max(0, e.totalAmount - getPaid(e));
const getStatus = (e: Entry): string => {
  const paid = getPaid(e);
  if (paid <= 0) return "Pending";
  if (paid >= e.totalAmount) return "Paid";
  return "Partial";
};

function StatusBadge({ entry }: { entry: Entry }) {
  const st = getStatus(entry);
  if (st === "Paid") return <span style={badge("#15803d", "#dcfce7")}>✓ Paid</span>;
  if (st === "Partial") return <span style={badge("#7e22ce", "#f3e8ff")}>◑ Partial</span>;
  const d = daysDiff(entry.dueDate);
  if (d < 0) return <span style={badge("#b91c1c", "#fee2e2")}>Overdue {Math.abs(d)}d</span>;
  if (d === 0) return <span style={badge("#c2410c", "#ffedd5")}>Due Today</span>;
  if (d <= 3) return <span style={badge("#b45309", "#fef3c7")}>Due in {d}d</span>;
  return <span style={badge("#1d4ed8", "#dbeafe")}>Due in {d}d</span>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    purchase: { bg: "#eff6ff", color: "#1e40af", label: "Purchase" },
    ihc: { bg: "#f0fdf4", color: "#15803d", label: "IHC Cert" },
    aviation: { bg: "#fdf4ff", color: "#7e22ce", label: "Aviation" },
  };
  const s = map[type] || map.purchase;
  return <span style={{ ...badge(s.color, s.bg), fontSize: 10 }}>{s.label}</span>;
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: span === 2 ? "span 2" : undefined }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PRow({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{val}</span>
    </div>
  );
}

function StatCard({ label, val, color, bg }: { label: string; val: number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ color, opacity: 0.7, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800 }}>{val}</div>
    </div>
  );
}

function DashCard({ icon, label, val, sub, bg }: { icon: string; label: string; val: string; sub: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 16, padding: "20px 22px", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#fff", opacity: 0.7, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "4px 0" }}>{val}</div>
      <div style={{ color: "#fff", opacity: 0.6, fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function PaymentModal({ entry, onClose, onAdd }: { entry: Entry; onClose: () => void; onAdd: (id: string, amount: number, date: string, note: string) => void }) {
  const [amt, setAmt] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const paid = getPaid(entry);
  const remaining = getRemaining(entry);

  const submit = () => {
    const a = parseFloat(amt);
    if (!a || a <= 0) { alert("Enter a valid amount"); return; }
    if (a > remaining + 0.01) { alert("Amount exceeds remaining balance of " + PKR(remaining)); return; }
    onAdd(entry.id, a, date, note);
    setAmt("");
    setNote("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Record Payment</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{entry.supplierName}</div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total", val: PKR(entry.totalAmount), color: "#0f172a", bg: "#f8fafc" },
            { label: "Paid", val: PKR(paid), color: "#15803d", bg: "#f0fdf4" },
            { label: "Remaining", val: PKR(remaining), color: remaining > 0 ? "#b45309" : "#15803d", bg: remaining > 0 ? "#fff7ed" : "#f0fdf4" },
          ].map(({ label, val, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>

        {(entry.payments || []).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Payment History</div>
            <div style={{ border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
              {entry.payments.map((p, i) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: i < entry.payments.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{PKR(p.amount)}</div>
                    {p.note && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{p.note}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{fmt(p.date)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {remaining > 0 ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Add Payment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase" }}>Amount (PKR) *</label>
                <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(remaining)} style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase" }}>Payment Date *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase" }}>Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer, cheque no..." style={inp} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAmt(String(remaining))} style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#475569" }}>
                Pay Full ({PKR(remaining)})
              </button>
              <button onClick={submit} style={{ flex: 2, background: "linear-gradient(135deg,#15803d,#16a34a)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                💰 Record Payment
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0", color: "#15803d", fontWeight: 700, fontSize: 15 }}>✓ Fully Paid</div>
        )}
      </div>
    </div>
  );
}

function CashFlowTab({ entries }: { entries: Entry[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const due = entries.filter((e) => e.dueDate === dateStr && getStatus(e) !== "Paid");
    return { d, dateStr, due, total: due.reduce((s, e) => s + getRemaining(e), 0) };
  });

  const weeks = [days.slice(0, 7), days.slice(7, 14), days.slice(14, 21), days.slice(21, 28)];
  const grandTotal = days.reduce((s, day) => s + day.total, 0);
  const weekBgs = [
    "linear-gradient(135deg,#1e3a5f,#1e40af)",
    "linear-gradient(135deg,#14532d,#15803d)",
    "linear-gradient(135deg,#3b0764,#7e22ce)",
    "linear-gradient(135deg,#78350f,#b45309)",
  ];
  const weekColors = ["#1e40af", "#15803d", "#7e22ce", "#b45309"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ color: "#94a3b8", fontSize: 10, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>4-Week Total</div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{PKR(grandTotal)}</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{days.filter((d) => d.total > 0).length} payment days</div>
        </div>
        {weeks.map((w, i) => {
          const wkTotal = w.reduce((s, day) => s + day.total, 0);
          const start = w[0].d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          const end = w[6].d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          return (
            <div key={i} style={{ background: weekBgs[i], borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>Week {i + 1}</div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{PKR(wkTotal)}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4 }}>{start} – {end}</div>
            </div>
          );
        })}
      </div>

      {weeks.map((week, wi) => {
        const wkTotal = week.reduce((s, day) => s + day.total, 0);
        const weekLabel = `Week ${wi + 1}: ${week[0].d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${week[6].d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
        return (
          <div key={wi} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: "12px 12px 0 0", padding: "10px 18px" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{weekLabel}</div>
              <div style={{ color: "#34d399", fontWeight: 800, fontSize: 14 }}>
                {wkTotal > 0 ? PKR(wkTotal) : <span style={{ color: "#475569" }}>No payments</span>}
              </div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
              {week.map((day, di) => {
                const globalIdx = wi * 7 + di;
                const isToday = globalIdx === 0;
                const isWeekend = day.d.getDay() === 0 || day.d.getDay() === 6;
                const bg = isToday ? "#fff7ed" : day.total > 0 ? ["#eff6ff","#f0fdf4","#fdf4ff","#fefce8"][wi] : "#fafafa";
                return (
                  <div key={di} style={{ display: "grid", gridTemplateColumns: "220px 1fr auto", alignItems: "center", padding: "12px 18px", background: bg, borderBottom: di < 6 ? "1px solid #e2e8f0" : "none", opacity: isWeekend && day.total === 0 ? 0.5 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {isToday && <span style={{ background: "#f97316", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, letterSpacing: "0.06em" }}>TODAY</span>}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{day.d.toLocaleDateString("en-GB", { weekday: "long" })}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{day.d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {day.due.length === 0 ? (
                        <span style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic" }}>No payments due</span>
                      ) : day.due.map((e) => (
                        <div key={e.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 10px", fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{e.supplierName}</span>
                          <span style={{ color: "#94a3b8", margin: "0 4px" }}>·</span>
                          <span style={{ fontWeight: 700, color: getStatus(e) === "Partial" ? "#7e22ce" : "#1e40af" }}>{PKR(getRemaining(e))}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      {day.total > 0 ? (
                        <div style={{ fontSize: 15, fontWeight: 800, color: weekColors[wi] }}>{PKR(day.total)}</div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>—</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {grandTotal === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, color: "#94a3b8", marginTop: 10 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No payments due in the next 4 weeks</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("entry");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState<FormState>(BLANK);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate");
  const [payModal, setPayModal] = useState<Entry | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setEntries(JSON.parse(s));
    } catch {}
    setLoading(false);
  }, []);

  const save = useCallback((data: Entry[]) => {
    setEntries(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, []);

  const toast$ = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const switchType = (type: string) => {
    const c = TYPES[type];
    setForm({ ...BLANK, entryType: type, supplierName: c.supplierFixed || "", amount: c.defaultAmount ? String(c.defaultAmount) : "" });
  };

  const f = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const total =
    form.entryType === "purchase"
      ? (parseFloat(form.weight) || 0) * (parseFloat(form.rate) || 0)
      : parseFloat(form.amount) || 0;

  const dueDate = (() => {
    if (!form.date || !form.creditDays) return "";
    const d = new Date(form.date);
    d.setDate(d.getDate() + parseInt(form.creditDays));
    return d.toISOString().split("T")[0];
  })();

  const handleSubmit = () => {
    if (!form.supplierName) { toast$("Please enter Supplier name", "error"); return; }
    if (form.entryType === "purchase" && (!form.weight || !form.rate)) { toast$("Fill Weight & Rate", "error"); return; }
    if (form.entryType !== "purchase" && !form.amount) { toast$("Enter invoice amount", "error"); return; }
    const entry: Entry = {
      id: Date.now().toString(),
      entryType: form.entryType,
      supplierName: form.supplierName,
      invoiceRef: form.invoiceRef,
      shipmentRef: form.shipmentRef,
      purchaseDate: form.date,
      item: form.entryType === "purchase" ? form.item : TYPES[form.entryType].label,
      weight: form.entryType === "purchase" ? form.weight : "",
      rate: form.entryType === "purchase" ? form.rate : "",
      totalAmount: total,
      creditDays: form.creditDays,
      dueDate,
      status: "Pending",
      payments: [],
      notes: form.notes,
      createdAt: new Date().toISOString(),
    };
    save([entry, ...entries]);
    switchType(form.entryType);
    toast$("Entry saved to Master Log!");
    setTab("master");
  };

  const addPayment = (entryId: string, amount: number, date: string, note: string) => {
    const payment: Payment = { id: Date.now().toString(), amount, date, note };
    const updated = entries.map((e) => {
      if (e.id !== entryId) return e;
      const payments = [...(e.payments || []), payment];
      const paidAmt = payments.reduce((s, p) => s + p.amount, 0);
      const newStatus = paidAmt >= e.totalAmount ? "Paid" : paidAmt > 0 ? "Partial" : "Pending";
      return { ...e, payments, status: newStatus };
    });
    save(updated);
    const updatedEntry = updated.find((e) => e.id === entryId);
    if (updatedEntry) setPayModal(updatedEntry);
    toast$("Payment recorded!");
  };

  const toggleStatus = (id: string) =>
    save(entries.map((e) => e.id === id ? { ...e, status: e.status === "Paid" ? "Pending" : "Paid", payments: e.status === "Paid" ? [] : e.payments || [] } : e));

  const deleteEntry = (id: string) => {
    if (!window.confirm("Delete this entry?")) return;
    save(entries.filter((e) => e.id !== id));
    toast$("Deleted", "error");
  };

  const exportCSV = () => {
    const headers = ["Type","Supplier","Invoice","Shipment","Date","Item","Weight","Rate","Total","Paid","Remaining","CreditDays","DueDate","Status","Notes"];
    const rows = entries.map((e) => [
      e.entryType, e.supplierName, e.invoiceRef || "", e.shipmentRef || "",
      e.purchaseDate, e.item, e.weight || "", e.rate || "",
      e.totalAmount, getPaid(e), getRemaining(e), e.creditDays, e.dueDate, getStatus(e), e.notes || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "SupplierPayments_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    toast$("CSV exported!");
  };

  const pending = entries.filter((e) => getStatus(e) !== "Paid");
  const totalOut = pending.reduce((s, e) => s + getRemaining(e), 0);
  const overdue = pending.filter((e) => daysDiff(e.dueDate) < 0);
  const soon = pending.filter((e) => { const d = daysDiff(e.dueDate); return d >= 0 && d <= 7; });
  const paid = entries.filter((e) => getStatus(e) === "Paid");
  const partial = entries.filter((e) => getStatus(e) === "Partial");
  const paidTotal = entries.reduce((s, e) => s + getPaid(e), 0);

  const bySupplier = pending.reduce((a: Record<string, number>, e) => {
    a[e.supplierName] = (a[e.supplierName] || 0) + getRemaining(e);
    return a;
  }, {});
  const maxS = Math.max(...Object.values(bySupplier), 1);

  const filtered = entries
    .filter((e) => {
      const tm = filterType === "All" ? true : (e.entryType || "purchase") === filterType;
      const status = getStatus(e);
      const sm =
        filterStatus === "All" ? true :
        filterStatus === "Overdue" ? status !== "Paid" && daysDiff(e.dueDate) < 0 :
        filterStatus === "Due Soon" ? status !== "Paid" && daysDiff(e.dueDate) >= 0 && daysDiff(e.dueDate) <= 7 :
        filterStatus === "Partial" ? status === "Partial" :
        status === filterStatus;
      return tm && sm;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (sortBy === "amount") return b.totalAmount - a.totalAmount;
      if (sortBy === "supplier") return a.supplierName.localeCompare(b.supplierName);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const cfg = TYPES[form.entryType] || TYPES.purchase;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
      {payModal && <PaymentModal entry={payModal} onClose={() => setPayModal(null)} onAdd={addPayment} />}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f)", padding: "20px 28px 0", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>Credit Payment System</div>
            <h1 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 700 }}>🐄 Supplier Payment Tracker</h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#64748b", fontSize: 10 }}>OUTSTANDING</div>
              <div style={{ color: overdue.length > 0 ? "#f87171" : "#34d399", fontSize: 18, fontWeight: 800 }}>{PKR(totalOut)}</div>
            </div>
            <button onClick={exportCSV} style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ↓ Export CSV
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["entry","➕ New Entry"],["master","📋 Master Log"],["cashflow","📅 Cash Flow"],["dashboard","📊 Dashboard"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? "#fff" : "transparent", color: tab === id ? "#0f172a" : "#94a3b8", border: "none", padding: "10px 18px", borderRadius: "8px 8px 0 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {label}
              {id === "master" && entries.length > 0 && <span style={{ background: tab === "master" ? "#1e40af" : "#334155", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, marginLeft: 4 }}>{entries.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading…</div>}

        {/* NEW ENTRY */}
        {!loading && tab === "entry" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
            <div>
              <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Entry Type</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {Object.entries(TYPES).map(([key, info]) => (
                    <button key={key} onClick={() => switchType(key)} style={{ background: form.entryType === key ? info.bg : "#f8fafc", border: "2px solid " + (form.entryType === key ? info.color : "#e2e8f0"), borderRadius: 12, padding: "12px 10px", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: form.entryType === key ? info.color : "#475569", marginBottom: 3 }}>{info.emoji} {info.label}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>{info.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{cfg.emoji} {cfg.label} — Entry Details</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Supplier / Vendor Name *" span={2}>
                    <input value={form.supplierName} onChange={(e) => f("supplierName", e.target.value)} readOnly={!!TYPES[form.entryType]?.supplierFixed} placeholder="e.g. Malik Livestock" style={{ ...inp, background: TYPES[form.entryType]?.supplierFixed ? "#f8fafc" : "#fff" }} />
                  </Field>
                  <Field label={form.entryType === "purchase" ? "Purchase Date *" : "Invoice / Service Date *"}>
                    <input type="date" value={form.date} onChange={(e) => f("date", e.target.value)} style={inp} />
                  </Field>
                  {form.entryType !== "purchase" ? (
                    <>
                      <Field label="Shipment Reference">
                        <input value={form.shipmentRef} onChange={(e) => f("shipmentRef", e.target.value)} placeholder="e.g. SHP-2025-041" style={inp} />
                      </Field>
                      <Field label="Invoice / Certificate No.">
                        <input value={form.invoiceRef} onChange={(e) => f("invoiceRef", e.target.value)} placeholder="e.g. INV-0042" style={inp} />
                      </Field>
                      <Field label={"Amount (PKR) *" + (form.entryType === "ihc" ? " — default 79,870" : "")}>
                        <input type="number" value={form.amount} onChange={(e) => f("amount", e.target.value)} placeholder="79870" style={inp} />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Item / Description">
                        <input value={form.item} onChange={(e) => f("item", e.target.value)} placeholder="e.g. Live Animals" style={inp} />
                      </Field>
                      <Field label="Weight (kg) *">
                        <input type="number" value={form.weight} onChange={(e) => f("weight", e.target.value)} placeholder="1234" style={inp} />
                      </Field>
                      <Field label="Rate (PKR / kg) *">
                        <input type="number" value={form.rate} onChange={(e) => f("rate", e.target.value)} placeholder="1250" style={inp} />
                      </Field>
                    </>
                  )}
                  <Field label="Credit Days *">
                    <input type="number" value={form.creditDays} onChange={(e) => f("creditDays", e.target.value)} placeholder="15" style={inp} />
                  </Field>
                  <Field label="Payment Due Date (auto)">
                    <input value={dueDate ? fmt(dueDate) : "—"} readOnly style={{ ...inp, background: "#f8fafc", color: "#64748b" }} />
                  </Field>
                  <Field label="Notes / Remarks" span={2}>
                    <input value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Optional notes..." style={inp} />
                  </Field>
                </div>
                <button onClick={handleSubmit} style={{ marginTop: 20, width: "100%", background: "linear-gradient(135deg," + cfg.color + "," + cfg.color + "cc)", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  ✓ Save to Master Log
                </button>
              </div>
            </div>
            <div>
              <div style={{ background: "linear-gradient(135deg,#1e3a5f,#0f172a)", borderRadius: 16, padding: 24, color: "#fff", marginBottom: 16 }}>
                <div style={{ color: "#64748b", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Live Preview</div>
                <PRow label="Type" val={cfg.emoji + " " + cfg.label} />
                <PRow label="Supplier" val={form.supplierName || "—"} />
                {form.entryType === "purchase" ? (
                  <>
                    <PRow label="Weight" val={form.weight ? Number(form.weight).toLocaleString() + " kg" : "—"} />
                    <PRow label="Rate" val={form.rate ? "PKR " + Number(form.rate).toLocaleString() + "/kg" : "—"} />
                  </>
                ) : (
                  <>
                    <PRow label="Shipment" val={form.shipmentRef || "—"} />
                    <PRow label="Invoice" val={form.invoiceRef || "—"} />
                  </>
                )}
                <div style={{ margin: "16px 0", borderTop: "1px solid #1e3a5f" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>Total Amount</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: total > 0 ? "#34d399" : "#475569" }}>{PKR(total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>Due Date</span>
                  <span style={{ color: "#f87171", fontWeight: 700 }}>{dueDate ? fmt(dueDate) : "—"}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <StatCard label="Pending" val={pending.length} color="#1e40af" bg="#dbeafe" />
                <StatCard label="Overdue" val={overdue.length} color="#b91c1c" bg="#fee2e2" />
                <StatCard label="Partial" val={partial.length} color="#7e22ce" bg="#f3e8ff" />
                <StatCard label="Paid" val={paid.length} color="#15803d" bg="#dcfce7" />
              </div>
            </div>
          </div>
        )}

        {/* MASTER LOG */}
        {!loading && tab === "master" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: 13, fontWeight: 600 }}>Type:</span>
              {["All", "purchase", "ihc", "aviation"].map((t) => (
                <button key={t} onClick={() => setFilterType(t)} style={{ background: filterType === t ? "#0f172a" : "#fff", color: filterType === t ? "#fff" : "#475569", border: "1px solid " + (filterType === t ? "#0f172a" : "#e2e8f0"), borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {t === "All" ? "All Types" : TYPES[t].emoji + " " + TYPES[t].label}
                </button>
              ))}
              <span style={{ color: "#64748b", fontSize: 13, fontWeight: 600, marginLeft: 8 }}>Status:</span>
              {["All","Pending","Partial","Paid","Overdue","Due Soon"].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus === s ? "#1e40af" : "#fff", color: filterStatus === s ? "#fff" : "#475569", border: "1px solid " + (filterStatus === s ? "#1e40af" : "#e2e8f0"), borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{s}</button>
              ))}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ marginLeft: "auto", ...inp, width: "auto", padding: "6px 10px", fontSize: 12 }}>
                <option value="dueDate">Sort: Due Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="supplier">Sort: Supplier</option>
                <option value="created">Sort: Entry Date</option>
              </select>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, color: "#94a3b8" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>No entries found</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#0f172a", color: "#94a3b8" }}>
                      {["Type","Supplier","Ref / Item","Date","Total","Paid","Remaining","Credit","Due Date","Status","Actions"].map((h) => (
                        <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, i) => {
                      const ePaid = getPaid(e);
                      const eRem = getRemaining(e);
                      const eSt = getStatus(e);
                      return (
                        <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "11px 14px" }}><TypeBadge type={e.entryType || "purchase"} /></td>
                          <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0f172a" }}>{e.supplierName}</td>
                          <td style={{ padding: "11px 14px", color: "#475569" }}>
                            {(e.entryType || "purchase") === "purchase" ? e.item : (
                              <div>
                                {e.shipmentRef && <div style={{ fontWeight: 600 }}>{e.shipmentRef}</div>}
                                {e.invoiceRef && <div style={{ fontSize: 11, color: "#94a3b8" }}>{e.invoiceRef}</div>}
                                {!e.shipmentRef && !e.invoiceRef && "—"}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "11px 14px", color: "#64748b", whiteSpace: "nowrap" }}>{fmt(e.purchaseDate)}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 700, color: "#1e40af" }}>{PKR(e.totalAmount)}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 600, color: "#15803d" }}>{ePaid > 0 ? PKR(ePaid) : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 700, color: eRem > 0 ? "#b45309" : "#15803d" }}>{PKR(eRem)}</td>
                          <td style={{ padding: "11px 14px", color: "#64748b", textAlign: "center" }}>{e.creditDays}d</td>
                          <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>{fmt(e.dueDate)}</td>
                          <td style={{ padding: "11px 14px" }}><StatusBadge entry={e} /></td>
                          <td style={{ padding: "11px 14px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setPayModal(e)} title="Record payment" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#15803d" }}>💰</button>
                              <button onClick={() => toggleStatus(e.id)} title={eSt === "Paid" ? "Mark Pending" : "Mark Paid"} style={{ background: eSt === "Paid" ? "#fef3c7" : "#dcfce7", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>{eSt === "Paid" ? "↩" : "✓"}</button>
                              <button onClick={() => deleteEntry(e.id)} style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#0f172a", color: "#fff" }}>
                      <td colSpan={4} style={{ padding: "12px 14px", fontWeight: 700 }}>TOTAL ({filtered.length} entries)</td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#60a5fa" }}>{PKR(filtered.reduce((s, e) => s + e.totalAmount, 0))}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#34d399" }}>{PKR(filtered.reduce((s, e) => s + getPaid(e), 0))}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#fbbf24" }}>{PKR(filtered.reduce((s, e) => s + getRemaining(e), 0))}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && tab === "cashflow" && <CashFlowTab entries={entries} />}

        {/* DASHBOARD */}
        {!loading && tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
              <DashCard icon="⏳" label="Total Outstanding" val={PKR(totalOut)} sub={pending.length + " pending"} bg="linear-gradient(135deg,#1e3a5f,#1e40af)" />
              <DashCard icon="🚨" label="Overdue" val={PKR(overdue.reduce((s, e) => s + getRemaining(e), 0))} sub={overdue.length + " overdue"} bg="linear-gradient(135deg,#7f1d1d,#b91c1c)" />
              <DashCard icon="◑" label="Partially Paid" val={PKR(partial.reduce((s, e) => s + getRemaining(e), 0))} sub={partial.length + " partial"} bg="linear-gradient(135deg,#3b0764,#7e22ce)" />
              <DashCard icon="✅" label="Total Paid" val={PKR(paidTotal)} sub={paid.length + " cleared"} bg="linear-gradient(135deg,#14532d,#15803d)" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Outstanding by Supplier</h3>
                {Object.keys(bySupplier).length === 0 ? (
                  <div style={{ color: "#94a3b8", textAlign: "center", padding: 30 }}>No pending payments</div>
                ) : Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
                  <div key={name} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{name}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#1e40af" }}>{PKR(amt)}</span>
                    </div>
                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#1e40af,#60a5fa)", width: (amt / maxS) * 100 + "%" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>🗓 Upcoming & Overdue</h3>
                {pending.length === 0 ? (
                  <div style={{ color: "#94a3b8", textAlign: "center", padding: 30 }}>All clear! 🎉</div>
                ) : [...pending].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 8).map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{e.supplierName}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmt(e.dueDate)} · <TypeBadge type={e.entryType || "purchase"} /></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#1e40af", fontSize: 13 }}>{PKR(getRemaining(e))}</div>
                      <StatusBadge entry={e} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? "#b91c1c" : "#15803d", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 998 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
