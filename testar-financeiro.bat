@echo off
REM ============================================================
REM Testar modulo Financeiro (categorias + lancamentos) via curl/cmd
REM Requisitos: migrations novas aplicadas (php spark migrate) antes
REM de rodar - CreateCategoriaFinanceiraTable e
REM CreateLancamentoFinanceiroTable.
REM
REM Recomendado: abra o cmd manualmente e rode a partir dele.
REM Resultado tambem salvo em resultado_financeiro.txt
REM ============================================================

set BASE_URL=http://localhost:8080/api/v1
set LOG=resultado_financeiro.txt

if exist %LOG% del %LOG%
echo Resultado dos testes - Modulo Financeiro - %date% %time% > %LOG%
echo. >> %LOG%

echo ================================================================
echo TESTE 1 - Cadastro do fundador (empresa isolada)
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/auth/registrar -H "Content-Type: application/json" -d "{\"nome\":\"Admin Financeiro\",\"email\":\"admin.financeiro192@levit.app\",\"senha\":\"senha1234\",\"cnpj_cpf\":\"22233345955\",\"nome_empresa\":\"Empresa Financeiro Teste\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p TOKEN_ADMIN=Copie o "token" da resposta acima e cole aqui: 

echo ================================================================
echo TESTE 2 - Criar modulo do tipo 'financeiro'
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/modulos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Fluxo de Caixa\",\"icone\":\"dinheiro\",\"tipo\":\"financeiro\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p MODULO_ID=Copie o "id" do modulo criado e cole aqui: 

echo ================================================================
echo TESTE 3 - Criar categoria "Fixo"
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/financeiro/categorias -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Fixo\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p CAT_FIXO_ID=Copie o "id" da categoria Fixo e cole aqui: 

echo ================================================================
echo TESTE 4 - Criar categoria "Receita"
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/financeiro/categorias -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Receita\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p CAT_RECEITA_ID=Copie o "id" da categoria Receita e cole aqui: 

echo ================================================================
echo TESTE 5 - Criar categoria duplicada "Fixo"
echo Esperado: HTTP 422 - "Ja existe uma categoria com esse nome..."
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/financeiro/categorias -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Fixo\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 6 - Adicionar campo personalizado ao modulo ("Forma de Pagamento")
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/modulos/%MODULO_ID%/campos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"nome\":\"Forma de Pagamento\",\"tipo\":\"texto\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
echo Procure dentro de "campos" o objeto com nome "Forma de Pagamento" e copie o "id" DELE (nao o id do modulo).
set /p CAMPO_ID=Cole aqui o id do campo Forma de Pagamento: 

echo ================================================================
echo TESTE 7 - Criar lancamento de ENTRADA (com campo extra preenchido)
echo Esperado: HTTP 201, campos_extras deve trazer o valor "Pix"
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/modulos/%MODULO_ID%/lancamentos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"descricao\":\"Recebimento Consultoria\",\"data\":\"2026-04-19\",\"tipo\":\"entrada\",\"valor\":5800,\"categoria_id\":\"%CAT_RECEITA_ID%\",\"campos_extras\":{\"%CAMPO_ID%\":\"Pix\"}}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p LANC1_ID=Copie o "id" desse lancamento e cole aqui: 

echo ================================================================
echo TESTE 8 - Criar lancamento de SAIDA
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/modulos/%MODULO_ID%/lancamentos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"descricao\":\"Tarifa Conectividade\",\"data\":\"2026-04-20\",\"tipo\":\"saida\",\"valor\":1900,\"categoria_id\":\"%CAT_FIXO_ID%\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p LANC2_ID=Copie o "id" desse lancamento e cole aqui: 

echo ================================================================
echo TESTE 9 - Lancamento com valor negativo
echo Esperado: HTTP 422 - "O valor precisa ser um numero maior que zero."
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/modulos/%MODULO_ID%/lancamentos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"descricao\":\"Invalido\",\"data\":\"2026-04-20\",\"tipo\":\"saida\",\"valor\":-100}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 10 - Lancamento com tipo invalido
echo Esperado: HTTP 422 - "Tipo de lancamento invalido..."
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/modulos/%MODULO_ID%/lancamentos -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"descricao\":\"Invalido\",\"data\":\"2026-04-20\",\"tipo\":\"transferencia\",\"valor\":100}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 11 - Listar lancamentos (sem filtro)
echo Esperado: resumo com total_entradas=5800, total_saidas=1900,
echo saldo_periodo=3900. saldo_acumulado: 5800 na 1a linha, 3900 na 2a.
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" %BASE_URL%/modulos/%MODULO_ID%/lancamentos -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 12 - Listar lancamentos filtrado por categoria "Fixo"
echo Esperado: so o lancamento de saida aparece. saldo_periodo = -1900
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" "%BASE_URL%/modulos/%MODULO_ID%/lancamentos?categoria_id=%CAT_FIXO_ID%" -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 13 - Marcar lancamento de saida como conciliado
echo Esperado: HTTP 200, conciliado = true
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X PUT %BASE_URL%/modulos/%MODULO_ID%/lancamentos/%LANC2_ID% -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN_ADMIN%" -d "{\"conciliado\":true}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 14 - Excluir categoria "Receita" (esta em uso pelo lancamento 1)
echo Esperado: HTTP 200 - NAO deve bloquear
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X DELETE %BASE_URL%/financeiro/categorias/%CAT_RECEITA_ID% -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 15 - Listar lancamentos de novo
echo Esperado: o lancamento 1 (Recebimento Consultoria) deve aparecer
echo com categoria_id e categoria_nome = null (confirma o ON DELETE SET NULL)
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" %BASE_URL%/modulos/%MODULO_ID%/lancamentos -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 16 - Excluir lancamento 1
echo Esperado: HTTP 200
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X DELETE %BASE_URL%/modulos/%MODULO_ID%/lancamentos/%LANC1_ID% -H "Authorization: Bearer %TOKEN_ADMIN%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 17 - Cadastro de uma SEGUNDA empresa (multi-tenancy)
echo Esperado: HTTP 201
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" -X POST %BASE_URL%/auth/registrar -H "Content-Type: application/json" -d "{\"nome\":\"Admin B\",\"email\":\"admin.financeirob983@levit.app\",\"senha\":\"senha1234\",\"cnpj_cpf\":\"99923877766\",\"nome_empresa\":\"Empresa Financeiro B\"}" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
echo.
set /p TOKEN_B=Copie o "token" da resposta acima (empresa B) e cole aqui: 

echo ================================================================
echo TESTE 18 [MULTI-TENANCY] - Empresa B tenta listar lancamentos
echo do modulo financeiro da empresa A
echo Esperado: HTTP 404 - "Modulo financeiro nao encontrado."
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" %BASE_URL%/modulos/%MODULO_ID%/lancamentos -H "Authorization: Bearer %TOKEN_B%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%
pause

echo ================================================================
echo TESTE 19 (ULTIMO TESTE) [MULTI-TENANCY] - Empresa B lista categorias
echo Esperado: HTTP 200 com lista VAZIA (nao ve as categorias da empresa A)
echo ================================================================
curl -s -w "\nHTTP Status: %%{http_code}\n\n" %BASE_URL%/financeiro/categorias -H "Authorization: Bearer %TOKEN_B%" > resposta_temp.txt
type resposta_temp.txt
type resposta_temp.txt >> %LOG%
echo ---------------------------------------------- >> %LOG%

del resposta_temp.txt >nul 2>nul

echo ================================================================
echo Testes finalizados. Resultado completo salvo em %LOG%
echo ================================================================
pause
