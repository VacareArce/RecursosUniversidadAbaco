document.addEventListener('DOMContentLoaded', () => {
    
    const DATA_URL = 'Data/videos.json';
    let allVideos = [];
    
    // DOM Elements
    const videosGrid = document.getElementById('videos-grid');
    const resultsCount = document.getElementById('results-count');
    const globalSearch = document.getElementById('global-search');
    const filterTipo = document.getElementById('filter-tipo');
    const filterBanco = document.getElementById('filter-banco');
    const filterPrograma = document.getElementById('filter-programa');
    const resetBtn = document.getElementById('reset-filters');
    
    const modal = document.getElementById('video-modal');
    const btnClose = document.getElementById('close-modal');
    const videoEmbedContainer = document.getElementById('video-embed-container');
    const videoModalDetails = document.getElementById('video-modal-details');

    // Load Data
    fetch(DATA_URL)
        .then(response => response.json())
        .then(data => {
            allVideos = data;
            initializeFilters();
            renderVideos(allVideos);
        })
        .catch(err => {
            console.error('Error loading videos:', err);
            resultsCount.textContent = 'Hubo un error cargando los videos. Verifique el archivo videos.json.';
        });

    // Initialize Dropdowns
    function initializeFilters() {
        const tipos = new Set();
        const bancos = new Set();
        const programas = new Set();
        
        allVideos.forEach(v => {
            if(v.tipo) tipos.add(v.tipo);
            if(v.banco) bancos.add(v.banco);
            if(v.programa) programas.add(v.programa);
        });

        populateSelect(filterTipo, Array.from(tipos).sort());
        populateSelect(filterBanco, Array.from(bancos).sort());
        populateSelect(filterPrograma, Array.from(programas).sort());
    }

    function populateSelect(selectEl, options) {
        options.forEach(opt => {
            if (!opt) return;
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            selectEl.appendChild(option);
        });
    }

    // Render logic
    function renderVideos(videosToRender) {
        videosGrid.innerHTML = '';
        
        if (videosToRender.length === 0) {
            resultsCount.textContent = 'No se encontraron videos que coincidan con la búsqueda.';
            return;
        }

        resultsCount.textContent = `Mostrando ${videosToRender.length} video${videosToRender.length !== 1 ? 's' : ''}`;

        videosToRender.forEach(video => {
            const card = document.createElement('article');
            card.className = 'video-card';
            
            // Generate Thumbnail URL
            const thumbUrl = video.youtube_id 
                ? `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg` 
                : 'https://via.placeholder.com/640x360?text=No+Miniatura';
                
            // Use topic or programa as title, fallback to Enlace
            const displayTitle = video.tema || video.programa || "Video sin Título";

            card.innerHTML = `
                <div class="video-thumbnail-container" data-id="${video.youtube_id}">
                    <img src="${thumbUrl}" alt="Miniatura de video" class="video-thumbnail" onerror="this.src='https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg'">
                    <div class="play-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                </div>
                <div class="video-content">
                    <span class="video-tag">${video.tipo || 'General'}</span>
                    <h3 class="video-title" title="${displayTitle}">${displayTitle}</h3>
                    
                    <div class="video-meta">
                        ${video.entrevistado ? `<div class="meta-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span><strong>Exp:</strong> ${video.entrevistado}</span>
                        </div>` : ''}
                        
                        ${video.banco ? `<div class="meta-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            <span>${video.banco}</span>
                        </div>` : ''}
                        
                        ${video.programa ? `<div class="meta-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                            <span>${video.programa}</span>
                        </div>` : ''}
                    </div>

                    <div class="video-footer">
                        <span class="date">${video.fecha}</span>
                        <span class="duration">${video.tiempo || 'N/A' }</span>
                    </div>
                </div>
            `;

            // Open Modal event
            const thumbContainer = card.querySelector('.video-thumbnail-container');
            thumbContainer.addEventListener('click', () => {
                openModal(video);
            });

            videosGrid.appendChild(card);
        });
    }

    // Filter Logic
    function handleFilters() {
        const searchTerm = globalSearch.value.toLowerCase();
        const tipoVal = filterTipo.value;
        const bancoVal = filterBanco.value;
        const progVal = filterPrograma.value;

        const filtered = allVideos.filter(v => {
            // Dropdowns
            const matchTipo = !tipoVal || v.tipo === tipoVal;
            const matchBanco = !bancoVal || v.banco === bancoVal;
            const matchProg = !progVal || v.programa === progVal;

            // Search text (checks multiple fields)
            const searchText = `${v.tema} ${v.entrevistado} ${v.programa} ${v.banco} ${v.fecha}`.toLowerCase();
            const matchSearch = !searchTerm || searchText.includes(searchTerm);

            return matchTipo && matchBanco && matchProg && matchSearch;
        });

        renderVideos(filtered);
    }

    // Event Listeners for Filters
    globalSearch.addEventListener('input', handleFilters);
    filterTipo.addEventListener('change', handleFilters);
    filterBanco.addEventListener('change', handleFilters);
    filterPrograma.addEventListener('change', handleFilters);

    resetBtn.addEventListener('click', () => {
        globalSearch.value = '';
        filterTipo.value = '';
        filterBanco.value = '';
        filterPrograma.value = '';
        handleFilters();
    });

    // Modal Logic
    function openModal(video) {
        if (!video.youtube_id) {
            window.open(video.enlace, '_blank');
            return;
        }

        // Setup Iframe
        videoEmbedContainer.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${video.youtube_id}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        `;

        // Setup Details
        videoModalDetails.innerHTML = `
            <h2>${video.tema || video.programa || "Video sin Título"}</h2>
            <div class="video-details-grid">
                <div>
                    <p><strong>Programa:</strong> ${video.programa || 'N/A'}</p>
                    <p><strong>Expositor/Entrevistado:</strong> ${video.entrevistado || 'N/A'}</p>
                    <p><strong>Banco:</strong> ${video.banco || 'N/A'}</p>
                </div>
                <div>
                    <p><strong>Fecha:</strong> ${video.fecha}</p>
                    <p><strong>Duración:</strong> ${video.tiempo}</p>
                    <p><strong>Enlace:</strong> <a href="${video.enlace}" target="_blank" style="color: var(--color-secondary);">Abrir en YouTube</a></p>
                </div>
            </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeModal() {
        modal.classList.remove('active');
        videoEmbedContainer.innerHTML = ''; // Stop video playback
        document.body.style.overflow = '';
    }

    btnClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

});
