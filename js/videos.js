document.addEventListener('DOMContentLoaded', () => {
    
    const configuredDataUrl = window.ABACO_CONFIG && typeof window.ABACO_CONFIG.dataUrl === 'string'
        ? window.ABACO_CONFIG.dataUrl.trim()
        : '';
    const configuredIndexUrl = window.ABACO_CONFIG && typeof window.ABACO_CONFIG.indexUrl === 'string'
        ? window.ABACO_CONFIG.indexUrl.trim()
        : '';
    const LOCAL_DATA_URL = 'Data/videos.json';
    const dataSources = [];
    if (configuredDataUrl) {
        dataSources.push(configuredDataUrl);
    }
    if (!dataSources.includes(LOCAL_DATA_URL)) {
        dataSources.push(LOCAL_DATA_URL);
    }
    let allVideos = [];
    
    // DOM Elements
    const videosGrid = document.getElementById('videos-grid');
    const resultsCount = document.getElementById('results-count');
    const globalSearch = document.getElementById('global-search');
    const filterTipo = document.getElementById('filter-tipo');
    const filterBanco = document.getElementById('filter-banco');
    const filterPrograma = document.getElementById('filter-programa');
    const filterYear = document.getElementById('filter-year');
    const dateStart = document.getElementById('filter-date-start');
    const dateEnd = document.getElementById('filter-date-end');
    const sortButtons = document.querySelectorAll('.btn-sort');
    const resetBtn = document.getElementById('reset-filters');
    
    let currentSort = { field: 'date', dir: 'desc' };
    
    const modal = document.getElementById('video-modal');
    const btnClose = document.getElementById('close-modal');
    const videoEmbedContainer = document.getElementById('video-embed-container');
    const videoModalDetails = document.getElementById('video-modal-details');

    loadVideos();

    function loadVideos() {
        if (configuredIndexUrl) {
            loadVideosFromIndex(configuredIndexUrl).catch(err => {
                console.error(`Error loading videos index from ${configuredIndexUrl}:`, err);
                loadVideosFromSources(0);
            });
            return;
        }

        loadVideosFromSources(0);
    }

    function loadVideosFromIndex(indexUrl) {
        return fetch(indexUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(index => {
                const files = Array.isArray(index.files) ? index.files : [];
                if (files.length === 0) {
                    throw new Error('No year files found in videos index.');
                }

                return Promise.all(files.map(file => {
                    const fileUrl = typeof file === 'string' ? file : file.url;
                    if (!fileUrl) return [];

                    return fetch(resolveUrl(fileUrl))
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(normalizeVideos);
                }));
            })
            .then(yearGroups => {
                allVideos = yearGroups.flat();
                if (allVideos.length === 0) {
                    resultsCount.textContent = 'No hay videos disponibles para mostrar.';
                    return;
                }

                initializeFilters();
                renderVideos(allVideos);
            });
    }

    function loadVideosFromSources(index) {
        if (index >= dataSources.length) {
            resultsCount.textContent = 'Hubo un error cargando los videos. Verifique la fuente de datos configurada.';
            return;
        }

        const sourceUrl = dataSources[index];

        fetch(sourceUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                allVideos = normalizeVideos(data);
                if (allVideos.length === 0) {
                    resultsCount.textContent = 'No hay videos disponibles para mostrar.';
                    return;
                }

                initializeFilters();
                renderVideos(allVideos);
            })
            .catch(err => {
                console.error(`Error loading videos from ${sourceUrl}:`, err);
                loadVideosFromSources(index + 1);
            });
    }

    function normalizeVideos(payload) {
        let videos = [];
        if (Array.isArray(payload)) {
            videos = payload;
        } else if (payload && Array.isArray(payload.videos)) {
            videos = payload.videos;
        }

        return videos.map(video => ({
            ...video,
            year: video.year || getYearFromDate(video.fecha)
        }));
    }

    function resolveUrl(url) {
        return new URL(url, window.location.origin).href;
    }

    function getYearFromDate(dateStr) {
        if (!dateStr) return '';
        const parts = String(dateStr).split('/');
        return parts.length === 3 ? String(parts[2]) : '';
    }

    // Initialize Dropdowns
    function initializeFilters() {
        const tipos = new Set();
        const bancos = new Set();
        const programas = new Set();
        const years = new Set();
        let minDate = null;
        let maxDate = null;
        
        allVideos.forEach(v => {
            if(v.tipo) tipos.add(v.tipo);
            if(v.banco) bancos.add(v.banco);
            if(v.programa) programas.add(v.programa);
            if(v.year) years.add(String(v.year));
            
            const vDate = parseDate(v.fecha);
            if(vDate) {
                if(!minDate || vDate < minDate) minDate = vDate;
                if(!maxDate || vDate > maxDate) maxDate = vDate;
            }
        });

        populateSelect(filterTipo, Array.from(tipos).sort());
        populateSelect(filterBanco, Array.from(bancos).sort());
        populateSelect(filterPrograma, Array.from(programas).sort());
        if (filterYear) {
            populateSelect(filterYear, Array.from(years).sort((a, b) => Number(b) - Number(a)));
        }
        
        // Configurar fechas límites
        if(minDate && maxDate) {
            const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            dateStart.value = fmt(minDate);
            dateStart.dataset.defaultVal = fmt(minDate);
            dateEnd.value = fmt(maxDate);
            dateEnd.dataset.defaultVal = fmt(maxDate);
        }
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

    // Helper function to parse 'DD/MM/YYYY' into a Date object
    function parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return null; // fallback
    }

    // Helper function to parse 'HH:MM:SS' or 'MM:SS' into seconds
    function parseDuration(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.trim().split(':').map(Number);
        if (parts.length === 3) { // HH:MM:SS
            return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        } else if (parts.length === 2) { // MM:SS
            return (parts[0] * 60) + parts[1];
        }
        return parseInt(timeStr) || 0;
    }

    // Filter Logic
    function handleFilters() {
        const searchTerm = globalSearch.value.toLowerCase();
        const tipoVal = filterTipo.value;
        const bancoVal = filterBanco.value;
        const progVal = filterPrograma.value;
        const yearVal = filterYear ? filterYear.value : '';
        const startVal = dateStart.value ? new Date(dateStart.value + 'T00:00:00') : null;
        let endVal = dateEnd.value ? new Date(dateEnd.value + 'T00:00:00') : null;

        // If endVal is selected, extend to the end of that day locally
        if (endVal) {
            endVal.setHours(23, 59, 59, 999);
        }

        const filtered = allVideos.filter(v => {
            // Dropdowns
            const matchTipo = !tipoVal || v.tipo === tipoVal;
            const matchBanco = !bancoVal || v.banco === bancoVal;
            const matchProg = !progVal || v.programa === progVal;
            const matchYear = !yearVal || String(v.year) === yearVal;

            // Date Range
            let matchDate = true;
            if (startVal || endVal) {
                const videoDate = parseDate(v.fecha);
                if (videoDate) {
                    if (startVal && videoDate < startVal) matchDate = false;
                    if (endVal && videoDate > endVal) matchDate = false;
                } else {
                    // if it has no valid date, optionally hide it when filtering by date
                    matchDate = false;
                }
            }

            // Search text (checks multiple fields)
            const searchText = `${v.tema} ${v.entrevistado} ${v.programa} ${v.banco} ${v.fecha} ${v.year}`.toLowerCase();
            const matchSearch = !searchTerm || searchText.includes(searchTerm);

            return matchTipo && matchBanco && matchProg && matchYear && matchSearch && matchDate;
        });

        // Sorting Logic
        filtered.sort((a, b) => {
            let res = 0;
            if (currentSort.field === 'date') {
                const dateA = parseDate(a.fecha) || new Date(0);
                const dateB = parseDate(b.fecha) || new Date(0);
                res = dateA - dateB;
            } else if (currentSort.field === 'banco') {
                res = (a.banco || '').localeCompare(b.banco || '');
            } else if (currentSort.field === 'programa') {
                res = (a.programa || '').localeCompare(b.programa || '');
            } else if (currentSort.field === 'duracion') {
                const durA = parseDuration(a.tiempo);
                const durB = parseDuration(b.tiempo);
                res = durA - durB;
            }
            return currentSort.dir === 'asc' ? res : -res;
        });

        renderVideos(filtered);
    }

    // Event Listeners for Filters
    globalSearch.addEventListener('input', handleFilters);
    filterTipo.addEventListener('change', handleFilters);
    filterBanco.addEventListener('change', handleFilters);
    filterPrograma.addEventListener('change', handleFilters);
    if (filterYear) {
        filterYear.addEventListener('change', handleFilters);
    }
    dateStart.addEventListener('change', handleFilters);
    dateEnd.addEventListener('change', handleFilters);

    function updateSortButtonsUI() {
        sortButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.querySelector('.sort-arrow').textContent = '';
        });
        
        const activeBtn = Array.from(sortButtons).find(b => b.dataset.sort === currentSort.field);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.querySelector('.sort-arrow').textContent = currentSort.dir === 'asc' ? '↑' : '↓';
        }
    }

    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.sort;
            if (currentSort.field === field) {
                // toggle direction
                currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                // switch field and default direction
                currentSort.field = field;
                // date/duration naturally desc initially, others asc
                currentSort.dir = (field === 'date' || field === 'duracion') ? 'desc' : 'asc';
            }
            updateSortButtonsUI();
            handleFilters();
        });
    });

    resetBtn.addEventListener('click', () => {
        globalSearch.value = '';
        filterTipo.value = '';
        filterBanco.value = '';
        filterPrograma.value = '';
        if (filterYear) {
            filterYear.value = '';
        }
        dateStart.value = dateStart.dataset.defaultVal || '';
        dateEnd.value = dateEnd.dataset.defaultVal || '';
        currentSort = { field: 'date', dir: 'desc' };
        updateSortButtonsUI();
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
