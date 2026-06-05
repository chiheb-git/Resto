import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useListTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  getListTablesQueryKey,
} from "@workspace/api-client-react";
import type { Table } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const STATUS_COLORS: Record<string, string> = {
  free: "bg-green-500/20 text-green-400",
  occupied: "bg-red-500/20 text-red-400",
  waiting: "bg-amber-500/20 text-amber-400",
};

function QRModal({ table, onClose }: { table: Table; onClose: () => void }) {
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const url = `${origin}${base}/menu/${table.qrToken}`;

  const download = () => {
    const svg = document.getElementById(`qr-${table.id}`);
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-${table.number}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xs text-center">
        <h3 className="font-semibold text-foreground mb-1">Table {table.number}</h3>
        <p className="text-xs text-muted-foreground mb-4 break-all">{url}</p>
        <div className="inline-block p-3 bg-white rounded-xl mb-4">
          <QRCodeSVG id={`qr-${table.id}`} value={url} size={180} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent">
            Close
          </button>
          <button onClick={download}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
            Download SVG
          </button>
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
    createMutation.mutate({ data: { number: n } }, {
      onSuccess: () => { invalidate(); setAddNumber(""); setShowAdd(false); toast.success(t("success")); },
      onError: () => toast.error(t("error")),
    });
  };

  const toggleActive = (table: Table) => {
    updateMutation.mutate({ id: table.id, data: { isActive: !table.isActive } }, {
      onSuccess: invalidate,
      onError: () => toast.error(t("error")),
    });
  };

  const deleteTable = (id: number) => {
    if (!confirm("Delete this table?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { invalidate(); toast.success(t("success")); },
      onError: () => toast.error(t("error")),
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("tables")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{(tables as Table[]).length} tables configured</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">
          {t("addTable")}
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
          <input
            type="number"
            min="1"
            value={addNumber}
            onChange={(e) => setAddNumber(e.target.value)}
            placeholder="Table number"
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button onClick={addTable} disabled={createMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {t("add")}
          </button>
          <button onClick={() => setShowAdd(false)}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent">
            {t("cancel")}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(tables as Table[]).map((table) => (
            <div key={table.id} className={`bg-card border border-border rounded-xl p-4 ${!table.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-foreground text-lg">#{table.number}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[(table as Table & { status?: string }).status ?? "free"] ?? ""}`}>
                    {t((table as Table & { status?: string }).status ?? "free")}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${table.isActive ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {table.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex gap-1.5 mt-3">
                <button onClick={() => setQrTable(table)}
                  className="flex-1 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-accent">
                  QR
                </button>
                <button onClick={() => toggleActive(table)}
                  className="flex-1 py-1.5 border border-border text-muted-foreground rounded-lg text-xs font-medium hover:bg-accent">
                  {table.isActive ? "Disable" : "Enable"}
                </button>
                <button onClick={() => deleteTable(table.id)}
                  className="py-1.5 px-2 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/10">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrTable && <QRModal table={qrTable} onClose={() => setQrTable(null)} />}
    </div>
  );
}
