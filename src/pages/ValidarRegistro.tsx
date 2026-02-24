import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Truck, MapPin, Hash } from "lucide-react";

const ValidarRegistro = () => {
  const { numero } = useParams<{ numero: string }>();
  const [registro, setRegistro] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!numero) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("registros_transporte")
        .select("*, lojas(nome, endereco), motoristas(nome)")
        .eq("numero_sequencial", parseInt(numero))
        .maybeSingle();

      if (data) {
        setRegistro(data);
        setValid(true);
      }
      setLoading(false);
    };
    fetch();
  }, [numero]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <Truck className="w-10 h-10 text-primary mx-auto mb-2" />
          <h1 className="text-xl font-bold gradient-text">Validação de Registro</h1>
        </div>

        <div className="glass rounded-2xl p-6">
          {valid && registro ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-xl p-4">
                <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
                <div>
                  <p className="font-semibold text-success">Registro Válido</p>
                  <p className="text-xs text-muted-foreground">Nº {registro.numero_sequencial}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Loja</span>
                  <span className="font-medium">{(registro.lojas as any)?.nome}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Motorista</span>
                  <span className="font-medium">{(registro.motoristas as any)?.nome}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium capitalize">{registro.tipo_operacao}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-primary">R$ {registro.valor_final?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">{new Date(registro.created_at).toLocaleString("pt-BR")}</span>
                </div>
                {registro.latitude && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS</span>
                    <span className="font-mono text-xs">{registro.latitude?.toFixed(4)}, {registro.longitude?.toFixed(4)}</span>
                  </div>
                )}
                {registro.hash_registro && (
                  <div className="py-2">
                    <span className="text-muted-foreground flex items-center gap-1 mb-1"><Hash className="w-3 h-3" /> Hash</span>
                    <p className="font-mono text-xs break-all text-muted-foreground">{registro.hash_registro}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <XCircle className="w-12 h-12 text-destructive" />
              <p className="font-semibold text-destructive">Registro Inválido</p>
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado com o número {numero}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidarRegistro;
