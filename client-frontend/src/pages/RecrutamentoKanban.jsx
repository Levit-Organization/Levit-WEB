import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { recrutamentoService } from '../services/recrutamentoService';
import { moduloService } from '../services/moduloService';
import api from '../services/api';

export default function RecrutamentoKanban() {
  const [kanbanData, setKanbanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [showNovaEtapa, setShowNovaEtapa] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [modulos, setModulos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);

  const scrollContainerRef = useRef(null);

  // Auto-scroll when dragging near edges
  const handleDragOverWithScroll = useCallback((e) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const edgeSize = 100; // pixels from edge to trigger scroll
    const scrollSpeed = 18;

    if (e.clientX - rect.left < edgeSize) {
      container.scrollLeft -= scrollSpeed;
    } else if (rect.right - e.clientX < edgeSize) {
      container.scrollLeft += scrollSpeed;
    }
  }, []);

  useEffect(() => {
    fetchKanban();
    fetchModulos();
  }, []);

  const fetchKanban = async () => {
    try {
      setLoading(true);
      const data = await recrutamentoService.getKanban();
      setKanbanData(data);
    } catch (err) {
      setError('Erro ao carregar o Kanban de recrutamento.');
    } finally {
      setLoading(false);
    }
  };

  const fetchModulos = async () => {
    try {
      const data = await moduloService.getAll();
      const recrutamento = data.filter(m => m.tipo === 'recrutamento');
      setModulos(recrutamento);
      if (recrutamento.length > 0 && filtroModulo === 'all') {
        setFiltroModulo(recrutamento[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar módulos:', err);
    }
  };

  const handleNovaEtapa = async () => {
    if (!novaEtapaNome.trim()) return;
    try {
      // Add phase to the first recruitment module (or selected one)
      const targetModulo = filtroModulo !== 'all' ? filtroModulo : modulos[0]?.id;
      if (!targetModulo) {
        alert('Nenhum módulo de recrutamento encontrado.');
        return;
      }
      await api.post(`/modulos/${targetModulo}/fases`, { nome: novaEtapaNome });
      setNovaEtapaNome('');
      setShowNovaEtapa(false);
      fetchKanban();
    } catch (err) {
      alert('Erro ao criar etapa.');
    }
  };

  const handleRestaurarPadroes = async () => {
    if (!window.confirm('Isso irá restaurar as etapas padrão (Triagem, Entrevista, Aprovado). Continuar?')) return;
    // Reload kanban data
    fetchKanban();
  };

  const handleDragStart = (e, item, sourceColumn) => {
    setDraggedItem({ item, sourceColumn });
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    handleDragOverWithScroll(e);
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const { item, sourceColumn } = draggedItem;
    if (sourceColumn === targetColumnId) {
      setDraggedItem(null);
      return;
    }
    
    // Optimistic update (deep copy to avoid state mutation)
    const newKanban = {};
    for (const [key, value] of Object.entries(kanbanData)) {
      newKanban[key] = {
        ...value,
        candidatos: [...value.candidatos],
      };
    }
    
    // Remove from source
    newKanban[sourceColumn].candidatos = newKanban[sourceColumn].candidatos.filter(c => c.id !== item.id);
    newKanban[sourceColumn].total--;
    
    // Add to target
    const updatedItem = { ...item, fase_atual_id: targetColumnId };
    newKanban[targetColumnId].candidatos = [...newKanban[targetColumnId].candidatos, updatedItem];
    newKanban[targetColumnId].total++;
    
    setKanbanData(newKanban);
    setDraggedItem(null);

    // Persist API call
    try {
      await recrutamentoService.moverFase(item.id, targetColumnId);
    } catch (err) {
      // Revert if error
      alert('Erro ao mover candidato.');
      fetchKanban();
    }
  };



  const [showNovoCandidato, setShowNovoCandidato] = useState(false);
  const [salvandoCandidato, setSalvandoCandidato] = useState(false);
  const [novoCandidatoDados, setNovoCandidatoDados] = useState({
    modulo_id: '',
    nome: '',
    email: '',
    telefone: '',
    cargo_desejado: '',
    mensagem: ''
  });

  const handleNovoCandidatoSubmit = async () => {
    if (!novoCandidatoDados.modulo_id || !novoCandidatoDados.nome || !novoCandidatoDados.email) {
      alert('Vaga, Nome e E-mail são obrigatórios!');
      return;
    }
    try {
      setSalvandoCandidato(true);
      await api.post(`/publico/candidatura/${novoCandidatoDados.modulo_id}`, novoCandidatoDados);
      setShowNovoCandidato(false);
      setNovoCandidatoDados({ modulo_id: '', nome: '', email: '', telefone: '', cargo_desejado: '', mensagem: '' });
      fetchKanban();
    } catch (err) {
      alert('Erro ao salvar candidato.');
    } finally {
      setSalvandoCandidato(false);
    }
  };

  return (
    <Layout noPadding>
      <div className="flex min-h-0 flex-1 flex-col bg-slate-50/50 p-6 font-sans h-full overflow-hidden">
        
        {/* Cabeçalho Premium */}
        <header className="mb-8 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Recrutamento
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Gerencie talentos e acompanhe o funil de contratações com fluidez.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRestaurarPadroes}
              className="group flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow-md"
            >
              <span className="material-icons text-[18px] text-slate-400 group-hover:text-slate-600 transition-colors">restart_alt</span>
              Restaurar Padrões
            </button>
            <button
              type="button"
              onClick={() => setShowNovaEtapa(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow-md"
            >
              <span className="material-icons text-[18px] text-slate-400">add</span>
              Nova Etapa
            </button>
            <button
              type="button"
              onClick={() => setShowNovoCandidato(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="material-icons text-[18px]">person_add</span>
              Novo Candidato
            </button>
          </div>
        </header>

        {/* Barra de Controles Glassmorphism */}
        <section className="mb-6 flex shrink-0 flex-col gap-4 rounded-2xl bg-white/70 px-5 py-4 backdrop-blur-md shadow-sm ring-1 ring-slate-200/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <span className="material-icons text-[18px]">work_outline</span>
            </div>
            <span className="text-sm font-bold text-slate-800">
              Visão Geral das Vagas
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <select 
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="appearance-none rounded-xl bg-white py-2 pl-4 pr-10 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500"
              >
                {modulos.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
              <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[20px]">
                expand_more
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
            <span className="material-icons">error</span>
            {error}
          </div>
        )}

        {/* Área do Kanban */}
        <section className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full overflow-x-auto pb-4">
              <div className="flex h-full min-w-max gap-6 px-1 items-start">
                {[1, 2, 3].map((skeleton) => (
                  <div key={skeleton} className="flex w-[320px] flex-col rounded-2xl bg-slate-200/70 p-3 ring-1 ring-slate-300 shadow-md animate-pulse">
                    {/* Skeleton header */}
                    <div className="mb-3 flex items-center justify-between px-3 pt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                        <div className="h-4 w-20 bg-slate-300 rounded"></div>
                      </div>
                      <div className="h-6 w-6 bg-white rounded-full"></div>
                    </div>
                    {/* Skeleton cards */}
                    {[1, 2, 3].map((card) => (
                      <div key={card} className="mb-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                            <div className="h-3 w-24 bg-slate-100 rounded mb-1"></div>
                            <div className="h-3 w-28 bg-slate-100 rounded"></div>
                          </div>
                          <div className="h-8 w-8 bg-slate-100 rounded-full"></div>
                        </div>
                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                          <div className="h-5 w-20 bg-slate-100 rounded-lg"></div>
                          <div className="h-3 w-16 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div ref={scrollContainerRef} className="h-full overflow-x-auto pb-4 scrollbar-hide" onDragOver={handleDragOver}>
              <div className="flex h-full min-w-max gap-6 px-1 items-start">
                
                {kanbanData && Object.entries(kanbanData).map(([colId, colData]) => (
                  <div 
                    key={colId}
                    className="h-full w-[320px] shrink-0"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, colId)}
                  >
                    {/* Coluna visual — tamanho dos cards */}
                    <div className="flex max-h-full flex-col rounded-2xl bg-slate-200/70 p-3 ring-1 ring-slate-300 shadow-md">
                    
                      {/* Header da Coluna */}
                      <div className="mb-3 flex items-center justify-between px-3 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                            {colId}
                          </h3>
                        </div>
                        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-slate-600 shadow-sm">
                          {colData.total || 0}
                        </span>
                      </div>

                      {/* Área de Cards */}
                      <div className="flex-1 space-y-3 overflow-y-auto px-1 pb-2">
                        
                        {colData.candidatos.map(item => (
                          <article 
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item, colId)}
                            onClick={() => setSelectedCard({ ...item, colId })}
                            className="group cursor-grab rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg active:cursor-grabbing"
                          >
                            {/* 3 campos principais (Candidato tabela real) */}
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {item.nome || 'Sem nome'}
                            </h4>
                            <div className="mt-2 space-y-1">
                              <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                                <span className="material-icons text-[13px] text-slate-400">call</span>
                                {item.telefone || item.email || '—'}
                              </div>
                              <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                                <span className="material-icons text-[13px] text-slate-400">flag</span>
                                {item.cargo_desejado || '—'}
                              </div>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 truncate max-w-[150px]">
                                <span className="material-icons text-[14px]">work</span>
                                {item.vaga || '—'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {new Date(item.atualizado_em || item.criado_em).toLocaleDateString()}
                              </div>
                            </div>
                          </article>
                        ))}

                        {colData.candidatos.length === 0 && (
                          <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
                            Nenhum registro
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
              </div>
            </div>
          )}
        </section>

        {showNovaEtapa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowNovaEtapa(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Nova Etapa</h3>
              <input
                type="text"
                value={novaEtapaNome}
                onChange={(e) => setNovaEtapaNome(e.target.value)}
                placeholder="Nome da etapa"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNovaEtapa(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNovaEtapa}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Criar Etapa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalhes do Card */}
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop com blur */}
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
              onClick={() => setSelectedCard(null)}
            ></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 truncate pr-4">
                  {selectedCard.nome || 'Detalhes do Registro'}
                </h3>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <span className="material-icons text-[20px]">close</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 mb-4">
                  <span className="material-icons text-[14px]">view_kanban</span>
                  Fase atual: {selectedCard.colId}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { key: 'Nome', value: selectedCard.nome },
                    { key: 'Email', value: selectedCard.email },
                    { key: 'Telefone', value: selectedCard.telefone },
                    { key: 'Cargo Desejado', value: selectedCard.cargo_desejado },
                    { key: 'Mensagem', value: selectedCard.mensagem }
                  ].map((field) => (
                    <div key={field.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        {field.key}
                      </span>
                      <span className="block text-sm font-medium text-slate-900 whitespace-pre-wrap break-words">
                        {field.value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="truncate max-w-[60%]">Vaga: <strong className="text-slate-700">{selectedCard.vaga || '—'}</strong></span>
                <span className="shrink-0">Atualizado: {new Date(selectedCard.atualizado_em || selectedCard.criado_em).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Novo Candidato */}
        {showNovoCandidato && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowNovoCandidato(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-slate-900">Novo Candidato</h3>
                <button onClick={() => setShowNovoCandidato(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-icons">close</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Vaga (Módulo) *</label>
                  <select 
                    value={novoCandidatoDados.modulo_id}
                    onChange={(e) => setNovoCandidatoDados({...novoCandidatoDados, modulo_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione uma vaga...</option>
                    {modulos.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome *</label>
                  <input type="text" value={novoCandidatoDados.nome} onChange={(e) => setNovoCandidatoDados({...novoCandidatoDados, nome: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">E-mail *</label>
                  <input type="email" value={novoCandidatoDados.email} onChange={(e) => setNovoCandidatoDados({...novoCandidatoDados, email: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                  <input type="text" value={novoCandidatoDados.telefone} onChange={(e) => setNovoCandidatoDados({...novoCandidatoDados, telefone: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cargo Desejado</label>
                  <input type="text" value={novoCandidatoDados.cargo_desejado} onChange={(e) => setNovoCandidatoDados({...novoCandidatoDados, cargo_desejado: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mensagem (Opcional)</label>
                  <textarea value={novoCandidatoDados.mensagem} onChange={(e) => setNovoCandidatoDados({...novoCandidatoDados, mensagem: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows="3"></textarea>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setShowNovoCandidato(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNovoCandidatoSubmit}
                  disabled={salvandoCandidato}
                  className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {salvandoCandidato ? 'Salvando...' : 'Adicionar Candidato'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
