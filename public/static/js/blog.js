// ==============================
//          COMPARTILHAMENTO
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

// Funções globais (chamadas via onclick no HTML)
function compartilharWhatsApp(url) {
    compartilhamento.whatsapp(document.title || "Sorte Analisada", url);
}

function compartilharFacebook(url) {
    compartilhamento.facebook(url);
}

function compartilharTwitter(url) {
    compartilhamento.twitter(document.title || "Sorte Analisada", url);
}

function compartilharThreads(url) {
    compartilhamento.threads(document.title || "Sorte Analisada", url);
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
//      ARTIGOS EXPANSÍVEIS
// ==============================
function toggleArtigo(header, conteudo) {
    const artigoContainer = header.closest(".artigo-blog");
    const resumo = artigoContainer.querySelector(".artigo-resumo");
    const icon = header.querySelector("i");
    const isExpandido = conteudo.classList.contains("artigo-expandido");

    if (isExpandido) {
        conteudo.classList.remove("artigo-expandido");
        header.setAttribute("aria-expanded", "false");
        if (resumo) resumo.style.display = "block";
        if (icon) icon.className = "fa-solid fa-chevron-down";
    } else {
        conteudo.classList.add("artigo-expandido");
        header.setAttribute("aria-expanded", "true");
        if (resumo) resumo.style.display = "none";
        if (icon) icon.className = "fa-solid fa-chevron-up";

        const rect = artigoContainer.getBoundingClientRect();
        if (rect.top < 0) {
            setTimeout(() => {
                artigoContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
        }
    }
}

function configurarArtigos() {
    const artigos = document.querySelectorAll(".artigo-blog");

    artigos.forEach((artigo) => {
        const header = artigo.querySelector(".artigo-blog-header");
        const conteudo = artigo.querySelector(".artigo-conteudo");
        if (!header || !conteudo) return;

        conteudo.classList.remove("artigo-expandido");
        header.setAttribute("aria-expanded", "false");

        header.addEventListener("click", (e) => {
            if (e.target.closest("a") || e.target.closest(".share-container")) return;
            toggleArtigo(header, conteudo);
        });

        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleArtigo(header, conteudo);
            }
        });
    });
}

// ==============================
//      CARREGAR ARTIGOS DO JS
// ==============================
function carregarArtigos() {
    const container = document.getElementById('lista-artigos');
    if (!container) return;

    let htmlGerado = '';
    let contadorImagens = 1;

    dadosArtigos.forEach((artigo, index) => {
        // Verifica se o artigo tem imagem e alt customizados. Se não, usa o padrão sequencial.
        const nomeImagem = artigo.imagem || `blog${(contadorImagens > 11) ? 1 : contadorImagens}.jpeg`;
        const caminhoImagem = `/static/images/${nomeImagem}`; 
        
        const textoAlt = artigo.alt || artigo.titulo;
        const idArtigo = `artigo-dinamico-${index}`;
        
        const primeiroParagrafo = artigo.paragrafos[0] || "";
        const resumo = primeiroParagrafo.substring(0, 150) + "...";
        const paragrafosHTML = artigo.paragrafos.map(p => `<p>${p}</p>`).join('');

        htmlGerado += `
            <article class="artigo-blog" itemscope itemtype="https://schema.org/BlogPosting">
                <div class="artigo-blog-header" role="button" tabindex="0" aria-expanded="false" aria-controls="${idArtigo}">
                    <img src="${caminhoImagem}" alt="${textoAlt}" width="80" height="80" loading="lazy">
                    <h3 itemprop="headline">${artigo.titulo} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></h3>
                </div>
                <p class="artigo-resumo" itemprop="description">${resumo}</p>
                <div class="artigo-conteudo" id="${idArtigo}">
                    ${paragrafosHTML}
                    
                    <div class="share-container" aria-label="Compartilhar artigo">
                        Compartilhe:
                        <a href="javascript:void(0)" onclick="compartilharWhatsApp(window.location.href)" class="share-btn whatsapp"><i class="fa-brands fa-whatsapp"></i></a>
                        <a href="javascript:void(0)" onclick="compartilharFacebook(window.location.href)" class="share-btn facebook"><i class="fa-brands fa-facebook"></i></a>
                        <a href="javascript:void(0)" onclick="compartilharTwitter(window.location.href)" class="share-btn twitter"><i class="fa-brands fa-x-twitter"></i></a>
                        <a href="javascript:void(0)" onclick="copiarLink(window.location.href, event)" class="share-btn copy-link"><i class="fa-solid fa-link"></i></a>
                    </div>
                </div>
            </article>
        `;
        contadorImagens++;
    });

    container.innerHTML = htmlGerado;
    configurarArtigos();
}

// ==============================
//      GERADOR DE SCHEMA SEO
// ==============================
function gerarSchemaSEO(artigos) {
    const blogPostList = artigos.map((artigo, index) => {
        const nomeImagem = artigo.imagem || `blog${(index + 1 > 11) ? 1 : index + 1}.jpeg`;
        const urlImagem = `https://sorteanalisada.com.br/static/images/${nomeImagem}`;
        
        const primeiroParagrafo = artigo.paragrafos[0] || "";
        // Remove tags HTML do resumo e limita a 150 caracteres para o Google
        const descricaoLimpa = primeiroParagrafo.replace(/<[^>]*>?/gm, '').substring(0, 150).trim() + "...";
        
        // Data atual no formato completo ISO 8601
        const dataHoje = new Date().toISOString(); 

        return {
            "@type": "BlogPosting",
            "headline": artigo.titulo,
            "datePublished": dataHoje,
            "dateModified": dataHoje,
            // O autor e a imagem agora estão no nível do BlogPosting, como o Google exige
            "author": { 
                "@type": "Organization", 
                "name": "Sorte Analisada",
                "url": "https://sorteanalisada.com.br" 
            },
            "image": urlImagem, 
            "description": descricaoLimpa,
            "url": `https://sorteanalisada.com.br/blog#artigo${index + 1}`
        };
    });

    // Monta o objeto principal do Schema
    const schemaCompleto = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Blog Sorte Analisada",
        "description": "Blog Sorte Analisada: Explore o universo das loterias com análises de dados, estatísticas e curiosidades. Mega-Sena, Quina, Lotofácil e muito mais.",
        "url": "https://sorteanalisada.com.br/blog",
        "author": {
            "@type": "Organization",
            "name": "Sorte Analisada",
            "url": "https://sorteanalisada.com.br"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Sorte Analisada",
            "logo": {
                "@type": "ImageObject",
                "url": "https://sorteanalisada.com.br/static/images/logotipo.webp"
            }
        },
        "blogPost": blogPostList
    };

    // Cria a tag <script> no HTML e insere o JSON gerado
    const scriptTag = document.createElement('script');
    scriptTag.type = 'application/ld+json';
    scriptTag.text = JSON.stringify(schemaCompleto, null, 2);
    
    // Adiciona ao <head>
    document.head.appendChild(scriptTag);
}

// ==============================
//      INICIALIZAÇÃO
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    carregarArtigos();      
    gerarSchemaSEO(dadosArtigos); 
});
