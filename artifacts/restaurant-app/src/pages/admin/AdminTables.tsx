import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useListTables, useCreateTable, useUpdateTable, useDeleteTable, getListTablesQueryKey } from "@workspace/api-client-react";
import type { Table } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const STATUS_COLORS: Record<string, string> = { free: "bg-green-500/20 text-green-400", occupied: "bg-red-500/20 text-red-400", waiting: "bg-amber-500/20 text-amber-400" };
const BASE_URL = import.meta.env.VITE_FRONTEND_URL || "https://houssine1.vercel.app";

function getQrUrl(table: Table) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${BASE_URL}${base}/menu/${table.qrToken}`;
}

function exportSinglePDF(table: Table) {
  const url = getQrUrl(table);
  const svgEl = document.getElementById(`qr-modal-${table.id}`) as SVGElement | null;
  if (!svgEl) return;
  const encoded = encodeURIComponent(new XMLSerializer().serializeToString(svgEl));
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><head><title>QR Table ${table.number}</title><style>body{font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff}.card{border:2px solid #333;border-radius:16px;padding:32px;text-align:center;width:300px}h2{margin:0 0 8px;font-size:28px}p{margin:0 0 20px;color:#666;font-size:12px;word-break:break-all}img{width:200px;height:200px}</style></head><body><div class="card"><h2>Table #${table.number}</h2><p>${url}</p><img src="data:image/svg+xml,${encoded}"/></div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
  win.document.close();
}

function exportAllPDF(tables: Table[]) {
  let cards = "";
  tables.forEach((table) => {
    const url = getQrUrl(table);
    const svgEl = document.getElementById(`qr-all-${table.id}`) as SVGElement | null;
    if (!svgEl) return;
    const encoded = encodeURIComponent(new XMLSerializer().serializeToString(svgEl));
    cards += `<div class="card"><h2>Table #${table.number}</h2><p>${url}</p><img src="data:image/svg+xml,${encoded}"/></div>`;
  });
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><head><title>QR Codes</title><style>body{font-family:Arial,sans-serif;margin:20px;background:#fff}h1{text-align:center;margin-bottom:30px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{border:2px solid #333;border-radius:16px;padding:20px;text-align:center;break-inside:avoid}h2{margin:0 0 8px;font-size:22px}p{margin:0 0 12px;color:#666;font-size:10px;word-break:break-all}img{width:160px;height:160px}</style></head><body><h1>QR Codes - Toutes les tables</h1><div class="grid">${cards}</div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
  win.document.close();
}

function QRModal({ table, onClose }: { table: Table; onClose: () => void }) {
  const url = getQrUrl(table);
  const downloadSVG = () => {
    const svg = document.getElementById(`qr-modal-${table.id}`);
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `table-${table.number}-qr.svg`; a.click();
    URL.revokeObjectURL(u);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xs text-center">
        <h3 className="font-semibold text-foreground mb-1">Table {table.number}</h3>
        <p className="text-xs text-muted-foreground mb-4 break-all">{url}</p>
        <div className="inline-block p-3 bg-white rounded-xl mb-4">
          <QRCodeSVG id={`qr-modal-${table.id}`} value={url} size={180} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent">Fermer</button>
            <button onClick={downloadSVG} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">SVG</button>
          </div>
          <button onClick={() => exportSinglePDF(table)} className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:opacity-90">Exporter PDF</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTables() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [addNumber, setAddNumber] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { data: tables = [], isLoading } = useListTables({});
  const createMutation = useCreateTable();
  const updateMutation = useUpdateTable();
  const deleteMutation = useDeleteTable();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });

  const addTable = () => {
    const n = parseInt(addNumber);
    if (isNaN(n) || n < 1) { toast.error("Invalid table number"); return; }
    createMutation.mutate({ data: { number: n } }, { onSuccess: () => { invalidate(); setAddNumber(""); setShowAdd(false); toast.success(t("success")); }, onError: () => toast.error(t("error")) });
  };
  const toggleActive = (table: Table) => updateMutation.mutate({ id: table.id, data: { isActive: !table.isActive } }, { onSuccess: invalidate, onError: () => toast.error(t("error")) });
  const deleteTable = (id: number) => { if (!confirm("Delete this table?")) return; deleteMutation.mutate({ id }, { onSuccess: () => { invalidate(); toast.success(t("success")); }, onError: () => toast.error(t("error")) }); };

  return (
    <div className="p-6">
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {(tables as Table[]).map((table) => <QRCodeSVG key={table.id} id={`qr-all-${table.id}`} value={getQrUrl(table)} size={160} />)}
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("tables")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{(tables as Table[]).length} tables configured</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportAllPDF(tables as Table[])} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90">PDF tous les QR</button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">{t("addTable")}</button>
        </div>
      </div>
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
          <input type="number" min="1" value={addNumber} onChange={(e) => setAddNumber(e.target.value)} placeholder="Table number" className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <button onClick={addTable} disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60">{t("add")}</button>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent">{t("cancel")}</button>
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(tables as Table[]).map((table) => (
            <div key={table.id} className={`bg-card border border-border rounded-xl p-4 ${!table.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-foreground text-lg">#{table.number}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[(table as Table & { status?: string }).status ?? "free"] ?? ""}`}>{t((table as Table & { status?: string }).status ?? "free")}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${table.isActive ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>{table.isActive ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button onClick={() => setQrTable(table)} className="flex-1 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-accent">QR</button>
                <button onClick={() => toggleActive(table)} className="flex-1 py-1.5 border border-border text-muted-foreground rounded-lg text-xs font-medium hover:bg-accent">{table.isActive ? "Disable" : "Enable"}</button>
                <button onClick={() => deleteTable(table.id)} className="py-1.5 px-2 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/10">?</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {qrTable && <QRModal table={qrTable} onClose={() => setQrTable(null)} />}
    </div>
  );
}







