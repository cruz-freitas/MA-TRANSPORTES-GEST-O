import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Plus, Phone, CreditCard } from "lucide-react";

const Motoristas = () => {
  const { empresaId } = useAuth();
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", cnh: "", telefone: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const fetchMotoristas = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("motoristas").select("*").eq("empresa_id", empresaId).order("nome");
    setMotoristas(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMotoristas(); }, [empresaId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setSaving(true);

    // Create auth user first, then motorista record
    // Note: In production, this should be done via edge function with service_role
    // For now, we just create the motorista record (admin will need to create auth users separately)
    await supabase.from("motoristas").insert({
      empresa_id: empresaId,
      nome: form.nome,
      cnh: form.cnh,
      telefone: form.telefone,
    });

    setForm({ nome: "", cnh: "", telefone: "", email: "", password: "" });
    setShowForm(false);
    setSaving(false);
    fetchMotoristas();
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
          <h1 className="text-2xl font-bold">Motoristas</h1>
          <p className="text-muted-foreground">{motoristas.length} cadastrados</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Novo Motorista
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
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">CNH</label>
              <input
                type="text"
                value={form.cnh}
                onChange={(e) => setForm((f) => ({ ...f, cnh: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition text-sm disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {motoristas.map((m) => (
          <div key={m.id} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${m.ativo ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {m.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
            <h3 className="font-semibold">{m.nome}</h3>
            {m.telefone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" /> {m.telefone}
              </p>
            )}
            {m.cnh && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <CreditCard className="w-3 h-3" /> CNH: {m.cnh}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Motoristas;
