# GATES — verificação do Relatório Apisul (index.html)

## G1 — HTML servido com sucesso
Página raiz responde 200 no servidor local.
  CHECK: node -e "fetch('http://localhost:8000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
  EXPECT: (exit 0)
MET — GET http://localhost:8000/ → 200 OK (npx serve).

## G2 — Estrutura da página completa
Cabeçalho, seções (Visão Geral, Análise, Mapa, Registros), rodapé e modal presentes.
  MANUAL
MET — read_page confirma banner, nav com 4 âncoras válidas (#overview/#analise/#mapa-operacional/#registros), main com todas as regiões, contentinfo e dialog "Cadastrar Nova Ocorrência".

## G3 — Dados sincronizados da planilha oficial
Tabela de registros populada a partir do CSV do Google Sheets.
  MANUAL
MET — 15 registros renderizados (PAR-003 … PAR-020) com UF/cidade, coordenadas, status e links de fonte; status "Planilha conectada".

## G4 — Consistência numérica do dashboard
Composição e índice de risco batem com 15 pontos.
  MANUAL
MET — 6 total / 3 parcial / 6 liberado = 40% / 20% / 40%; índice 50/100 sobre 15 pontos. Coerente.

## G5 — Mapa operacional renderiza marcadores
Leaflet inicializa e plota os pontos.
  MANUAL
MET — mapa carrega, 15 marcadores coloridos por status, filtros Todos/Totais/Parciais/Liberados presentes.

## G6 — Sem erros de console
Nenhum erro JS ao carregar.
  MANUAL
MET — apenas warnings do Tailwind CDN ("should not be used in production"); nenhum erro.

## G7 — Tiles do mapa base
Camada base sem degradação.
  MANUAL
MET — CARTO substituída por provedores sem chave: claro = OpenStreetMap padrão (tile.openstreetmap.org), escuro = Esri World Dark Gray Base. Ambos retornam 200. Mapa renderiza limpo, sem marca d'água; atribuição atualizada.

## G8 — Tema claro/escuro do site inteiro
Botão "Tema do site" alterna toda a página, com cores coerentes e persistência.
  MANUAL
MET — novo botão no menu (#siteThemeToggleBtn). html.light redefine os tokens
(surfaces, texto, linhas, status, elevação) + overrides pontuais (header, hero,
logo, mapa, utilitárias Tailwind). Contraste AA verificado. Preferência salva em
localStorage + respeita prefers-color-scheme; script no <head> evita flash.
Alternar o tema do site também alinha as telhas do mapa (o botão "Tema do mapa"
ainda sobrescreve). Verificado nos dois sentidos no navegador; sem erros de console.

## Dependências externas (runtime, exigem internet)
- cdn.tailwindcss.com (JIT em produção — warning)
- fonts.googleapis.com / gstatic (Space Grotesk, Inter)
- cdnjs Font Awesome 6.5.1
- unpkg Leaflet 1.9.4
- basemaps.cartocdn.com (tiles — ver G7)
- docs.google.com/spreadsheets (CSV) + script.google.com (Apps Script webapp p/ escrita)
