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
