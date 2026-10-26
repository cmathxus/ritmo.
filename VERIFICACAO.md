# Verificações realizadas

- Build TypeScript + Vite de produção aprovado.
- Cinco testes automatizados de cálculos, validação numérica e transições de calendário aprovados (`npm test`).
- Schema executado em PostgreSQL embarcado (PGlite), com simulação do schema Auth e dos papéis `anon` e `authenticated` do Supabase.
- Dois e-mails autorizados puderam criar perfis; terceiro e-mail foi rejeitado pelo trigger.
- Ambos os usuários puderam ler os perfis e registros compartilhados.
- Atualização de refeições, exclusão de refeições e atualização de perfil de outra pessoa foram bloqueadas por RLS.
- Inserção de dia em nome de outra pessoa foi bloqueada.
- Acesso anônimo e leitura da allowlist pelo cliente foram bloqueados.
- Alteração da base nas preferências preservou a base do dia já registrado; tentativa de edição direta da base histórica foi bloqueada por privilégios de coluna.
- Remover o e-mail da lista revogou o acesso aos registros existentes.
- Prévia local respondeu HTTP 200.
- No navegador: inclusão e edição de refeição atualizaram consumo, saldo, percentual, total da lista e gráfico.

Limite: o projeto não contém credenciais reais do Supabase. Entrega de e-mail, sessões reais do Supabase e sincronização entre dispositivos precisam ser verificadas após a configuração descrita no README. O teste do PostgreSQL valida schema e políticas, mas não substitui o teste dos endpoints Auth/PostgREST hospedados.
