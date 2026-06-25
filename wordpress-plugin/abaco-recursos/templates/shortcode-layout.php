<main class="dashboard-container">
    <aside class="sidebar-filters">
        <div class="filter-header">
            <h2>Filtros</h2>
            <button id="reset-filters" class="btn-reset">Limpiar</button>
        </div>

        <div class="filter-group">
            <label for="filter-date-start">Desde (Fecha de Evento)</label>
            <input type="date" id="filter-date-start" class="filter-select">
        </div>

        <div class="filter-group">
            <label for="filter-date-end">Hasta (Fecha de Evento)</label>
            <input type="date" id="filter-date-end" class="filter-select">
        </div>

        <div class="filter-group">
            <label for="filter-tipo">Tipo de Contenido</label>
            <select id="filter-tipo" class="filter-select">
                <option value="">Todos</option>
            </select>
        </div>

        <div class="filter-group">
            <label for="filter-banco">Banco de Alimentos</label>
            <select id="filter-banco" class="filter-select">
                <option value="">Todos</option>
            </select>
        </div>

        <div class="filter-group">
            <label for="filter-programa">Programa</label>
            <select id="filter-programa" class="filter-select">
                <option value="">Todos</option>
            </select>
        </div>

        <div class="filter-group">
            <label for="filter-year">Año</label>
            <select id="filter-year" class="filter-select">
                <option value="">Todos</option>
            </select>
        </div>

        <div class="sponsor-notice">
            <p>Estos espacios de noticias son donados por <strong>Colmundo Radio</strong>.</p>
        </div>
    </aside>

    <section class="videos-section">
        <div class="search-bar-container">
            <div class="search-input-wrapper">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="global-search" placeholder="Busca por palabra clave, tema o entrevistado...">
            </div>
        </div>

        <div class="results-header">
            <h2 id="results-count">Cargando videos...</h2>
            <div class="sort-toolbar">
                <span class="sort-label">Ordenar:</span>
                <button class="btn-sort active" data-sort="date" data-dir="desc">Fecha <span class="sort-arrow">↓</span></button>
                <button class="btn-sort" data-sort="banco" data-dir="asc">Banco <span class="sort-arrow"></span></button>
                <button class="btn-sort" data-sort="programa" data-dir="asc">Programa <span class="sort-arrow"></span></button>
                <button class="btn-sort" data-sort="duracion" data-dir="desc">Duración <span class="sort-arrow"></span></button>
            </div>
        </div>

        <div id="videos-grid" class="videos-grid"></div>
    </section>
</main>

<div id="video-modal" class="modal">
    <div class="modal-content">
        <button id="close-modal" class="btn-close">&times;</button>
        <div class="video-container" id="video-embed-container"></div>
        <div class="video-details" id="video-modal-details"></div>
    </div>
</div>
