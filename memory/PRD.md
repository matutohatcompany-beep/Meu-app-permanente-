# RENAN VENDAS (Matuto) — PRD

## Problema
Vendedor que atua com BOTINAS (comissão % sobre valor, padrão 15%, sem custo) e MODA COUNTRY
(revenda com custo e preço; lucro = preço − custo). Precisa substituir uma planilha grande por um
app mobile rápido, minimalista, **offline-first**, usado na rua durante visitas. Sem login.

## Arquitetura
- Expo Router (React Native). App **100% offline**: nenhum dado core depende de internet.
- Banco local: camada central em `src/db/DataContext.tsx` persistindo todo o banco em
  AsyncStorage (IndexedDB no web) sob a chave `matuto.db.v1`. Sobrevive ao fechamento do app.
- Dinheiro em **centavos inteiros** (`src/logic/money.ts`) — sem erro de ponto flutuante; formato BRL.
- Regras de negócio centralizadas em `src/logic/calculations.ts` (finalizeItem, rollUpSale,
  summarize, derivedGoal, restockReport, lastPriceForClientProduct). Nenhuma fórmula duplicada na UI.
- **Integridade histórica**: cada item de venda guarda snapshots (código, nome, custo, preço,
  comissão%). Alterar cadastro NÃO altera vendas antigas. Soft-delete em todas as entidades.
- Tema rústico country (couro/âmbar, alto contraste p/ sol) em `src/theme.ts`.
- Internet só para conveniência: abrir WhatsApp (wa.me) e Google Maps via Linking.

## Personas
- Renan, vendedor em rota. Uso com uma mão, poucos toques, textos/botões grandes, leitura ao sol.

## Implementado (01/2026 — etapa 1, núcleo confiável)
- **Banco/persistência offline** com snapshots e soft-delete.
- **Produtos**: Botinas (código, nome, numerações, preço, foto opc.) e Moda (código, nome,
  categoria, custo, preço, foto opc.). Busca, autofill do nome por código, foto com compressão.
- **Clientes**: cadastro completo (incl. ciclo, endereço, lat/lng), busca/filtro por cidade,
  edição/exclusão, detalhe com histórico de compras + status de visita (60 dias).
- **Venda** multi-item (botina + moda na mesma venda): cliente → produto → qtd → numeração →
  preço (campo grande) → adicionar item → finalizar. Preço editável, aviso "abaixo do custo",
  "último preço pago por este cliente", comissão/lucro discretos. Snapshot de comissão/custo.
- **Cálculos**: comissão botinas, lucro moda, ganho bruto, ganho líquido (− despesas). Validados
  (TESTE 1: R$1.000 → R$150 comissão; below-cost warning; etc.).
- **Desfazer última venda** e **Corrigir venda** (recalcula só aquela venda) com log.
- **Início**: saudação, resumo (dia/semana/mês/ano), metas com barras, atalhos.
- **Metas**: anuais + recálculo automático (mensal/semanal/diária, dias de viagem).
- **Despesas**: total diário + detalhamento opcional; entra no ganho líquido.
- **Admin** (sem senha): comissão %, dias do ciclo, cidades, atalhos, corrigir venda.
- **Histórico de alterações** com restaurar valor anterior.
- **Relatórios** por período + por cidade (vendas, ganho, clientes, ticket médio).
- **Recompra** (moda): qtd vendida × custo atual, por período/categoria.
- **Clientes da semana** (ciclo de 60 dias, atrasados), **Mensagens WhatsApp** (templates +
  preencher {nome}/{cidade}/{data} + abrir/copiar), **Eventos Country**.
- **Backup/Restore** JSON + apagar tudo.

## Backlog / 2ª etapa (estrutura preparada)
- P1: Rotas (sugestão por proximidade de coordenadas / agrupamento por cidade + "Abrir no Google Maps").
- P1: Mapa de clientes (Leaflet/online) com fallback offline.
- P2: Rankings analíticos avançados (produtos que mais lucram, frequência de compra, locais de venda).
- P2: Pós-venda com lembretes automáticos (30/90 dias, aniversário, próxima visita).
- P2: Diário de viagem consolidado; classificação de cidades VOLTAR/NORMAL/EVITAR; painel de evolução mensal com gráficos.
- (Removido a pedido do usuário) Exportação para Excel.

## Notas técnicas
- `shadow*` gera warning de depreciação só no web (sem impacto funcional).
- Testado via testing_agent (iteration_1): navegação, cadastros, venda botina (comissão 15%),
  aviso abaixo do custo, desfazer, persistência pós-reload — todos OK.
