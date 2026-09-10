@echo off
REM ============================================================
REM Testar Issues 1, 2 e 3 (equipe/cargos) via curl - cmd do Windows
REM Requisitos: servidor rodando (php spark serve) e migrations
REM aplicadas. Script autocontido - usa e-mails proprios, nao
REM depende de ter rodado outros scripts antes.
REM
REM Recomendado: abra o cmd manualmente (nao de duplo clique) e
REM rode a partir dele. Resultados tambem ficam salvos em
REM resultado_issues_123.txt, na mesma pasta deste script.
REM ============================================================

set BASE_URL=http://localhost:8080/api/v1
set LOG=resultado_issues_123.txt

if exist %LOG% del %LOG%
echo Resultado dos testes - Issues 1/2/3 - %date% %time% > %LOG%
echo. >> %LOG%

echo ================================================================
echo TESTE 1 - Cadastro do fundador (empresa de teste isolada)
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/auth/registrar -H "Content-Type: application/json" -d "{\"nome\":\"Admin Issues\",\"email\":\"admin.issues193@levit.app\",\"senha\":\"senha1234\",\"cnpj_cpf\":\"11152233344\",\"nome_empresa\":\"Empresa Issues Teste\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 2 - Login do fundador
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin.issues193@levit.app\",\"senha\":\"senha1234\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p TOKEN_ADMIN=Copie o "token" da resposta acima e cole aqui: 

echo ================================================================
echo TESTE 3 - Criar cargo "Suporte"
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/cargos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Suporte\",\"permissoes\":[\"visualizar_equipe\"]}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p CARGO_SUPORTE_ID=Copie o "id" do cargo Suporte e cole aqui: 

echo ================================================================
echo TESTE 4 [ISSUE 2] - Atualizar cargo Suporte (renomear + permissoes)
echo Esperado: HTTP 200, nome = "Suporte N1"
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X PUT %BASE_URL%/cargos/%CARGO_SUPORTE_ID% -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Suporte N1\",\"permissoes\":[\"visualizar_equipe\",\"gerenciar_equipe\"]}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 5 - Criar segundo cargo "Financeiro" (para testar colisao)
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/cargos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Financeiro\",\"permissoes\":[]}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p CARGO_FINANCEIRO_ID=Copie o "id" do cargo Financeiro e cole aqui: 

echo ================================================================
echo TESTE 6 [ISSUE 2] - Atualizar Suporte N1 com nome duplicado (Financeiro)
echo Esperado: HTTP 422 - "Ja existe um cargo com esse nome nesta empresa."
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X PUT %BASE_URL%/cargos/%CARGO_SUPORTE_ID% -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Financeiro\",\"permissoes\":[]}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 7 - Convidar colega para o cargo Suporte N1
echo Esperado: HTTP 201 com token de convite
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/equipe/convidar -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"email\":\"colega.issues123@levit.app\",\"cargo_id\":\"%CARGO_SUPORTE_ID%\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p CONVITE_TOKEN=Copie o "token" do convite e cole aqui: 

echo ================================================================
echo TESTE 8 - Colega aceita o convite
echo Esperado: HTTP 201. Copie tambem o "id" do usuario (dentro de "usuario")
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/publico/convite/aceitar -H "Content-Type: application/json" -d "{\"token\":\"%CONVITE_TOKEN%\",\"nome\":\"Colega Issues\",\"senha\":\"senha1234\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p COLEGA_ID=Copie o "id" do usuario colega e cole aqui: 

echo ================================================================
echo TESTE 9 [ISSUE 3] - Excluir cargo Suporte N1 (TEM membro vinculado)
echo Esperado: HTTP 422 - "Nao e possivel excluir um cargo que possui
echo membros vinculados."
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X DELETE %BASE_URL%/cargos/%CARGO_SUPORTE_ID% -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 10 [ISSUE 1] - Atualizar nome do colega
echo Esperado: HTTP 200, nome = "Colega Issues Editado"
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X PUT %BASE_URL%/equipe/%COLEGA_ID% -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Colega Issues Editado\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 11 [ISSUE 1] - Mover colega para o cargo Financeiro
echo Esperado: HTTP 200, cargo_nome = "Financeiro"
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X PUT %BASE_URL%/equipe/%COLEGA_ID% -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"cargo_id\":\"%CARGO_FINANCEIRO_ID%\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 12 [ISSUE 1] - Tentar mudar o cargo do PROPRIO fundador
echo (administrador principal) - regra de lockout
echo Esperado: HTTP 422 - "Nao e possivel alterar o cargo do
echo administrador principal da empresa."
echo Para isso preciso do id do fundador - pegue no TESTE 1 ou 2,
echo dentro do campo "usuario"."id" da resposta.
echo ================================================================
set /p ADMIN_ID=Cole aqui o id do usuario fundador (admin): 
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X PUT %BASE_URL%/equipe/%ADMIN_ID% -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"cargo_id\":\"%CARGO_FINANCEIRO_ID%\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 13 [ISSUE 1] - Remover colega da equipe (para liberar o cargo)
echo Esperado: HTTP 200
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X DELETE %BASE_URL%/equipe/%COLEGA_ID% -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 14 (ULTIMO TESTE) [ISSUE 3] - Excluir cargo Suporte N1
echo (agora SEM membros)
echo Esperado: HTTP 200
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X DELETE %BASE_URL%/cargos/%CARGO_SUPORTE_ID% -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%

del resposta_temp.txt >nul 2>nul

echo ================================================================
echo Testes finalizados. Resultado completo salvo em %LOG%
echo ================================================================
pause
