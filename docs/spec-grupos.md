# Grupos de amigos no Ritmo

Status: especificação para implementação. Não implementado nesta etapa.
Data: 26/10/2026.

## Objetivo

Evoluir a dupla para um grupo privado de amigos. Cada pessoa mantém seu diário e pode acompanhar a alimentação e a movimentação dos participantes, com foco em constância e incentivo. O diário existente continua sendo a fonte dos dados: não haverá uma segunda cópia dos registros por grupo.

## Escopo da primeira versão

- Um grupo ativo por pessoa, com 2 a 10 participantes. O limite é uma decisão proposta para manter o produto simples e pode ser ajustado antes da implementação.
- Qualquer pessoa com conta pode criar um grupo ou aceitar um convite.
- Criar grupo com nome, convidar por link, entrar, visualizar participantes e sair.
- Visão diária da rotina de cada membro: refeições, porções/observações, calorias consumidas, base diária, atividade extra e balanço.
- Consulta por data e visão resumida dos últimos sete dias.
- Cada pessoa edita exclusivamente os próprios registros.
- Migração das duplas existentes, mantendo contas e histórico.

Não entram nesta versão: chat, feed público, ranking, competições, notificações, planos de treino, agendas recorrentes, múltiplos grupos simultâneos e compartilhamento de fotos. Aqui, “rotina” significa os registros de alimentação e atividade que já existem no Ritmo.

## Experiência

### Quem ainda não tem grupo

A navegação passa de “Nossa dupla” para “Nosso grupo”. A tela explica o compartilhamento e oferece “Criar grupo” e “Entrar com convite”. O diário pessoal funciona normalmente sem grupo.

Em “Criar grupo”, informar um nome de 2 a 40 caracteres. Quem cria vira administrador. O grupo começa com apenas essa pessoa e mostra um convite para copiar e compartilhar. Nenhuma mensagem é enviada automaticamente.

### Convidar e entrar

O administrador gera um link com validade de sete dias. Pode substituí-lo por outro a qualquer momento; o anterior deixa de funcionar. O link não contém nome, e-mail ou identificador pessoal do administrador.

Ao abrir um convite, a pessoa faz login ou cria uma conta e conclui a configuração inicial da base diária. O convite é preservado durante esse fluxo. Antes de entrar, a tela apresenta o nome do grupo, quantidade de membros e este aviso:

> Ao entrar, os membros poderão ver suas refeições, observações, atividades e valores diários, incluindo registros anteriores. Você também poderá acompanhar os registros deles. Peso, altura, idade e os dados do cálculo de TMB continuam privados.

“Entrar no grupo” confirma o compartilhamento. Não entrar automaticamente ao abrir o link. O token, sem autenticação e aceite, não permite consultar o diário ou os perfis dos membros.

Convite vencido ou substituído: pedir um novo link. Grupo cheio: explicar o limite e manter o diário pessoal disponível. Pessoa já no mesmo grupo: abrir o grupo sem duplicar participação. Pessoa em outro grupo: explicar que precisa sair dele primeiro; nunca realizar essa troca silenciosamente.

### Acompanhar o grupo

Cabeçalho com nome, número de membros e seletor de data, usando o calendário do app. “Hoje” é o padrão. Cada membro aparece em um cartão com nome, avatar por iniciais, consumo, gasto estimado, balanço e número de refeições. O próprio usuário aparece primeiro; os demais seguem ordem alfabética estável.

“Ver rotina” abre os registros da pessoa na data selecionada:

1. Refeições em ordem de registro, com categoria, nome, calorias e observações.
2. Base diária e atividade extra, distinguindo o que já faz parte da rotina.
3. Balanço diário e resumo dos últimos sete dias.

Quando não houver registro, mostrar “Sem registros neste dia”. Não interpretar isso como ausência de treino, jejum ou consumo zero confirmado. Dias futuros não ficam disponíveis. Registros de outra pessoa não exibem controles de edição/exclusão.

Não usar déficit, menor consumo ou maior gasto como classificação de desempenho. A interface preserva a paleta, animações discretas, acessibilidade e linguagem do Ritmo.

### Gerenciar e sair

Todos podem ver a lista de membros e sair após confirmação. O administrador pode renomear o grupo, substituir o convite, remover um membro com confirmação e transferir a administração para outro membro.

O único administrador precisa transferir a função antes de sair de um grupo que tenha outras pessoas. Se estiver sozinho, sair encerra o grupo e invalida os convites. A ação deve informar esse efeito antes da confirmação.

Sair ou ser removido revoga imediatamente a leitura entre a pessoa e o antigo grupo. Seus registros continuam na própria conta. O grupo não mantém cópias do diário de ex-membros. O aplicativo limpa os dados de membros na memória ao receber a mudança ou ao detectar perda de acesso; informações já vistas não podem ser desfeitas fora do app.

## Privacidade e permissões

| Informação ou ação | Próprio usuário | Membro do mesmo grupo | Administrador |
| --- | --- | --- | --- |
| Ler refeições, observações e registros diários | Sim | Sim, enquanto ambos forem membros | Mesma regra dos membros |
| Editar/excluir registros | Sim | Não | Apenas os próprios |
| Ler peso, altura, idade, sexo e TMB privados | Sim | Não | Apenas os próprios |
| Ler e-mail, sessão e credenciais | Apenas no contexto da própria conta | Não | Não |
| Exportar dados pelo app | Próprios | Não | Próprios |
| Renomear, gerar convite e remover membros | Se administrador | Não | Sim |
| Sair | Sim | Sim | Com transferência, se necessário |

Todos os participantes atuais podem consultar o histórico existente entre si. Esta é uma decisão proposta, consistente com as duplas atuais, e deve aparecer explicitamente antes do aceite. Compartilhamento apenas a partir da entrada exigiria outra regra e uma data de corte nas políticas.

## Modelo de dados proposto

`groups`: `id`, `name`, `created_by`, `created_at`, `archived_at`.

`group_members`: `group_id`, `user_id`, `role` (`admin` ou `member`), `joined_at`. Chave primária composta e índice único de `user_id` para garantir um grupo por pessoa. Índice por `group_id` para listar membros.

`group_invites`: `id`, `group_id`, `token_hash`, `expires_at`, `revoked_at`, `created_by`, `created_at`. Token aleatório com pelo menos 128 bits de entropia; armazenar somente seu hash. Um convite ativo por grupo; o link pode ser reutilizado até expirar, ser substituído ou o grupo encher.

`profiles`, `meals`, `daily_logs` e `metabolic_profiles` mantêm suas responsabilidades. `profiles.duo_id` será removido só após a migração e a publicação do cliente compatível. Os diários não ganham `group_id`: continuam pertencendo ao usuário.

## Contratos do backend

| Operação | Comportamento |
| --- | --- |
| `create_group(name)` | Cria grupo e participação de administrador atomicamente; rejeita quem já participa de outro. |
| `create_group_invite(group_id)` | Só administrador; revoga convite anterior e retorna o novo link/token uma única vez. |
| `preview_group_invite(token)` | Autenticado, limitado por frequência; retorna apenas nome, lotação e validade necessários ao aceite. |
| `join_group(token)` | Valida token e aceite, verifica participação e capacidade, insere membro em transação. |
| `rename_group(group_id,name)` | Só administrador, valida nome e grava. |
| `remove_group_member(group_id,user_id)` | Só administrador; não remove o último administrador nem apaga diários. |
| `transfer_group_admin(group_id,user_id)` | Transfere a função atomicamente para um membro atual. |
| `leave_group(group_id)` | Remove somente a própria participação; aplica regras do último administrador e grupo vazio. |

Funções usam `auth.uid()`, sem aceitar identidade do solicitante por parâmetro. Operações que alteram membros bloqueiam a linha do grupo na mesma ordem, para impedir corrida ao atingir dez participantes ou perder o último administrador. A unicidade de `user_id` também protege entradas simultâneas em grupos diferentes.

RLS restringe leituras a membros atuais do mesmo grupo; dados próprios continuam acessíveis sem grupo. Escritas de refeições e dias mantêm o dono como único autorizado. Não conceder INSERT/UPDATE/DELETE direto nas tabelas de grupos, membros e convites ao cliente: usar RPCs restritas. Helpers de RLS devem evitar recursão e usar `search_path` fixo. Funções privilegiadas só retornam campos necessários.

Perfil metabólico permanece com leitura exclusiva do dono, independentemente de grupo ou administração. Nenhuma chave de serviço é enviada ao navegador. Convites não devem ir para logs, analytics ou URLs de serviços terceiros.

## Carregamento e desempenho

- Consultar os membros uma vez na entrada da tela e atualizar após mudanças relevantes.
- Buscar refeições e dias do grupo pela data selecionada, em consultas em lote; evitar uma consulta por cartão.
- Buscar os sete dias apenas quando abrir o detalhe de uma pessoa. Não baixar todo o histórico de todos.
- Reutilizar somas e componentes do diário, calculando totais no cliente para o pequeno volume esperado.
- Índices existentes por usuário/data suportam as leituras; conferir os planos com dez membros antes da publicação.
- Para revogar a visualização enquanto a tela estiver aberta, assinar apenas alterações nas participações autorizadas do próprio grupo. Ao sair/remover, limpar o cache; ao recuperar foco, revalidar participação antes de reutilizar dados do grupo.
- Conteúdo do grupo permanece em memória de sessão, sem persistir diários de amigos em localStorage. Tratar falha e reconexão sem mostrar cache após perda de acesso.

## Migração das duplas

1. Criar novas tabelas, índices, políticas e funções sem remover o modelo antigo.
2. Para cada dupla com duas pessoas, criar um grupo “Nosso grupo” e vincular os membros. Escolher como administrador o usuário com cadastro mais antigo; desempatar por ID. Documentar essa regra na tela de apresentação.
3. Contas com uma pessoa passam a ter diário pessoal sem grupo, com opção de criar ou entrar. Não criar grupos vazios.
4. Invalidar os convites antigos de dupla e orientar a gerar um convite de grupo. Não traduzir tokens antigos em acesso automático.
5. Publicar cliente compatível e trocar a regra de leitura para membros do grupo em uma janela coordenada, sem permissões mais amplas durante a transição.
6. Verificar contagem e vínculo de todos os usuários antes de remover o modelo antigo. Não apagar refeições, atividades ou perfis metabólicos.

Executar primeiro numa cópia de teste com grupos isolados. Preparar rollback de políticas e cliente antes da migração. Após novos grupos terem mais de dois membros, voltar ao modelo de dupla exige tratamento específico; não assumir rollback por simples deploy do código antigo.

## Critérios de aceite

- Nova conta conclui a base diária e pode criar grupo, convidar ou continuar sozinha.
- O amigo aceita o convite conscientemente e ambos visualizam os mesmos registros diários do diário individual.
- Dez entradas simultâneas respeitam o limite; uma pessoa nunca aparece em dois grupos ativos.
- Convite expirado, substituído, inválido ou de grupo cheio não concede acesso.
- Uma terceira conta sem participação não lê o grupo nem por chamadas diretas ao Supabase.
- Membro e administrador não alteram dados de outros, nem consultam seus dados metabólicos privados.
- Remoção/saída revoga leitura no servidor e limpa a visão do grupo; o diário individual permanece íntegro.
- Último administrador não abandona grupo com membros sem transferir administração.
- Alterar base não muda dias congelados; IA e registro manual continuam funcionando.
- Duplas existentes migram sem perder dados ou abrir acesso a outros grupos.
- Verificação em 320, 360 e 1280 px, navegação por teclado, estados vazios, carregamento, falha e movimento reduzido.

## Sequência sugerida de implementação

1. Migração de dados, RPCs e testes reais de RLS/concorrência.
2. Criar/entrar/convidar e gerenciamento de membros.
3. Painel por data e detalhe da rotina, reaproveitando os componentes existentes.
4. Migração ensaiada, revisão de acessibilidade e publicação coordenada.

O backend exige mais cuidado que a tela, principalmente na revogação de acesso e nas entradas simultâneas. Não é necessário um agente de IA para essa funcionalidade.
