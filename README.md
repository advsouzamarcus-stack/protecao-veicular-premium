# Protecao Veicular Premium - Consultor Julio Beraka

Assistente virtual para atendimento de protecao veicular, com integracao para WhatsApp, fluxo de consentimento, validacao de placa, backend seguro para SERPRO/SENATRAN e estrutura complementar para FIPE.

## WhatsApp de atendimento

+55 21 99594-7016

## Objetivo

Permitir que o cliente envie a placa do veiculo, autorize a consulta e receba confirmacao dos dados basicos do automovel para cotacao, analise de protecao veicular e agendamento com o Consultor Julio Beraka.

## Fluxo operacional

1. Cliente acessa a pagina.
2. Assistente informa atendimento gratuito e 24 horas por dia, 7 dias por semana.
3. Cliente preenche dados basicos.
4. Cliente informa a placa.
5. Sistema solicita consentimento.
6. Backend valida e normaliza a placa.
7. Backend consulta SERPRO/SENATRAN.
8. Backend remove ou oculta dados sensiveis.
9. Backend consulta FIPE ou retorna aviso para confirmacao de versao.
10. Assistente confirma os dados com o cliente.
11. Cliente e direcionado ao WhatsApp do Consultor Julio Beraka.

## Campos permitidos na resposta

- placa
- marca
- modelo
- ano de fabricacao
- ano modelo
- cor
- categoria
- especie
- tipo de veiculo
- municipio
- UF
- combustivel
- situacao basica
- restricoes publicas, se permitido pela contratacao

## Campos proibidos

O sistema nao deve exibir:

- nome do proprietario
- CPF
- endereco
- RENAVAM completo
- chassi completo
- dados financeiros
- dados pessoais de terceiros
- qualquer informacao sigilosa

## Variaveis de ambiente

Configure no Netlify ou no backend:

```env
SERPRO_BASE_URL=
SERPRO_ACCESS_TOKEN=
FIPE_PROVIDER=brasilapi
WHATSAPP_NUMBER=5521995947016
```

## Execucao local

```bash
npm install
npm run dev
```

## Deploy sugerido

Netlify, usando:

- pasta de publicacao: raiz do projeto
- funcoes: netlify/functions

## Atencao

O endpoint real do SERPRO/SENATRAN deve ser ajustado conforme a documentacao oficial recebida apos contratacao. As credenciais nunca devem ser colocadas no HTML, JavaScript publico ou repositorio GitHub.
