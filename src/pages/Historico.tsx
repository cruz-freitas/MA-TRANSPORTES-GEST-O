import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { History as HistoryIcon, Search, Eye } from "lucide-react";

const Historico = () => {
  const { empresaId, motoristaId, role } = useAuth();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!empresaId) return;
    const fetchData = async () => {
      let query = supabase
        .from("registros_transporte")
        .select("*, lojas(nome), motoristas(nome)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (role === "motorista" && motoristaId) {
        query = query.eq("motorista_id", motoristaId);
      }

      const { data } = await query;
      setRegistros(data || []);
      setLoading(false);
    };
    fetchData();
  }, [empresaId, motoristaId, role]);

  const filtered = registros.filter((r) =>
    (r.lojas as any)?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    (r.motoristas as any)?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.numero_sequencial?.toString().includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-muted-foreground">{filtered.length} registros</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por loja, motorista ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">#</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Data</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Loja</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Motorista</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Veículo</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Tipo</th>
                <th className="text-right px-5 py-3 text-muted-foreground font-medium">Valor</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((reg) => (
                  <tr key={reg.id} className="border-b border-border/50 hover:bg-secondary/30 transition">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{reg.numero_sequencial}</td>
                    <td className="px-5 py-3 text-xs">
                      {new Date(reg.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">{(reg.lojas as any)?.nome}</td>
                    <td className="px-5 py-3">{(reg.motoristas as any)?.nome}</td>
                    <td className="px-5 py-3 font-mono text-xs">{reg.placa || "-"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        reg.tipo_operacao === "coleta" ? "bg-info/10 text-info" : "bg-accent/10 text-accent"
                      }`}>
                        {reg.tipo_operacao}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">R$ {reg.valor_final?.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        reg.status_registro === "finalizado" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>
                        {reg.status_registro}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Historico;
