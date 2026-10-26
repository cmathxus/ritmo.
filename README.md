# Ritmo

Diário pessoal de alimentação e atividade para duas pessoas. Interface em português, responsiva, sem upload, sem servidor próprio. React + TypeScript + Vite; Supabase Auth e Postgres. Aproximadamente 81 kB de JavaScript comprimido no build inicial.

## O que está pronto

- Contas individuais com e-mail e senha, confirmação de e-mail, recuperação e troca de senha.
- Cadastro limitado a dois e-mails configurados no banco (a verificação acontece no servidor).
- Registro, edição e exclusão de refeições em qualquer dia passado ou hoje.
- Soma de calorias, gasto habitual, gasto extra do dia e balanço consumo menos gasto.
- Base preservada nos dias já registrados, mesmo após alteração nas preferências.
- Repetição rápida de refeições recentes, histórico de 14 dias e gráfico semanal.
- Visão da dupla: cada um lê os registros do outro e edita somente os próprios.
- Exportação completa dos próprios dados em JSON.
- Modo de demonstração local com exemplos, apenas quando não há variáveis do Supabase.

## Rodar localmente

Requer Node.js 22 ou superior.

```powershell
cd C:\Users\4TECH\4tech\personal\healthcare\ritmo
npm install
npm run dev
```

Sem `.env.local`, o site abre em demonstração. Os registros desse modo são exemplos salvos no localStorage; não há conta nem sincronização. Eles não são enviados automaticamente ao banco quando você conectar o Supabase. Não use a demonstração como arquivo definitivo: limpar os dados do navegador apaga os exemplos e alterações.

## Conectar o Supabase (configuração única)

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra `supabase/schema.sql`, substitua os dois e-mails de exemplo pelos e-mails reais (minúsculos). Execute o arquivo inteiro no SQL Editor de um projeto novo **antes de criar as contas**. Ele cria tabelas, índices, trigger de cadastro e políticas RLS. Não execute duas vezes: o script é uma migração inicial.
3. Em Authentication → URL Configuration, configure **Site URL** com a URL publicada e inclua essa URL e `http://localhost:5173` na lista de Redirect URLs. A recuperação de senha usa a origem atual como destino.
4. Mantenha o provedor Email ativo, confirmação de e-mail habilitada e senha mínima de 8 caracteres. Para entrega confiável de confirmação/recuperação, configure SMTP próprio. O serviço padrão tem restrições e limites; consulte a documentação de Auth do Supabase.
5. Em Project Settings → API, copie a URL do projeto e a **publishable key** (ou a chave pública `anon` de projetos legados). **Nunca use secret key ou service_role no frontend.**
6. Copie `.env.example` para `.env.local` e preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

7. Reinicie `npm run dev`. Agora aparece a tela real de login. Cada um cria sua conta usando seu e-mail autorizado, confirma o e-mail e entra. O perfil é criado pelo banco; nenhum usuário pode escolher ou sobrescrever o ID de outra pessoa.

Não há credenciais reais incluídas neste projeto e não foi possível testar o serviço remoto sem um projeto Supabase configurado. Um e-mail não autorizado pode receber a mensagem genérica de erro de cadastro do Supabase; confira a lista no SQL Editor.

Se já criou as contas antes do schema, use um projeto novo ou crie os perfis correspondentes pelo SQL Editor após configurar a allowlist; o trigger roda apenas para contas novas. Para manter o limite de dois cadastros, não altere os e-mails autorizados sem também remover a conta antiga no painel de Auth. A alteração da allowlist revoga imediatamente o acesso da conta antiga aos dados.

## Publicar em hospedagem estática

O projeto funciona no Cloudflare Pages, Netlify ou Vercel, sem backend na hospedagem. A disponibilidade e limites dos planos gratuitos são definidos pelos provedores.

Opção simples: conecte este diretório a um repositório Git e importe no **Cloudflare Pages**:

| Campo | Valor |
| --- | --- |
| Root directory | `ritmo` se o repositório contém a pasta pai; `.` se contém apenas o app |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 22 ou superior |

Adicione as duas variáveis `VITE_SUPABASE_*` no painel de build da hospedagem **antes** de publicar. Elas são incorporadas no build; qualquer alteração exige rebuild. Com ambas ausentes o deploy é uma demonstração. Com configuração inválida o app exibe erro; não salva silenciosamente dados reais no modo local. Depois ajuste as URLs permitidas no Supabase para a URL final.

Outra opção: preencha `.env.local`, execute `npm run build` e envie `dist` como deploy estático manual. `.openai/hosting.json` pertence à prévia do Sites e pode ser ignorado em outros hosts.

## Regras dos cálculos e dados

- Gasto do dia = base habitual + extra. O treino habitual já está na base; use o extra apenas para o que saiu da rotina.
- Balanço = consumo − gasto. O app não define metas nutricionais nem classifica os resultados como vitória/derrota.
- A base do dia é congelada no primeiro registro de refeição ou atividade. Mudar a base nas preferências só afeta dias ainda não registrados. Até dias vazios no passado usam a base atual quando recebem seu primeiro registro.
- Atividade extra é o **total** do dia e substitui o valor anterior. Duas atividades devem ser somadas nesse campo; zero remove o gasto extra.
- Datas seguem o calendário local do dispositivo, sem conversão de dia para UTC.
- Cada carregamento consulta uma janela de 43 dias. O histórico mostra os 14 dias até a data selecionada; escolha outra data para navegar. A exportação pagina todos os próprios registros em lotes de 500, além da janela exibida na interface.
- Sem polling, rastreadores, analytics, fotos ou tabelas de nutrientes. Dados do amigo atualizam ao trocar de data/reabrir a página.
- RLS bloqueia acesso anônimo, edição de dados do amigo, edição da allowlist pelo cliente e alteração retroativa da base diária pelo cliente.

## Verificação

```powershell
npm test
npm run build
```

Antes do uso real, com o Supabase conectado: crie as duas contas, teste confirmação e recuperação, registre uma refeição e uma atividade, confirme os valores na outra conta e tente um terceiro e-mail. Teste chamadas diretas ao banco para conferir que a conta A não consegue alterar dados de B.

Documentação: [Supabase Auth](https://supabase.com/docs/guides/auth), [senhas e recuperação](https://supabase.com/docs/guides/auth/passwords), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Cloudflare Pages build](https://developers.cloudflare.com/pages/configuration/build-configuration/).
