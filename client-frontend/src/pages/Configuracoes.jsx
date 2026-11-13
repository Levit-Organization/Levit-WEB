import { useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader, Tabs } from '../components/ui';
import PerfilTab from '../components/configuracoes/PerfilTab';
import EmpresaModulosTab from '../components/configuracoes/EmpresaModulosTab';
import AvancadoDadosTab from '../components/configuracoes/AvancadoDadosTab';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'empresa', label: 'Empresa e tabelas' },
  { id: 'avancado', label: 'Avançado e dados' },
];

export default function Configuracoes() {
  const [tab, setTab] = useState('perfil');

  return (
    <Layout>
      <PageHeader title="Configurações" />
      <Tabs abas={TABS} ativa={tab} onChange={setTab} label="Seções de configuração" />

      <div id={`painel-${tab}`} role="tabpanel" aria-labelledby={`aba-${tab}`} className="max-w-2xl w-full">
        {tab === 'perfil' && <PerfilTab />}
        {tab === 'empresa' && <EmpresaModulosTab />}
        {tab === 'avancado' && <AvancadoDadosTab />}
      </div>
    </Layout>
  );
}
