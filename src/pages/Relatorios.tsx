import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Download, Filter } from "lucide-react";
import jsPDF from "jspdf";

interface Registro {
  id: string;
  numero_sequencial: number | null;
  created_at: string;
  tipo_operacao: string;
  valor_final: number | null;
  lojas: { nome?: string | null; endereco?: string | null } | null;
  motoristas: { nome?: string | null } | null;
}

const Relatorios = () => {
  const { empresaId, motoristaId, role } = useAuth();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<"" | "coleta" | "entrega">("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  useEffect(() => {
    if (!empresaId) return;

    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("registros_transporte")
        .select("*, lojas(nome, endereco), motoristas(nome)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      if (tipo) query = query.eq("tipo_operacao", tipo);
      if (inicio) query = query.gte("created_at", new Date(inicio).toISOString());
      if (fim) {
        const fimDate = new Date(fim);
        fimDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", fimDate.toISOString());
      }

      if (role === "motorista" && motoristaId) {
        query = query.eq("motorista_id", motoristaId);
      }

      const { data } = await query;
      setRegistros((data as any) || []);
      setLoading(false);
    };

    fetch();
  }, [empresaId, tipo, inicio, fim, motoristaId, role]);

  const gerarRelatorioPDF = () => {
    if (registros.length === 0) return;
    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text("Relatório de Operações", 14, 20);

    if (inicio || fim || tipo) {
      pdf.setFontSize(10);
      let filtro = "Filtros: ";
      if (inicio) filtro += `de ${inicio} `;
      if (fim) filtro += `até ${fim} `;
      if (tipo) filtro += `| tipo: ${tipo} `;
      pdf.text(filtro.trim(), 14, 26);
    }

    let y = 34;
    pdf.setFontSize(11);

    registros.forEach((r) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(`Nº: ${r.numero_sequencial ?? "-"}`, 14, y);
      pdf.text(`Data: ${new Date(r.created_at).toLocaleString("pt-BR")}`, 70, y);
      y += 6;

      pdf.text(`Loja: ${r.lojas?.nome ?? "-"}`, 14, y);
      y += 5;

      pdf.text(`Motorista: ${r.motoristas?.nome ?? "-"}`, 14, y);
      y += 5;

      pdf.text(`Tipo: ${r.tipo_operacao}`, 14, y);
      pdf.text(`Valor: R$ ${(r.valor_final ?? 0).toFixed(2)}`, 70, y);
      y += 6;

      pdf.line(14, y, 200, y);
      y += 6;
    });

    pdf.save("relatorio-operacoes.pdf");
  };

  const exportarCSV = () => {
    if (registros.length === 0) return;
    const header = [
      "numero",
      "data",
      "tipo",
      "loja_nome",
      "loja_endereco",
      "motorista",
      "valor_final",
    ];

    const linhas = registros.map((r) => [
      r.numero_sequencial ?? "",
      new Date(r.created_at).toISOString(),
      r.tipo_operacao,
      r.lojas?.nome ?? "",
      r.lojas?.endereco ?? "",
      r.motoristas?.nome ?? "",
      (r.valor_final ?? 0).toFixed(2),
    ]);

    const csv = [header, ...linhas]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "operacoes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground text-sm">
              Exporte operações de coleta e entrega por período.
            </p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Data inicial
            </label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Data final
            </label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm"
            >
              <option value="">Todos</option>
              <option value="coleta">Coleta</option>
              <option value="entrega">Entrega</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={gerarRelatorioPDF}
              disabled={loading || registros.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
            >
              <FileText className="w-3 h-3" />
              PDF
            </button>
            <button
              type="button"
              onClick={exportarCSV}
              disabled={loading || registros.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium border border-border disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          </div>
        </div>
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
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Tipo</th>
                <th className="text-right px-5 py-3 text-muted-foreground font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                registros.map((reg) => (
                  <tr key={reg.id} className="border-b border-border/50 hover:bg-secondary/30 transition">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {reg.numero_sequencial}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {new Date(reg.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">{reg.lojas?.nome}</td>
                    <td className="px-5 py-3">{reg.motoristas?.nome}</td>
                    <td className="px-5 py-3 capitalize">{reg.tipo_operacao}</td>
                    <td className="px-5 py-3 text-right font-mono">
                      R$ {(reg.valor_final ?? 0).toFixed(2)}
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

export default Relatorios;

