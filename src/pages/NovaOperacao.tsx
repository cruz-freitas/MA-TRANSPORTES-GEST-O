import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Package, PenTool, Camera, Check, ChevronRight, ChevronLeft, Store } from "lucide-react";

const STEPS = ["Loja", "Carga", "GPS", "Assinaturas", "Confirmar"];

const NovaOperacao = () => {
  const { empresaId, motoristaId, role } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lojas, setLojas] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [searchLoja, setSearchLoja] = useState("");

  // Form state
  const [form, setForm] = useState({
    loja_id: "",
    loja_nome: "",
    motorista_id: motoristaId || "",
    tipo_operacao: "coleta" as "coleta" | "entrega",
    tipo_volume: "",
    quantidade: 1,
    valor_unitario: 0,
    observacoes: "",
  });

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const canvasMotoristaRef = useRef<HTMLCanvasElement>(null);
  const canvasResponsavelRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);

  const valorTotal = form.quantidade * form.valor_unitario;

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("lojas").select("*").eq("empresa_id", empresaId).eq("ativa", true)
      .then(({ data }) => setLojas(data || []));

    if (role === "admin") {
      supabase.from("motoristas").select("*").eq("empresa_id", empresaId).eq("ativo", true)
        .then(({ data }) => setMotoristas(data || []));
    }
  }, [empresaId, role]);

  useEffect(() => {
    if (motoristaId) setForm((f) => ({ ...f, motorista_id: motoristaId }));
  }, [motoristaId]);

  // GPS
  useEffect(() => {
    if (step === 2 && !coords) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGpsError("Não foi possível obter localização. Habilite o GPS.")
      );
    }
  }, [step, coords]);

  // Canvas drawing
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    setIsDrawing(true);
    setActiveCanvas(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeCanvas) return;
    const ctx = activeCanvas.getContext("2d");
    if (!ctx) return;
    const rect = activeCanvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(175, 70%, 45%)";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, activeCanvas]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    setActiveCanvas(null);
  }, []);

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const selectLoja = (loja: any) => {
    setForm((f) => ({
      ...f,
      loja_id: loja.id,
      loja_nome: loja.nome,
      valor_unitario: loja.valor_padrao || 0,
    }));
    setSearchLoja(loja.nome);
  };

  const handleSubmit = async () => {
    if (!empresaId || !form.motorista_id || !form.loja_id) return;
    setLoading(true);

    try {
      // Upload signatures
      let assinaturaMotoristaUrl: string | null = null;
      let assinaturaResponsavelUrl: string | null = null;

      if (canvasMotoristaRef.current) {
        const blob = await new Promise<Blob | null>((res) => canvasMotoristaRef.current!.toBlob(res));
        if (blob) {
          const path = `${empresaId}/${Date.now()}_motorista.png`;
          await supabase.storage.from("assinaturas").upload(path, blob);
          assinaturaMotoristaUrl = path;
        }
      }
      if (canvasResponsavelRef.current) {
        const blob = await new Promise<Blob | null>((res) => canvasResponsavelRef.current!.toBlob(res));
        if (blob) {
          const path = `${empresaId}/${Date.now()}_responsavel.png`;
          await supabase.storage.from("assinaturas").upload(path, blob);
          assinaturaResponsavelUrl = path;
        }
      }

      // Generate hash
      const hashInput = `${form.loja_id}|${form.motorista_id}|${valorTotal}|${new Date().toISOString()}|${coords?.lat}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(hashInput);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("registros_transporte").insert({
        empresa_id: empresaId,
        motorista_id: form.motorista_id,
        loja_id: form.loja_id,
        tipo_operacao: form.tipo_operacao,
        tipo_volume: form.tipo_volume,
        quantidade: form.quantidade,
        valor_unitario: form.valor_unitario,
        valor_total: valorTotal,
        valor_final: valorTotal,
        latitude: coords?.lat,
        longitude: coords?.lng,
        assinatura_motorista_url: assinaturaMotoristaUrl,
        assinatura_responsavel_url: assinaturaResponsavelUrl,
        hash_registro: hashHex,
        status_registro: "finalizado",
        observacoes: form.observacoes,
      });

      if (error) throw error;
      navigate("/historico");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLojas = lojas.filter((l) =>
    l.nome.toLowerCase().includes(searchLoja.toLowerCase())
  );

  const canNext = () => {
    if (step === 0) return !!form.loja_id;
    if (step === 1) return form.quantidade > 0 && form.valor_unitario >= 0 && (role === "admin" ? !!form.motorista_id : true);
    if (step === 2) return !!coords;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Nova Operação</h1>
        <p className="text-muted-foreground">Registrar coleta ou entrega</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        {/* Step 0: Loja */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Selecionar Loja</h2>
            </div>
            <input
              type="text"
              placeholder="Buscar loja..."
              value={searchLoja}
              onChange={(e) => setSearchLoja(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredLojas.map((loja) => (
                <button
                  key={loja.id}
                  onClick={() => selectLoja(loja)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition ${
                    form.loja_id === loja.id ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                  }`}
                >
                  <div className="font-medium">{loja.nome}</div>
                  {loja.endereco && <div className="text-xs text-muted-foreground">{loja.endereco}</div>}
                  <div className="text-xs text-primary mt-0.5">Valor padrão: R$ {loja.valor_padrao?.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Carga */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Dados da Carga</h2>
            </div>

            {role === "admin" && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Motorista</label>
                <select
                  value={form.motorista_id}
                  onChange={(e) => setForm((f) => ({ ...f, motorista_id: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione...</option>
                  {motoristas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Tipo</label>
                <select
                  value={form.tipo_operacao}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_operacao: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="coleta">Coleta</option>
                  <option value="entrega">Entrega</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Tipo Volume</label>
                <input
                  type="text"
                  value={form.tipo_volume}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_volume: e.target.value }))}
                  placeholder="Ex: Caixas"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={form.quantidade}
                  onChange={(e) => setForm((f) => ({ ...f, quantidade: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Valor Unitário</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.valor_unitario}
                  onChange={(e) => setForm((f) => ({ ...f, valor_unitario: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <p className="text-2xl font-bold text-primary">R$ {valorTotal.toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Opcional..."
              />
            </div>
          </div>
        )}

        {/* Step 2: GPS */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Localização GPS</h2>
            </div>

            {coords ? (
              <div className="bg-success/5 border border-success/20 rounded-xl p-6 text-center">
                <MapPin className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="font-semibold text-success">Localização capturada</p>
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </p>
              </div>
            ) : gpsError ? (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
                <p className="text-destructive">{gpsError}</p>
                <button
                  onClick={() => {
                    setGpsError("");
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                      () => setGpsError("GPS indisponível")
                    );
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm hover:bg-border transition"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-muted-foreground">Obtendo localização...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Assinaturas */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Assinaturas</h2>
            </div>

            {[
              { label: "Assinatura do Motorista", ref: canvasMotoristaRef },
              { label: "Assinatura do Responsável", ref: canvasResponsavelRef },
            ].map((sig) => (
              <div key={sig.label}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">{sig.label}</label>
                  <button
                    onClick={() => clearCanvas(sig.ref.current)}
                    className="text-xs text-muted-foreground hover:text-destructive transition"
                  >
                    Limpar
                  </button>
                </div>
                <canvas
                  ref={sig.ref}
                  width={500}
                  height={150}
                  className="w-full border border-border rounded-xl bg-secondary/50 touch-none cursor-crosshair"
                  onMouseDown={(e) => sig.ref.current && startDraw(e, sig.ref.current)}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={(e) => sig.ref.current && startDraw(e, sig.ref.current)}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Confirmar */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Confirmar Operação</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Loja</span>
                <span className="font-medium">{form.loja_nome}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium capitalize">{form.tipo_operacao}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Quantidade</span>
                <span className="font-medium">{form.quantidade} {form.tipo_volume}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Valor Unitário</span>
                <span className="font-medium">R$ {form.valor_unitario.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">GPS</span>
                <span className="font-mono text-xs">{coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-3 bg-primary/5 rounded-xl px-4 -mx-1">
                <span className="font-semibold">Valor Total</span>
                <span className="font-bold text-primary text-lg">R$ {valorTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-border transition disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-30"
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50 animate-pulse-glow"
          >
            {loading ? "Salvando..." : "Finalizar Operação"}
          </button>
        )}
      </div>
    </div>
  );
};


export default NovaOperacao;
