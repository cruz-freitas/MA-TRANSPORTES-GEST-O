import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Plus } from "lucide-react";

const Veiculos = () => {
  const { empresaId } = useAuth();
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ placa: "", descricao: "" });

  const fetchVeiculos = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("veiculos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("placa");
    setVeiculos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchVeiculos();
  }, [empresaId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const placa = form.placa.trim().toUpperCase();
    const descricao = form.descricao.trim();

    if (editingId) {
      await supabase
        .from("veiculos")
        .update({ placa, descricao })
        .eq("id", editingId)
        .eq("empresa_id", empresaId);
    } else {
      await supabase.from("veiculos").insert({
        empresa_id: empresaId,
        placa,
        descricao: descricao || null,
      });
    }

    setForm({ placa: "", descricao: "" });
    setEditingId(null);
    setShowForm(false);
    fetchVeiculos();
  };

  const handleEditClick = (v: any) => {
    setForm({ placa: v.placa ?? "", descricao: v.descricao ?? "" });
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!empresaId) return;
    if (!confirm("Tem certeza que deseja excluir este veículo?")) return;
    await supabase.from("veiculos").delete().eq("id", id).eq("empresa_id", empresaId);
    fetchVeiculos();
  };

  const handleToggleAtivo = async (v: any) => {
    if (!empresaId) return;
    await supabase
      .from("veiculos")
      .update({ ativo: !v.ativo })
      .eq("id", v.id)
      .eq("empresa_id", empresaId);
    fetchVeiculos();
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
          <h1 className="text-2xl font-bold">Frota</h1>
          <p className="text-muted-foreground">{veiculos.length} veículos cadastrados</p>
        </div>
        <button
          onClick={() => {
            if (!showForm) {
              setEditingId(null);
              setForm({ placa: "", descricao: "" });
            }
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Novo Veículo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="glass rounded-2xl p-6 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Placa</label>
              <input
                type="text"
                required
                value={form.placa}
                onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value }))}
                placeholder="ABC1D23"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Descrição (opcional)</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Caminhão baú / Fiorino / Van"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition text-sm"
            >
              {editingId ? "Atualizar" : "Salvar"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ placa: "", descricao: "" });
                  setShowForm(false);
                }}
                className="text-sm text-muted-foreground hover:text-destructive"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {veiculos.map((v) => (
          <div key={v.id} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleAtivo(v)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    v.ativo
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  }`}
                >
                  {v.ativo ? "Ativo" : "Inativo"}
                </button>
                <div className="flex gap-2 text-[11px]">
                  <button type="button" onClick={() => handleEditClick(v)} className="text-blue-500 hover:underline">
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDelete(v.id)} className="text-destructive hover:underline">
                    Excluir
                  </button>
                </div>
              </div>
            </div>

            <h3 className="font-semibold font-mono">{v.placa}</h3>
            {v.descricao && <p className="text-xs text-muted-foreground mt-1">{v.descricao}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Veiculos;

