import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { recrutamentoService } from '../services/recrutamentoService';

const columns = [
  { id: 'triagem', title: 'Triagem' },
  { id: 'entrevista', title: 'Entrevista' },
  { id: 'teste tecnico', title: 'Teste Técnico' },
  { id: 'aprovado', title: 'Aprovado' }
];

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

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Recrutamento Kanban</h1>
          <p className="text-sm text-light-text mt-1">Gerencie os candidatos de todos os seus módulos de recrutamento.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex gap-6 h-[calc(100vh-200px)] overflow-x-auto pb-4">
          {columns.map(col => (
            <div 
              key={col.id} 
              className="flex-1 min-w-[280px] max-w-[320px] bg-gray-50 border border-divider rounded-xl flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-4 border-b border-divider flex items-center justify-between bg-white rounded-t-xl">
                <h3 className="font-semibold text-gray-800">{col.title}</h3>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                  {kanbanData?.[col.id]?.total || 0}
                </span>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {kanbanData?.[col.id]?.candidatos.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, col.id)}
                    className="bg-white p-4 border border-divider rounded-lg shadow-sm cursor-move hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <div className="text-xs text-primary font-medium mb-2 uppercase tracking-wide">
                      {item.vaga}
                    </div>
                    
                    <div className="space-y-1.5">
                      {Object.entries(item.dados).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                        <div key={k} className="text-sm">
                          <span className="text-light-text font-medium text-xs">{k}: </span>
                          <span className="text-gray-900">{typeof v === 'object' ? JSON.stringify(v) : v}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 text-[10px] text-gray-400">
                      Atualizado em {new Date(item.atualizado_em || item.criado_em).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                
                {kanbanData?.[col.id]?.candidatos.length === 0 && (
                  <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                    Nenhum candidato
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
