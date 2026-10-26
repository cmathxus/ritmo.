# Verificações realizadas

- Build TypeScript/Vite e cinco testes de domínio aprovados.
- Novo schema validado em PostgreSQL embarcado (PGlite): cadastro aberto, diário pessoal privado, convite conectando duas contas, bloqueio de terceiro integrante, isolamento de terceiros, escrita apenas pelo dono e bloqueio de anônimos.
- Conexão ao Postgres real validada com TLS, CA e hostname verificados. Banco inicialmente sem tabelas públicas nem usuários.
- Schema instalado no projeto Supabase: duos, profiles, daily_logs e meals; RLS ativa nas quatro tabelas.
- API Auth respondeu HTTP 200, com cadastro e provedor Email habilitados. Confirmação de e-mail está ativa.
- API de perfis rejeitou acesso anônimo com HTTP 401 (42501).
- Nenhuma conta real ou refeição fictícia foi persistida no projeto do usuário para testes.

Limite: envio/recebimento de e-mail, URL de confirmação e recuperação dependem da configuração de Auth no painel do Supabase. A chave pública não autoriza alterar essas configurações. O funcionamento de contas reais precisa ser verificado após esse ajuste.
