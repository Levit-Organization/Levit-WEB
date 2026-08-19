import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { recrutamentoService } from '../services/recrutamentoService';

export default function RecrutamentoKanban() {
  const [kanbanData, setKanbanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    fetchKanban();
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

  const handleDragStart = (e, item, sourceColumn) => {
    setDraggedItem({ item, sourceColumn });
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const { item, sourceColumn } = draggedItem;
    if (sourceColumn === targetColumnId) {
      setDraggedItem(null);
      return;
    }
    
    // Optimistic update
    const newKanban = { ...kanbanData };
    
    // Remove from source
    newKanban[sourceColumn].candidatos = newKanban[sourceColumn].candidatos.filter(c => c.id !== item.id);
    newKanban[sourceColumn].total--;
    
    // Add to target
    const updatedItem = { ...item, dados: { ...item.dados, _fase_atual: targetColumnId } };
    newKanban[targetColumnId].candidatos.push(updatedItem);
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

  // Helper to extract a primary title from dynamic fields
  const getPrimaryTitle = (dados) => {
    const commonNames = ['Nome', 'nome', 'Título', 'titulo', 'Candidato'];
    for (let key of commonNames) {
      if (dados[key]) return String(dados[key]);
    }
    // Fallback to the first non-hidden key
    const firstKey = Object.keys(dados).find(k => !k.startsWith('_'));
    return firstKey ? String(dados[firstKey]) : 'Registro sem nome';
  };

  return (
    <Layout>
      <div className="flex min-h-0 flex-1 flex-col bg-slate-50/50 p-6 font-sans">
        
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
              className="group flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow-md"
            >
              <span className="material-icons text-[18px] text-slate-400 group-hover:text-slate-600 transition-colors">restart_alt</span>
              Restaurar Padrões
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="material-icons text-[18px]">add</span>
              Nova Etapa
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
              <select className="appearance-none rounded-xl bg-white py-2 pl-4 pr-10 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500">
                <option value="all">Todas as vagas disponíveis</option>
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
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="h-full overflow-x-auto pb-4 scrollbar-hide">
              <div className="flex h-full min-w-max gap-6 px-1">
                
                {kanbanData && Object.entries(kanbanData).map(([colId, colData]) => (
                  <div 
                    key={colId} 
                    className="flex h-full w-[320px] flex-col rounded-2xl bg-slate-100/50 p-2 ring-1 ring-slate-200"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, colId)}
                  >
                    
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
                          className="group cursor-grab rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg active:cursor-grabbing"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {getPrimaryTitle(item.dados)}
                              </h4>
                              
                              {/* Mostra os campos dinâmicos de forma compacta e elegante */}
                              <div className="mt-2 space-y-1">
                                {Object.entries(item.dados)
                                  .filter(([k]) => !k.startsWith('_') && k.toLowerCase() !== 'nome')
                                  .map(([k, v]) => (
                                  <div key={k} className="text-xs text-slate-500 truncate">
                                    <span className="font-medium text-slate-400">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : v}
                                  </div>
                                ))}
                              </div>
                              
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-500">
                              <span className="material-icons text-[16px]">drag_indicator</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 truncate max-w-[150px]">
                              <span className="material-icons text-[14px]">work</span>
                              {item.vaga}
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
                ))}
                
              </div>
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
