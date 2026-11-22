// ==============================
//          UTILITÁRIOS GLOBAIS
// ==============================
function getElement(id) { return document.getElementById(id); }
function getElements(selector) { return document.querySelectorAll(selector); }

// ==============================
//      COMPARTILHAMENTO
// ==============================
const compartilhamento = {
    whatsapp: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} - ${url}`);
        window.open(`https://wa.me/?text=${texto}`, "_blank");
    },
    
    facebook: (url) => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    },
    
    twitter: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} ${url}`);
        window.open(`https://twitter.com/intent/tweet?text=${texto}`, "_blank");
    },
    
    threads: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} ${url}`);
        window.open(`https://www.threads.net/intent/post?text=${texto}`, "_blank");
    },
    
    instagram: () => {
        if (confirm("Para compartilhar no Instagram:\n\n1. Abra o Instagram\n2. Crie uma nova publicação ou story\n3. Marque @sorteanalisadaoficial\n4. Use a hashtag #SorteAnalisada\n\nDeseja abrir o Instagram?")) {
            window.open("https://www.instagram.com/sorteanalisadaoficial?igsh=cW8zenNycWVieXF1", "_blank");
        }
    },
    
    tiktok: () => {
        if (confirm("Para compartilhar no TikTok:\n\n1. Abra o TikTok\n2. Crie um vídeo mencionando a Sorte Analisada\n3. Use a hashtag #SorteAnalisada\n4. Marque @sorteanalisadaoficial\n\nDeseja abrir o TikTok?")) {
            window.open("https://www.tiktok.com/", "_blank");
        }
    }
};

// Funções de compartilhamento
function compartilharWhatsApp(url) { 
    const titulo = document.title || "Sorte Analisada";
    compartilhamento.whatsapp(titulo, url); 
}

function compartilharFacebook(url) { 
    compartilhamento.facebook(url); 
}

function compartilharTwitter(url) { 
    const titulo = document.title || "Sorte Analisada";
    compartilhamento.twitter(titulo, url); 
}

function compartilharThreads(url) { 
    const titulo = document.title || "Sorte Analisada";
    compartilhamento.threads(titulo, url); 
}

function compartilharInstagram() { 
    compartilhamento.instagram(); 
}

function compartilharTikTok() { 
    compartilhamento.tiktok(); 
}

function copiarLink(url, event) {
    navigator.clipboard.writeText(url).then(() => {
        const botao = event?.target?.closest(".share-btn");
        if (botao) {
            const textoOriginal = botao.innerHTML;
            botao.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
            botao.style.background = "var(--cor-sucesso)";
            
            setTimeout(() => {
                botao.innerHTML = textoOriginal;
                botao.style.background = "#6c757d";
            }, 2000);
        }
    }).catch(error => {
        console.error("Falha ao copiar:", error);
        
        // Fallback para navegadores antigos
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand("copy");
            alert("Link copiado!");
        } catch (err) {
            alert("Falha ao copiar. Por favor, copie manualmente: " + url);
        }
        
        document.body.removeChild(textArea);
    });
}

// ==============================
//         UI E NAVEGAÇÃO
// ==============================
function configurarDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('a:first-child');
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('active');
        });
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(d => d.classList.remove('active'));
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    configurarDropdowns();
});




// ==============================
//      VARIÁVEIS DO BLOG
// ==============================
let artigosVisiveis = 5;
const totalArtigos = 11;

// ==============================
//      INICIALIZAÇÃO DO BLOG
// ==============================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Blog.js carregado - Inicializando...');
    
    // Inicializar estado dos artigos
    inicializarArtigos();
    
    // Configurar event listeners
    configurarEventListenersBlog();
    
    // Atualizar contador
    atualizarContadorArtigos();
});

// ==============================
//      INICIALIZAÇÃO DOS ARTIGOS
// ==============================
function inicializarArtigos() {
    const artigos = getElements(".artigo-blog");
    console.log(`Inicializando ${artigos.length} artigos`);
    
    artigos.forEach((artigo, index) => {
        // Mostrar apenas os primeiros artigos
        if (index < artigosVisiveis) {
            artigo.classList.add("visivel");
        } else {
            artigo.classList.remove("visivel");
        }
        
        // Inicializar conteúdo (fechado)
        const conteudo = artigo.querySelector('.artigo-conteudo');
        const resumo = artigo.querySelector('.artigo-resumo');
        const icon = artigo.querySelector('.artigo-blog-header i');
        
        if (conteudo) {
            conteudo.classList.remove('artigo-expandido');
        }
        if (resumo) {
            resumo.style.display = 'block';
        }
        if (icon) {
            icon.className = 'fa-solid fa-chevron-down';
        }
    });
}

// ==============================
//      CONFIGURAÇÃO DE EVENT LISTENERS DO BLOG
// ==============================
function configurarEventListenersBlog() {
    console.log('Configurando event listeners do blog...');
    
    // Botão carregar mais artigos
    const botaoCarregarMais = document.querySelector(".carregar-mais");
    if (botaoCarregarMais) {
        botaoCarregarMais.addEventListener("click", carregarMaisArtigos);
        console.log('Event listener adicionado ao botão carregar mais');
    } else {
        console.log('Botão carregar mais não encontrado');
    }
    
    // Configurar toggle dos artigos
    const artigos = getElements(".artigo-blog");
    console.log(`Encontrados ${artigos.length} artigos`);
    
    artigos.forEach(artigo => {
        // Inicializar estado dos artigos (todos fechados)
        const conteudo = artigo.querySelector('.artigo-conteudo');
        const resumo = artigo.querySelector('.artigo-resumo');
        const icon = artigo.querySelector('.artigo-blog-header i');
        
        if (conteudo) {
            conteudo.classList.remove('artigo-expandido'); // Garantir que começa fechado
        }
        if (resumo) {
            resumo.style.display = 'block'; // Resumo visível
        }
        if (icon) {
            icon.className = 'fa-solid fa-chevron-down'; // Ícone para baixo
        }
        
        // Adicionar event listener para toggle
        artigo.addEventListener("click", function(e) {
            console.log('Clicou no artigo');
            
            // Evitar que o toggle aconteça quando clicar em links de compartilhamento ou outros elementos
            if (e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('.share-container')) {
                console.log('Clicou em link/compartilhamento - ignorando toggle');
                return;
            }
            
            const artigoConteudo = this.querySelector('.artigo-conteudo');
            if (artigoConteudo && artigoConteudo.id) {
                console.log('Toggle no artigo:', artigoConteudo.id);
                toggleArtigo(artigoConteudo.id);
            } else {
                console.log('Conteúdo do artigo não encontrado ou sem ID');
            }
        });
    });
}