import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Store as StoreIcon, Plus, MapPin } from "lucide-react";

const Lojas = () => {
  const { empresaId } = useAuth();
  const [lojas, setLojas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", endereco: "", valor_padrao: 0 });

  const fetchLojas = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("lojas").select("*").eq("empresa_id", empresaId).order("nome");
    setLojas(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLojas(); }, [empresaId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    await supabase.from("lojas").insert({
      empresa_id: empresaId,
      nome: form.nome,
      endereco: form.endereco,
      valor_padrao: form.valor_padrao,
    });
    setForm({ nome: "", endereco: "", valor_padrao: 0 });
    setShowForm(false);
    fetchLojas();
  };

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
          <h1 className="text-2xl font-bold">Lojas</h1>
          <p className="text-muted-foreground">{lojas.length} cadastradas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Nova Loja
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass rounded-2xl p-6 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Nome</label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Endereço</label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Valor Padrão (R$)</label>
              <input
                type="number"
                step={0.01}
                value={form.valor_padrao}
                onChange={(e) => setForm((f) => ({ ...f, valor_padrao: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition text-sm">
            Salvar
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lojas.map((loja) => (
          <div key={loja.id} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <StoreIcon className="w-5 h-5 text-accent" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${loja.ativa ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {loja.ativa ? "Ativa" : "Inativa"}
              </span>
            </div>
            <h3 className="font-semibold">{loja.nome}</h3>
            {loja.endereco && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {loja.endereco}
              </p>
            )}
            <p className="text-sm text-primary font-mono mt-2">R$ {loja.valor_padrao?.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lojas;
