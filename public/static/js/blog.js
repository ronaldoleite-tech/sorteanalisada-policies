// ==============================
//      CONFIGURAÇÕES
// ==============================
const SITE_URL = "https://sorteanalisada.com.br";
const BLOG_URL = SITE_URL + "/blog";   // o blog agora vive em /blog (o gerador é a página inicial)
const IMAGENS_DIR = "/static/images/";
const IMAGEM_PADRAO = "logotipo.png";
// ids já usados na página (um artigo nunca pode ter um destes ids)
const IDS_RESERVADOS = ["topo", "gerador", "gerador-titulo", "gerador-loteria", "gerador-gerar", "gerador-copiar", "gerador-resultado", "gerador-status", "artigos", "destaque", "lista-artigos"];

// ==============================
//      UTILITÁRIOS
// ==============================
function escaparHTML(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function textoPuro(html) {
    return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Resumo curto, cortado no fim de uma palavra
function resumir(texto, limite = 150) {
    const limpo = textoPuro(texto);
    if (limpo.length <= limite) return limpo;
    const corte = limpo.lastIndexOf(" ", limite);
    return limpo.slice(0, corte > 0 ? corte : limite).replace(/[.,;:!?\s]+$/, "") + "...";
}

function gerarSlug(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/, "");
}

function dataValida(valor) {
    return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}/.test(valor) && !isNaN(Date.parse(valor));
}

// Schema.org exige data/hora ISO 8601 com fuso horário.
// "2026-11-22" vira "2026-11-22T00:00:00-03:00" (horário de Brasília).
function dataIso(valor) {
    if (typeof valor !== "string") return valor;
    return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor + "T00:00:00-03:00" : valor;
}

// Endereço do blog sem o #artigo
function urlBlog() {
    return window.location.origin + window.location.pathname;
}

// ==============================
//      COMPARTILHAMENTO
// ==============================
const compartilhamento = {
    whatsapp: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} - ${url}`);
        window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener");
    },

    facebook: (url) => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener");
    },

    twitter: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} ${url}`);
        window.open(`https://twitter.com/intent/tweet?text=${texto}`, "_blank", "noopener");
    },

    threads: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} ${url}`);
        window.open(`https://www.threads.net/intent/post?text=${texto}`, "_blank", "noopener");
    },

    instagram: () => {
        if (confirm("Para compartilhar no Instagram:\n\n1. Abra o Instagram\n2. Crie uma nova publicação ou story\n3. Marque @sorteanalisadaoficial\n4. Use a hashtag #SorteAnalisada\n\nDeseja abrir o Instagram?")) {
            window.open("https://www.instagram.com/sorteanalisadaoficial?igsh=cW8zenNycWVieXF1", "_blank", "noopener");
        }
    },

    tiktok: () => {
        if (confirm("Para compartilhar no TikTok:\n\n1. Abra o TikTok\n2. Crie um vídeo mencionando a Sorte Analisada\n3. Use a hashtag #SorteAnalisada\n4. Marque @sorteanalisadaoficial\n\nDeseja abrir o TikTok?")) {
            window.open("https://www.tiktok.com/", "_blank", "noopener");
        }
    }
};

// Funções globais (chamadas via onclick no HTML). O título é opcional.
function compartilharWhatsApp(url, titulo) {
    compartilhamento.whatsapp(titulo || document.title || "Sorte Analisada", url || urlBlog());
}

function compartilharFacebook(url) {
    compartilhamento.facebook(url || urlBlog());
}

function compartilharTwitter(url, titulo) {
    compartilhamento.twitter(titulo || document.title || "Sorte Analisada", url || urlBlog());
}

function compartilharThreads(url, titulo) {
    compartilhamento.threads(titulo || document.title || "Sorte Analisada", url || urlBlog());
}

function compartilharInstagram() {
    compartilhamento.instagram();
}

function compartilharTikTok() {
    compartilhamento.tiktok();
}

function copiarLink(url, event) {
    const botao = event?.target?.closest(".share-btn");

    const mostrarFeedback = () => {
        if (!botao) return;
        const textoOriginal = botao.innerHTML;
        botao.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
        botao.style.background = "var(--cor-sucesso)";
        setTimeout(() => {
            botao.innerHTML = textoOriginal;
            botao.style.background = "";
        }, 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(mostrarFeedback).catch(() => fallbackCopiar(url, mostrarFeedback));
    } else {
        fallbackCopiar(url, mostrarFeedback);
    }
}

function fallbackCopiar(url, callback) {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand("copy");
        callback();
    } catch (err) {
        alert("Falha ao copiar. Por favor, copie manualmente: " + url);
    } finally {
        document.body.removeChild(textArea);
    }
}

// ==============================
//      PREPARAÇÃO DOS DADOS
// ==============================
// Calcula id, imagem, alt, resumo e datas de cada artigo uma única vez.
// A tela e o schema usam exatamente o mesmo resultado.
function prepararArtigos(lista) {
    const usados = new Set(IDS_RESERVADOS);

    return lista.map((artigo, index) => {
        const titulo = String(artigo.titulo || "").trim();
        const paragrafos = Array.isArray(artigo.paragrafos) ? artigo.paragrafos : [];

        const base = gerarSlug(artigo.id || titulo) || `artigo-${index + 1}`;
        let id = base;
        let n = 2;
        while (usados.has(id)) id = `${base}-${n++}`;
        usados.add(id);

        const imagem = artigo.imagem || IMAGEM_PADRAO;
        const imagemUrl = /^(https?:)?\/\//.test(imagem) || imagem.startsWith("/") ? imagem : IMAGENS_DIR + imagem;

        return {
            id,
            titulo,
            paragrafos,
            imagemUrl,
            alt: artigo.alt || titulo,
            resumo: artigo.resumo ? textoPuro(artigo.resumo) : resumir(paragrafos[0] || ""),
            data: dataValida(artigo.data) ? artigo.data : null,
            atualizado: dataValida(artigo.atualizado) ? artigo.atualizado : null
        };
    });
}

// ==============================
//      RENDERIZAÇÃO DOS ARTIGOS
// ==============================
function criarHTMLArtigo(a) {
    const idConteudo = `${a.id}-conteudo`;
    const urlArtigo = `${urlBlog()}#${a.id}`;
    const paragrafosHTML = a.paragrafos.map(p => `<p>${p}</p>`).join("");

    return `
        <article class="artigo-blog" id="${a.id}" data-titulo="${escaparHTML(a.titulo)}">
            <div class="artigo-blog-header">
                <img src="${escaparHTML(a.imagemUrl)}" alt="${escaparHTML(a.alt)}" width="80" height="80" loading="lazy">
                <h3>
                    <button type="button" class="artigo-toggle" aria-expanded="false" aria-controls="${idConteudo}">
                        ${escaparHTML(a.titulo)} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
                    </button>
                </h3>
            </div>
            <p class="artigo-resumo">${escaparHTML(a.resumo)}</p>
                <div class="artigo-conteudo" id="${idConteudo}">
                ${paragrafosHTML}

                <div class="share-container" aria-label="Compartilhar artigo">
                    Compartilhe:
                    <a href="${urlArtigo}" data-share="whatsapp" class="share-btn whatsapp" aria-label="Compartilhar no WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a>
                    <a href="${urlArtigo}" data-share="facebook" class="share-btn facebook" aria-label="Compartilhar no Facebook"><i class="fa-brands fa-facebook" aria-hidden="true"></i></a>
                    <a href="${urlArtigo}" data-share="twitter" class="share-btn twitter" aria-label="Compartilhar no X (Twitter)"><i class="fa-brands fa-x-twitter" aria-hidden="true"></i></a>
                    <a href="${urlArtigo}" data-share="threads" class="share-btn threads" aria-label="Compartilhar no Threads"><i class="fa-brands fa-threads" aria-hidden="true"></i></a>
                    <a href="${urlArtigo}" data-share="instagram" class="share-btn instagram" aria-label="Compartilhar no Instagram"><i class="fa-brands fa-instagram" aria-hidden="true"></i></a>
                    <a href="${urlArtigo}" data-share="tiktok" class="share-btn tiktok" aria-label="Compartilhar no TikTok"><i class="fa-brands fa-tiktok" aria-hidden="true"></i></a>
                    <a href="${urlArtigo}" data-share="copy" class="share-btn copy-link" aria-label="Copiar link do artigo"><i class="fa-solid fa-link" aria-hidden="true"></i></a>
                </div>
            </div>
        </article>
    `;
}

function carregarArtigos(artigos) {
    const container = document.getElementById("lista-artigos");
    if (!container) return;

    container.innerHTML = artigos.map(criarHTMLArtigo).join("");

    // Todos os cliques da lista passam por UM único listener (delegação de eventos).
    // Regra: a PRIMEIRA ação cujo seletor combina trata o clique e encerra ("return").
    // Assim, um mesmo clique nunca executa duas ações.
    // Para dar tratamento próprio ao botão .artigo-toggle no futuro, acrescente aqui uma
    // ação com seletor ".artigo-toggle" ANTES de ".artigo-blog-header" (e não crie um
    // listener separado no botão, para não duplicar a chamada de alternarArtigo).
    const acoesDoClique = [
        {
            // Botões de compartilhar do artigo
            seletor: "[data-share]",
            tratar: (botao, e) => {
                e.preventDefault();

                const artigo = botao.closest(".artigo-blog");
                const titulo = artigo.dataset.titulo;
                const url = `${urlBlog()}#${artigo.id}`;

                switch (botao.dataset.share) {
                    case "whatsapp": compartilharWhatsApp(url, titulo); break;
                    case "facebook": compartilharFacebook(url); break;
                    case "twitter":  compartilharTwitter(url, titulo); break;
                    case "threads":  compartilharThreads(url, titulo); break;
                    case "instagram": compartilharInstagram(); break;
                    case "tiktok":   compartilharTikTok(); break;
                    case "copy":     copiarLink(url, e); break;
                }
            }
        },
        {
            // Cabeçalho do artigo: imagem, título (h3), botão .artigo-toggle e a área ao redor.
            // O teclado também passa por aqui: Enter/Espaço no <button> geram um "click".
            seletor: ".artigo-blog-header",
            tratar: (cabecalho) => {
                alternarArtigo(cabecalho.closest(".artigo-blog"), undefined, true);
            }
        }
    ];

    container.addEventListener("click", (e) => {
        for (const acao of acoesDoClique) {
            const alvo = e.target.closest(acao.seletor);
            if (alvo && container.contains(alvo)) {
                acao.tratar(alvo, e);
                return;
            }
        }
    });
}

// ==============================
//      ALTURA DO CONTEÚDO (animação sem limite fixo)
// ==============================
// A altura que anima é a altura REAL do texto (scrollHeight), então nenhum artigo é cortado,
// por mais longo que seja. Terminada a animação, a altura é liberada ("none"): se a tela girar
// ou for redimensionada, o texto se ajusta sozinho.
const DURACAO_TRANSICAO_MS = 600;            // = transição de max-height em blog.css (0.6s)
const temporizadoresAltura = new WeakMap();  // evita timers antigos em cliques rápidos

function ajustarAlturaDoConteudo(conteudo, expandir) {
    const jaExpandido = conteudo.classList.contains("artigo-expandido");
    if (expandir === jaExpandido) return; // já está no estado pedido

    clearTimeout(temporizadoresAltura.get(conteudo));

    if (expandir) {
        conteudo.classList.add("artigo-expandido");
        const altura = conteudo.scrollHeight; // inclui o padding
        // se não for possível medir (altura 0), não limita a altura
        conteudo.style.maxHeight = altura > 0 ? `${altura}px` : "none";
        temporizadoresAltura.set(conteudo, setTimeout(() => {
            if (conteudo.classList.contains("artigo-expandido")) conteudo.style.maxHeight = "none";
        }, DURACAO_TRANSICAO_MS + 50));
    } else {
        // 1) fixa a altura atual (estava "none"); 2) faz o navegador registrá-la; 3) anima até 0
        const altura = conteudo.scrollHeight;
        if (altura > 0) conteudo.style.maxHeight = `${altura}px`;
        void conteudo.offsetHeight;
        conteudo.classList.remove("artigo-expandido");
        conteudo.style.maxHeight = "";
    }
}

// ==============================
//      ABRIR / FECHAR ARTIGO
// ==============================
function alternarArtigo(artigo, abrir, atualizarURL) {
    const botao = artigo.querySelector(".artigo-toggle");
    const conteudo = artigo.querySelector(".artigo-conteudo");
    const resumo = artigo.querySelector(".artigo-resumo");
    const icone = botao ? botao.querySelector("i") : null;
    if (!botao || !conteudo) return;

    const expandir = abrir === undefined ? !conteudo.classList.contains("artigo-expandido") : abrir;

    ajustarAlturaDoConteudo(conteudo, expandir);
    botao.setAttribute("aria-expanded", String(expandir));
    if (resumo) resumo.style.display = expandir ? "none" : "block";
    if (icone) icone.className = expandir ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";

    if (atualizarURL) {
        // Deixa na barra de endereço o link do artigo aberto (sem criar histórico)
        if (expandir) {
            history.replaceState(null, "", `#${artigo.id}`);
        } else if (window.location.hash === `#${artigo.id}`) {
            history.replaceState(null, "", window.location.pathname + window.location.search);
        }
    }

    if (expandir) {
        const rect = artigo.getBoundingClientRect();
        if (rect.top < 0) {
            setTimeout(() => {
                artigo.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
        }
    }
}

// Abre o artigo indicado em blog#id (links compartilhados)
function abrirArtigoDoHash() {
    let id = "";
    try {
        id = decodeURIComponent(window.location.hash.slice(1));
    } catch (e) {
        return;
    }
    if (!id) return;

    const artigo = document.getElementById(id);
    if (!artigo || !artigo.classList.contains("artigo-blog")) return;

    alternarArtigo(artigo, true, false);
    setTimeout(() => {
        artigo.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
}

// ==============================
//      GERADOR DE SCHEMA SEO
// ==============================
function gerarSchemaSEO(artigos) {
    const blogPostList = artigos.map((a) => {
        const post = {
            "@type": "BlogPosting",
            "headline": a.titulo,
            "author": {
                "@type": "Organization",
                "name": "Sorte Analisada",
                "url": SITE_URL
            },
            "image": new URL(a.imagemUrl, SITE_URL).href,
            "description": a.resumo,
            "url": `${BLOG_URL}#${a.id}`
        };
        // As datas só entram no schema quando informadas em dados-artigos.js
        if (a.data) post.datePublished = dataIso(a.data);
        if (a.atualizado || a.data) post.dateModified = dataIso(a.atualizado || a.data);
        return post;
    });

    const schemaCompleto = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Blog Sorte Analisada",
        "description": "Blog Sorte Analisada: Explore o universo das loterias com análises de dados, estatísticas e curiosidades. Mega-Sena, Quina, Lotofácil e muito mais.",
        "url": BLOG_URL,
        "inLanguage": "pt-BR",
        "author": {
            "@type": "Organization",
            "name": "Sorte Analisada",
            "url": SITE_URL
        },
        "publisher": {
            "@type": "Organization",
            "name": "Sorte Analisada",
            "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/static/images/logotipo.webp`
            }
        },
        "blogPost": blogPostList
    };

    const scriptTag = document.createElement("script");
    scriptTag.type = "application/ld+json";
    scriptTag.text = JSON.stringify(schemaCompleto, null, 2);
    document.head.appendChild(scriptTag);
}

// ==============================
//      INICIALIZAÇÃO
// ==============================
function iniciarBlog() {
    const container = document.getElementById("lista-artigos");

    if (typeof dadosArtigos === "undefined" || !Array.isArray(dadosArtigos)) {
        console.error("dados-artigos.js não foi carregado ou tem erro de sintaxe.");
        if (container) container.innerHTML = "<p>Não foi possível carregar os artigos no momento.</p>";
        return;
    }

    const artigos = prepararArtigos(dadosArtigos);
    carregarArtigos(artigos);
    gerarSchemaSEO(artigos);
    abrirArtigoDoHash();
    window.addEventListener("hashchange", abrirArtigoDoHash);
}

document.addEventListener("DOMContentLoaded", iniciarBlog);
