// ============================================================
//  Pages Function — rota /ultimosresultados
//
//  Lê o JSON consolidado do KV (LOTERIAS_KV), monta o HTML dos cards
//  no servidor da Cloudflare e entrega a página pronta.
//  Não consulta a API da Caixa e não guarda nenhum dado de visitante.
//  Os arquivos do site (estáticos) continuam servidos normalmente.
// ============================================================

const URL_CANONICA = "https://sorteanalisada.com.br/ultimosresultados";

// Mantenha false até decidir exibir anúncios nesta página (ver observações no LEIA-ME).
const INCLUIR_ADSENSE = false;

const ORDEM = [
    "maismilionaria", "megasena", "quina", "lotofacil", "duplasena",
    "lotomania", "diadesorte", "timemania", "supersete", "loteca", "federal"
];

const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = new Intl.NumberFormat("pt-BR");

export async function onRequestGet(context) {
    let dados = null;
    try {
        if (context.env && context.env.LOTERIAS_KV) {
            dados = await context.env.LOTERIAS_KV.get("resultados", "json");
        }
    } catch (e) {
        dados = null;
    }

    return new Response(pagina(dados), {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Content-Type-Options": "nosniff"
        }
    });
}

// ---------- utilidades ----------
function esc(v) {
    return String(v === null || v === undefined ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function dataHora(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    }).format(d).replace(", ", " às ");
}

function colunaLoteca(a, b) {
    if (a === null || b === null || a === undefined || b === undefined) return "–";
    return a > b ? "1" : a < b ? "2" : "X";
}

// ---------- blocos do card ----------
function bolas(lista, rotulo, extraClasse) {
    return '<div class="bolas res-bolas' + (extraClasse ? " " + extraClasse : "") + '" role="list" aria-label="' + esc(rotulo) + '">' +
        lista.map(function (n) { return '<span class="bola" role="listitem">' + esc(n) + "</span>"; }).join("") +
        "</div>";
}

function colunas(lista) {
    return '<div class="bolas res-bolas res-b-supersete" role="list" aria-label="Dígitos sorteados por coluna">' +
        lista.map(function (n, i) {
            return '<div class="coluna" role="listitem"><span class="coluna-rotulo" aria-label="Coluna ' + (i + 1) + '">Col. ' + (i + 1) +
                '</span><span class="bola">' + esc(n) + "</span></div>";
        }).join("") + "</div>";
}

function extra(rotulo, conteudoHtml) {
    return '<p class="gerador-extra res-extra"><span class="gerador-extra-rotulo">' + esc(rotulo) + "</span>" + conteudoHtml + "</p>";
}

function resultado(c) {
    let h = "";

    if (c.chave === "supersete") {
        h += colunas(c.dezenas);
    } else if (c.chave === "duplasena") {
        h += '<p class="res-sub">1º sorteio</p>' + bolas(c.dezenas, "Dezenas do 1º sorteio");
        h += '<p class="res-sub">2º sorteio</p>' + bolas(c.dezenas2 || [], "Dezenas do 2º sorteio");
    } else if (c.chave === "federal") {
        h += '<ol class="res-bilhetes">' + (c.bilhetes || []).map(function (b, i) {
            const faixa = (c.premiacao || []).find(function (p) { return p.faixa === i + 1; });
            return '<li><span class="res-pos">' + (i + 1) + 'º prêmio</span>' +
                '<span class="res-bilhete">' + esc(b) + "</span>" +
                '<span class="res-valor">' + (faixa && faixa.premio ? dinheiro.format(faixa.premio) : "") + "</span></li>";
        }).join("") + "</ol>";
    } else if (c.chave === "loteca") {
        h += '<details class="res-jogos" open><summary>Resultado dos ' + (c.jogos || []).length + ' jogos</summary>' +
            '<div class="res-rolagem"><table><thead><tr><th>Jogo</th><th>Partida</th><th>Coluna</th></tr></thead><tbody>' +
            (c.jogos || []).map(function (j, i) {
                const placar = (j.golsA === null || j.golsB === null) ? "x" : j.golsA + " x " + j.golsB;
                return "<tr><td>" + (i + 1) + "</td><td class=\"res-partida\">" + esc(j.timeA) + " <strong>" + esc(placar) + "</strong> " + esc(j.timeB) +
                    "</td><td><strong>" + colunaLoteca(j.golsA, j.golsB) + "</strong></td></tr>";
            }).join("") + "</tbody></table></div></details>";
    } else {
        // Lotofácil e Lotomania têm muitas dezenas: a classe controla quantas bolas cabem por linha
        h += bolas(c.dezenas || [], "Dezenas sorteadas", "res-b-" + esc(c.chave));
    }

    if (c.trevos) {
        h += extra("Trevos: ", c.trevos.map(function (t) {
            return '<span class="bola-trevo"><i class="fa-solid fa-clover" aria-hidden="true"></i> ' + esc(t) + "</span>";
        }).join(""));
    }
    if (c.mesDaSorte) h += extra("Mês de Sorte: ", '<span class="bola-mes">' + esc(c.mesDaSorte) + "</span>");
    if (c.timeDoCoracao) h += extra("Time do Coração: ", '<span class="bola-mes">' + esc(c.timeDoCoracao) + "</span>");
    return h;
}

function acumulado(c) {
    if (c.chave === "federal") return "";
    if (c.acumulou) {
        return '<p class="res-acum res-acum-sim"><strong>Acumulou!</strong>' +
            (c.valorAcumulado > 0 ? " Valor acumulado: <strong>" + dinheiro.format(c.valorAcumulado) + "</strong>" : "") + "</p>";
    }
    return '<p class="res-acum res-acum-nao">Não acumulou</p>';
}

function linhasPremios(lista) {
    return lista.map(function (p) {
        return "<tr><td>" + esc(p.descricao) + "</td><td>" + inteiro.format(p.ganhadores) + "</td><td>" +
            (p.ganhadores > 0 && p.premio > 0 ? dinheiro.format(p.premio) : "–") + "</td></tr>";
    }).join("");
}

function premiacao(c) {
    if (c.chave === "federal") return "";   // os valores já aparecem junto de cada bilhete
    const lista = c.premiacao || [];
    if (!lista.length) return "";

    let corpo;
    if (c.chave === "duplasena" && lista.length === 8) {
        corpo = '<tr class="res-grupo"><th colspan="3">1º sorteio</th></tr>' + linhasPremios(lista.slice(0, 4)) +
            '<tr class="res-grupo"><th colspan="3">2º sorteio</th></tr>' + linhasPremios(lista.slice(4));
    } else {
        corpo = linhasPremios(lista);
    }
    const aberto = lista.length <= 6 ? " open" : "";
    return '<details class="res-premios"' + aberto + "><summary>Premiação</summary>" +
        '<div class="res-rolagem"><table><thead><tr><th>Faixa</th><th>Ganhadores</th><th>Prêmio</th></tr></thead><tbody>' +
        corpo + "</tbody></table></div></details>";
}

function proximo(c) {
    const p = c.proximo || {};
    const partes = [];
    if (p.concurso) partes.push("Concurso <strong>" + esc(p.concurso) + "</strong>");
    if (p.data) partes.push("<strong>" + esc(p.data) + "</strong>");
    if (!partes.length) return "";
    return '<p class="res-prox">Próximo sorteio: ' + partes.join(" · ") + "</p>";
}

function card(c) {
    const local = [c.cidadeUF, c.local].filter(Boolean).join(" · ");
    return '<article class="res-card" id="' + esc(c.chave) + '" aria-labelledby="t-' + esc(c.chave) + '">' +
        '<h2 id="t-' + esc(c.chave) + '" class="res-nome">' + esc(c.nome) + "</h2>" +
        '<p class="res-concurso">Concurso <strong>' + esc(c.concurso) + "</strong> · " + esc(c.data) + "</p>" +
        (local ? '<p class="res-local"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + esc(local) + "</p>" : "") +
        resultado(c) + acumulado(c) + premiacao(c) + proximo(c) +
        "</article>";
}

// ---------- página ----------
function corpoPrincipal(dados) {
    const mapa = (dados && dados.loterias) || {};
    const cards = ORDEM.filter(function (k) { return mapa[k]; }).map(function (k) { return mapa[k]; });

    if (!cards.length) {
        return '<p class="res-vazio">Os resultados estão temporariamente indisponíveis. Tente novamente mais tarde ou consulte os canais oficiais das Loterias Caixa.</p>';
    }

    const quando = dados.atualizadoEm ? dataHora(dados.atualizadoEm) : null;
    const indice = '<nav class="res-indice" aria-label="Ir para uma loteria">' + cards.map(function (c) {
        return '<a href="#' + esc(c.chave) + '">' + esc(c.nome) + "</a>";
    }).join("") + "</nav>";

    return (quando ? '<p class="res-atualizado">Última atualização: <strong>' + esc(quando) + "</strong></p>" : "") +
        indice +
        '<div class="res-lista">' + cards.map(card).join("") + "</div>";
}

function pagina(dados) {
    return '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<meta name="google-site-verification" content="EgyoXsWWVGCKSqeXLnr9I4mJPvUGsLR5DDpNWP8wLKM" />\n' +
`<script>
window.addEventListener('load', function() {
    setTimeout(function() {
        var script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-PPB7LRV5SJ';
        script.async = true;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-PPB7LRV5SJ');
    }, 3000);
});
</script>
` +
'<title>Últimos Resultados das Loterias - Sorte Analisada</title>\n' +
'<meta name="description" content="Veja os últimos resultados da +Milionária, Mega-Sena, Quina, Lotofácil, Dupla-Sena, Lotomania, Dia de Sorte, Timemania, Super Sete, Loteca e Federal em cards simples e organizados.">\n' +
'<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">\n' +
'<link rel="icon" href="/static/images/logotipo.png" type="image/png">\n' +
(INCLUIR_ADSENSE ? '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9963024999857816" crossorigin="anonymous"></script>\n' : "") +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Poppins:wght@400;500;700&display=swap" rel="stylesheet">\n' +
'<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">\n' +
'<meta property="og:type" content="website">\n' +
'<meta property="og:url" content="' + URL_CANONICA + '">\n' +
'<meta property="og:title" content="Últimos Resultados das Loterias - Sorte Analisada">\n' +
'<meta property="og:description" content="Últimos resultados das principais loterias da Caixa em cards simples e organizados.">\n' +
'<meta property="og:image" content="https://sorteanalisada.com.br/static/images/og-image.png">\n' +
'<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n' +
'<meta property="og:locale" content="pt_BR">\n<meta property="og:site_name" content="Sorte Analisada">\n' +
'<meta name="twitter:card" content="summary_large_image">\n' +
'<meta name="twitter:title" content="Últimos Resultados das Loterias - Sorte Analisada">\n' +
'<meta name="twitter:image" content="https://sorteanalisada.com.br/static/images/twitter-card.jpg">\n' +
'<link rel="canonical" href="' + URL_CANONICA + '">\n' +
'<link rel="stylesheet" href="/static/css/blog.css">\n' +
'<link rel="stylesheet" href="/static/css/ultimosresultados.css">\n' +
'</head>\n<body>\n<div class="container">\n' +
`<header id="topo">
    <a href="/" title="Página inicial Sorte Analisada" class="logo-link">
        <picture>
            <source srcset="/static/images/logotipo.webp" type="image/webp">
            <img src="/static/images/logotipo.png" alt="Sorte Analisada - Gerador de Números para Loterias" class="imagem-ouro" width="128" height="131" loading="eager" fetchpriority="high">
        </picture>
    </a>
    <h1>Últimos Resultados</h1>
    <p class="subtitulo">Os resultados mais recentes das loterias da Caixa</p>
</header>

<nav class="nav-interna" aria-label="Navegação do site">
    <a href="/">Início</a>
    <a href="/#gerador">Gerador</a>
    <a href="/organizador">Organizador</a>
    <a href="/#artigos">Artigos</a>
    <a href="https://play.google.com/store/apps/details?id=br.com.sorteanalisada.sorteanalisada">App Sorte Analisada</a>
    <a href="/privacy">Política de Privacidade</a>
    <a href="/terms">Termos de Uso</a>
</nav>

<main>
    <section id="resultados" aria-labelledby="res-titulo">
        <h2 id="res-titulo" class="titulo-artigos">🏆 Últimos Resultados</h2>
        <p class="res-aviso"><strong>Atenção:</strong> os resultados exibidos podem apresentar atraso na atualização. Para confirmar os números sorteados e conferir os resultados oficiais, consulte os canais oficiais das <a href="https://loterias.caixa.gov.br/" target="_blank" rel="noopener noreferrer" class="link-interno">Loterias Caixa</a>.</p>
` + corpoPrincipal(dados) + `
        <p class="gerador-aviso">
            ** Informações públicas das loterias, exibidas apenas para consulta e entretenimento. Jogue com responsabilidade.
            Loterias são para maiores de 18 anos.
        </p>
    </section>
    <a href="#topo" class="voltar-topo">Voltar ao Topo ↑</a>
</main>

<footer class="site-footer">
    <h2 class="footer-social-title">Siga o Sorte Analisada no Instagram</h2>
    <div class="footer-links">
        <a href="https://www.instagram.com/sorteanalisadaoficial/?igsh=cW8zenNycWVieXF1" title="Instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Sorte Analisada">
            <i class="fa-brands fa-instagram" aria-hidden="true"></i>
        </a>
    </div>
    <div class="copyright">
        <a href="/">Início</a><br>
        <a href="/organizador">Organizador de Jogos</a><br>
        <a href="/ultimosresultados">Últimos Resultados</a><br>
        <a href="/landing">Conheça o App</a><br>
        <a href="mailto:contato@sorteanalisada.com.br" title="Contato"><i class="fa-solid fa-envelope" aria-hidden="true"></i> Contato</a><br>
        <a href="/privacy">Política de Privacidade</a><br>
        <a href="/terms">Termos de Uso</a><br>
        <a href="https://play.google.com/store/apps/details?id=br.com.sorteanalisada.sorteanalisada">App Sorte Analisada</a><br>
        ™ 2026 Sorte Analisada. Todos os direitos reservados.
    </div>
</footer>
</div>
</body>
</html>`;
}
