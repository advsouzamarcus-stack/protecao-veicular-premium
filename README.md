# Protecao Veicular Premium - Consultor Julio Beraka

Assistente virtual para atendimento de protecao veicular, com integracao para WhatsApp, fluxo de consentimento, validacao de placa e backend seguro para consulta FipeAPI por placa.

## WhatsApp de atendimento

+55 21 99594-7016

## Objetivo

Permitir que o cliente envie a placa do veiculo, autorize a consulta e receba confirmacao dos dados basicos do automovel e valor FIPE aproximado para cotacao, analise de protecao veicular e agendamento com o Consultor Julio Beraka.

## Fonte da consulta

A consulta principal esta configurada para FipeAPI por placa:

https://placas.fipeapi.com.br/placas/{placa}?key={apikey}

A chave deve ficar apenas no backend, em variavel de ambiente.

## Fluxo operacional

1. Cliente acessa a pagina.
2. Assistente informa atendimento gratuito e 24 horas por dia, 7 dias por semana.
3. Cliente preenche dados basicos.
4. Cliente informa a placa.
5. Sistema solicita consentimento.
6. Backend valida e normaliza a placa.
7. Backend consulta FipeAPI por placa.
8. Backend remove ou oculta dados sensiveis.
9. Backend retorna dados basicos do veiculo e possivel valor FIPE.
10. Assistente confirma os dados com o cliente.
11. Cliente e direcionado ao WhatsApp do Consultor Julio Beraka.

## Campos permitidos na resposta

- placa
- marca
- modelo
- ano de fabricacao
- ano modelo
- cor
- tipo de veiculo
- municipio
- UF
- combustivel
- codigo FIPE
- valor FIPE aproximado
- opcoes FIPE compativeis, quando houver mais de uma versao

## Campos proibidos

O sistema nao deve exibir:

- nome do proprietario
- CPF
- endereco
- RENAVAM completo
- chassi completo
- numero do motor
- dados financeiros
- dados pessoais de terceiros
- qualquer informacao sigilosa

## Variaveis de ambiente

Configure no Netlify ou no backend:

```env
FIPEAPI_KEY=SUA_CHAVE_FIPEAPI
FIPEAPI_BASE_URL=https://placas.fipeapi.com.br
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

A FipeAPI pode retornar campos como chassi ou numero do motor. O backend foi configurado para nao devolver esses dados ao front-end. A exibicao ao cliente deve ficar limitada aos dados basicos do veiculo e valor FIPE aproximado.
