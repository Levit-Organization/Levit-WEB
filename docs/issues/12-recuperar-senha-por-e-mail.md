---
title: "[Auth] Recuperar senha por e-mail"
labels: ["backend", "frontend", "auth", "concluído"]
---

**Status:** Concluído no código, **sem commit e sem revisão do time**. Esta issue serve para revisar, abrir o PR e acompanhar.

## Contexto
"Esqueceu a senha?" levava a telas que chamavam rotas inexistentes (beco sem saída). As colunas no banco já existiam.

## O que foi feito
- `POST /auth/forgot-password`: resposta igual exista ou não a conta; e-mail com link válido por 60 min, de uso único.
- `POST /auth/reset-password`: troca a senha e invalida o link. Limite de tentativas.
- Textos das duas telas reescritos.

## Arquivos principais
- `api-backend/app/Services/AuthService.php`
- `api-backend/app/Controllers/AuthController.php`
- `api-backend/app/Services/Email/ModeloRedefinicaoSenha.php`
- `api-backend/app/Models/UsuarioModel.php`
- `client-frontend/src/pages/ForgotPassword.jsx`
- `client-frontend/src/pages/ResetPassword.jsx`

## Como testar
- [ ] Pedir recuperação para o seu e-mail, abrir o link, trocar a senha e entrar.
- [ ] Usar o mesmo link de novo: deve recusar.

## Atenção
- As sessões já abertas em outros aparelhos continuam válidas após trocar a senha.

## Para fechar esta issue
- [ ] Revisado pelo time
- [ ] PR aberto e aprovado
- [ ] Testado em homologação
