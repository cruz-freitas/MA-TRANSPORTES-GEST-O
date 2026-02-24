import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Truck, Store, DollarSign, Package } from "lucide-react";

interface Stats {
  totalMes: number;
  totalRegistros: number;
  totalLojas: number;
  totalMotoristas: number;
}

const Dashboard = () => {
  const { empresaId } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalMes: 0, totalRegistros: 0, totalLojas: 0, totalMotoristas: 0 });
  const [recentRegistros, setRecentRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;

    const fetchData = async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [registrosRes, lojasRes, motoristasRes, recentRes] = await Promise.all([
        supabase
          .from("registros_transporte")
          .select("valor_final")
          .eq("empresa_id", empresaId)
          .gte("created_at", firstDay)
          .eq("status_registro", "finalizado"),
        supabase.from("lojas").select("id").eq("empresa_id", empresaId).eq("ativa", true),
        supabase.from("motoristas").select("id").eq("empresa_id", empresaId).eq("ativo", true),
        supabase
          .from("registros_transporte")
          .select("*, lojas(nome), motoristas(nome)")
          .eq("empresa_id", empresaId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const totalMes = registrosRes.data?.reduce((sum, r) => sum + (r.valor_final || 0), 0) || 0;

      setStats({
        totalMes,
        totalRegistros: registrosRes.data?.length || 0,
        totalLojas: lojasRes.data?.length || 0,
        totalMotoristas: motoristasRes.data?.length || 0,
      });
      setRecentRegistros(recentRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [empresaId]);

  const statCards = [
    { label: "Faturamento do Mês", value: `R$ ${stats.totalMes.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
    { label: "Operações no Mês", value: stats.totalRegistros, icon: Package, color: "text-info" },
    { label: "Lojas Ativas", value: stats.totalLojas, icon: Store, color: "text-accent" },
    { label: "Motoristas Ativos", value: stats.totalMotoristas, icon: Truck, color: "text-success" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das operações</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Últimas Operações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-muted-foreground font-medium">#</th>
                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Loja</th>
                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Motorista</th>
                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Tipo</th>
                <th className="text-right px-6 py-3 text-muted-foreground font-medium">Valor</th>
                <th className="text-left px-6 py-3 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRegistros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhuma operação registrada
                  </td>
                </tr>
              ) : (
                recentRegistros.map((reg) => (
                  <tr key={reg.id} className="border-b border-border/50 hover:bg-secondary/30 transition">
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{reg.numero_sequencial}</td>
                    <td className="px-6 py-3">{(reg.lojas as any)?.nome}</td>
                    <td className="px-6 py-3">{(reg.motoristas as any)?.nome}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        reg.tipo_operacao === "coleta" ? "bg-info/10 text-info" : "bg-accent/10 text-accent"
                      }`}>
                        {reg.tipo_operacao}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono">R$ {reg.valor_final?.toFixed(2)}</td>
                    <td className="px-6 py-3">
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

export default Dashboard;
