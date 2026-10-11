import { lazy } from 'react';

// Cada página vira um chunk próprio: quem entra pela Landing não baixa o
// Kanban, e vice-versa. `loaders` também serve para pré-carregar no hover.
const loaders = {
  Landing: () => import('../pages/Landing'),
  Sobre: () => import('../pages/Sobre'),
  Login: () => import('../pages/Login'),
  Register: () => import('../pages/Register'),
  ForgotPassword: () => import('../pages/ForgotPassword'),
  ResetPassword: () => import('../pages/ResetPassword'),
  AceitarConvite: () => import('../pages/AceitarConvite'),
  Dashboard: () => import('../pages/Dashboard'),
  Modules: () => import('../pages/Modules'),
  ModuleForm: () => import('../pages/ModuleForm'),
  ModuleRecords: () => import('../pages/ModuleRecords'),
  RecrutamentoKanban: () => import('../pages/RecrutamentoKanban'),
  FinancialModule: () => import('../pages/FinancialModule'),
  TeamManagementContainer: () => import('../pages/TeamManagementContainer'),
  AutomacoesContainer: () => import('../pages/AutomacoesContainer'),
  AutomacaoForm: () => import('../pages/AutomacaoForm'),
  Configuracoes: () => import('../pages/Configuracoes'),
  Relatorios: () => import('../pages/Relatorios'),
  NotFound: () => import('../pages/NotFound'),
};

export const pages = Object.fromEntries(Object.entries(loaders).map(([name, load]) => [name, lazy(load)]));

const preloadPorRota = {
  '/dashboard': 'Dashboard',
  '/recrutamento': 'RecrutamentoKanban',
  '/team': 'TeamManagementContainer',
  '/modulos': 'Modules',
  '/automacoes': 'AutomacoesContainer',
  '/configuracoes': 'Configuracoes',
  '/relatorios': 'Relatorios',
};

/** Começa a baixar o chunk da rota (ex.: ao passar o mouse no item do menu). */
export function preloadRoute(path) {
  const name = preloadPorRota[path];
  if (name) loaders[name]();
}
