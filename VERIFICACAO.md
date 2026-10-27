# Verificações realizadas

- Build TypeScript/Vite e oito testes de domínio aprovados.
- Novo schema validado em PostgreSQL embarcado (PGlite): cadastro aberto, diário pessoal privado, convite conectando duas contas, bloqueio de terceiro integrante, isolamento de terceiros, escrita apenas pelo dono e bloqueio de anônimos.
- Conexão ao Postgres real validada com TLS, CA e hostname verificados. Banco inicialmente sem tabelas públicas nem usuários.
- Schema instalado no projeto Supabase: duos, profiles, daily_logs e meals; RLS ativa nas quatro tabelas.
- API Auth respondeu HTTP 200, com cadastro e provedor Email habilitados. Confirmação de e-mail foi desativada pelo usuário e confirmada pela API.
- API de perfis rejeitou acesso anônimo com HTTP 401 (42501).
- Nenhuma conta real ou refeição fictícia foi persistida no projeto do usuário para testes.

Limite: envio/recebimento de e-mail, URL de confirmação e recuperação dependem da configuração de Auth no painel do Supabase. A chave pública não autoriza alterar essas configurações. O funcionamento de contas reais precisa ser verificado após esse ajuste.

## Revisão de interface

- Calendário próprio: seleção de data, virada de mês por teclado, seleção de mês/ano, retorno do foco com Escape e bloqueio de datas futuras verificados no navegador.
- Calendário reposicionado automaticamente para caber na altura da tela.
- CSS respeita prefers-reduced-motion e animações usam principalmente opacity/transform.
- Números respeitam movimento reduzido; SDK Supabase e React separados em arquivos com cache independente.
- Navegação por data preserva o painel enquanto a consulta atualiza.
- Revisão em iframe de 360px e 320px; rolagem horizontal corrigida nos cartões e gráfico. Ajustado tamanho do anel em telas pequenas.

## Atualização de foto, saída e TMB — 26/10/2026

- 21 testes Node aprovados: calendário/domínio, autenticação e validação do handler de IA, CORS, limites, respostas estruturadas, falhas/timeout e cálculos Unimed masculino/feminino.
- PGlite: quota protegida e transacional; 20/dia por usuário, 100 global, cooldown e idempotência. Perfil metabólico com RLS exclusiva do dono, RPC com recálculo, validação e modo manual.
- Migrações aplicadas no Supabase com TLS e CA verificada. Bases antigas preservadas como manuais; nenhuma antropometria inventada.
- Build TypeScript/Vite aprovado. UI local: confirmação de saída/cancelar; opção por foto; TMB 75kg, 175cm, 28anos masculino moderado = 1778 basal / 2400 diária; salvamento em demonstração.

- Teste real autenticado com conta temporária: GET da função retornou disponível; OpenAI recusou a análise com HTTP 429 (AI_RATE_LIMIT). Não houve resultado nutricional real validado. Conta temporária removida, sem gravar refeições. Tratamento de erro e registro manual disponíveis.

## Correção do primeiro acesso
25 testes aprovados, incluindo novas contas, base manual importada, conclusão explícita e troca de conta. Teste PGlite confirma persistência da conclusão via RPC. Migração adiciona sinalizador sem alterar a base ou o histórico. Diagnóstico de 429 agora distingue saldo, orçamento e frequência conforme documentação atual da OpenAI.

- Teste de navegador com cadastro real temporário no Supabase: primeiro acesso exibiu formulário automaticamente, cálculo 1778/2400 confirmado; integração migrada para Gemini 3.5 Flash-Lite, com chave server-side, foto inline, schema e limite sem fallback OpenAI. 26 testes aprovados. Ativação e inferência real aguardam GEMINI_API_KEY.
