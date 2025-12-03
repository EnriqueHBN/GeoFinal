const API_BASE = 'http://localhost:3001';

let map;
let currentUser;
let puntosInteres = [];
let servicios = [];
let zonas = [];
let allLocations = [];
let lastFocusedLocationId = null;
let drawingMode = false;
let currentAction = null;
let markersLayer = L.layerGroup();
let zonasLayer = L.layerGroup();

// Variables para el dibujo de polígonos
let polygonPoints = [];
let currentPolygon = null;

// Iconos personalizados
const createCustomIcon = (color, iconClass) => {
    return L.divIcon({
        html: `<i class="fas ${iconClass}" style="color: ${color}; font-size: 20px; background: rgba(255,255,255,0.06); padding: 8px; border-radius: 50%; border: 2px solid ${color};"></i>`,
        className: 'custom-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
};

const iconPuntoInteres = createCustomIcon('#e74c3c', 'fa-map-marker-alt');
const iconServicio = createCustomIcon('#3498db', 'fa-utensils');

document.addEventListener('DOMContentLoaded', function() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = '/';
        return;
    }

    initializeMap();
    loadData();
    setupEventListeners();
});

function initializeMap() {
    map = L.map('map').setView([19.4326, -99.1332], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markersLayer.addTo(map);
    zonasLayer.addTo(map);

    addDrawingTools();
}

function addDrawingTools() {
    const toolbar = document.getElementById('toolBar');
    if (!toolbar) return;
    toolbar.innerHTML = `
        <button class="tool-pill tool-btn" data-action="punto-interes">Lugar Turístico</button>
        <button class="tool-pill tool-btn" data-action="servicio">Restaurante</button>
        <button class="tool-pill tool-btn" data-action="zona-polygon">Campo de zona circular</button>
        <button class="tool-pill tool-btn" data-action="zona-rectangle">Campo de zona rectangular</button>
    `;
}

function setupEventListeners() {
    map.getContainer().addEventListener('click', function(e) {
        if (e.target.closest('.tool-btn')) {
            const button = e.target.closest('.tool-btn');
            const action = button.getAttribute('data-action');
            handleToolAction(action, button);
        }
    });

    // Also listen on toolbar container for direct clicks
    const toolbar = document.getElementById('toolBar');
    if (toolbar) {
        toolbar.addEventListener('click', function(e) {
            if (e.target.closest('.tool-btn')) {
                const button = e.target.closest('.tool-btn');
                const action = button.getAttribute('data-action');
                handleToolAction(action, button);
            }
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const value = e.target.value;
            filterTable(value);
            focusLocationByName(value);
        });

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusLocationByName(e.target.value, { allowPartial: true, force: true });
            }
        });
    }

    document.getElementById('btnLogout').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.setAttribute('aria-expanded', 'true');
        toggleSidebarBtn.setAttribute('aria-label', 'Ocultar lista de ubicaciones');
        toggleSidebarBtn.addEventListener('click', function() {
            const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
            toggleSidebarBtn.setAttribute('aria-expanded', String(!isCollapsed));
            toggleSidebarBtn.setAttribute(
                'aria-label',
                isCollapsed ? 'Mostrar lista de ubicaciones' : 'Ocultar lista de ubicaciones'
            );

            if (map) {
                map.invalidateSize();
                setTimeout(function() {
                    map.invalidateSize();
                }, 320);
            }
        });
    }
}

function handleToolAction(action, button) {
    cleanupDrawing();
    
    currentAction = action;
    drawingMode = true;
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    button.classList.add('active');
    
    const instructions = document.getElementById('drawing-instructions');
    
    switch(action) {
        case 'punto-interes':
            instructions.innerHTML = '<p>Haz clic en el mapa para colocar un Punto de Interés</p>';
            setupMapClickForMarker('punto');
            break;
        case 'servicio':
            instructions.innerHTML = '<p>Haz clic en el mapa para colocar un Servicio</p>';
            setupMapClickForMarker('servicio');
            break;
        case 'review':
            instructions.innerHTML = '<p>Haz clic en un Punto de Interés o Servicio existente para agregar una reseña</p>';
            setupMapClickForReview();
            break;
        case 'zona-polygon':
            instructions.innerHTML = '<p>Haz clic en el mapa para agregar puntos al polígono. Doble clic para terminar.</p>';
            startPolygonDrawing();
            break;
        case 'zona-rectangle':
            instructions.innerHTML = '<p>Haz clic y arrastra para dibujar un rectángulo</p>';
            startRectangleDrawing();
            break;
        case 'cancel':
            cancelDrawing();
            break;
    }
}

function setupMapClickForMarker(tipo) {
    const clickHandler = function(e) {
        if (currentAction && (currentAction === 'punto-interes' || currentAction === 'servicio')) {
            if (tipo === 'punto') {
                createPuntoInteres(e.latlng);
            } else {
                createServicio(e.latlng);
            }
        }
    };
    
    map.on('click', clickHandler);
    map._currentClickHandler = clickHandler;
}

function setupMapClickForReview() {
    const clickHandler = function(e) {
        if (currentAction === 'review') {
            checkForExistingLocation(e.latlng);
        }
    };
    
    map.on('click', clickHandler);
    map._currentClickHandler = clickHandler;
}

// El anterior doble click no funcionaba casi nunca.
function startPolygonDrawing() {
    polygonPoints = [];
    currentPolygon = null;

    document.getElementById("finishPolygonBtn").style.display = "block";

    map._clickHandler = e => {
        polygonPoints.push(e.latlng);

        if (currentPolygon) map.removeLayer(currentPolygon);

        if (polygonPoints.length >= 2 && document.getElementById("finishPolygonBtn").style.display === "block") {
            currentPolygon = L.polygon(polygonPoints, {
                color: "#27ae60",
                fillColor: "#27ae60",
                fillOpacity: 0.3,
                weight: 2
            }).addTo(map);
        }
    };

    map.on("click", map._clickHandler);

    document.getElementById("finishPolygonBtn").onclick = finishPolygonDrawing;
}

function finishPolygonDrawing() {
    if (polygonPoints.length < 3) {
        showMessage("Necesitas al menos 3 puntos", "warning");
        return;
    }

    map.off("click", map._clickHandler);

    document.getElementById("finishPolygonBtn").style.display = "none";

    showPolygonCreationForm(currentPolygon, polygonPoints);
}



function startRectangleDrawing() {
    let startPoint = null;
    let rectangle = null;
    map.dragging.disable();

    const mouseDownHandler = function(e) {
        startPoint = e.latlng;
        rectangle = L.rectangle([startPoint, startPoint], {
            color: '#e67e22',
            fillColor: '#e67e22',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(map);
        
    };

    const mouseMoveHandler = function(e) {
        
        if (rectangle && startPoint) {
            const bounds = L.latLngBounds([startPoint, e.latlng]);
            rectangle.setBounds(bounds);
            
        }
    };

    const mouseUpHandler = function(e) {
        if (rectangle && startPoint) {
            const bounds = rectangle.getBounds();
            const area = (bounds.getNorth() - bounds.getSouth()) * (bounds.getEast() - bounds.getWest());
            
            if (Math.abs(area) < 0.000001) {
                showMessage('El rectángulo es muy pequeño. Intenta con un área más grande.', 'warning');
                map.removeLayer(rectangle);
            } else {
                showRectangleCreationForm(rectangle);
                console.log("sip")
            }
            map.dragging.enable();
            cleanupRectangleDrawing();
            map.removeLayer(rectangle);
        }
    };

    map.on('mousedown', mouseDownHandler);
    map.on('mousemove', mouseMoveHandler);
    map.on('mouseup', mouseUpHandler);

    map._rectangleMouseDown = mouseDownHandler;
    map._rectangleMouseMove = mouseMoveHandler;
    map._rectangleMouseUp = mouseUpHandler;
}

function cleanupDrawing() {
    if (map._currentClickHandler) {
        map.off('click', map._currentClickHandler);
        map._currentClickHandler = null;
    }
    
    if (map._polygonClickHandler) {
        map.off('click', map._polygonClickHandler);
        map.off('dblclick', map._polygonDoubleClickHandler);
        map._polygonClickHandler = null;
        map._polygonDoubleClickHandler = null;
    }
    
    cleanupRectangleDrawing();
    
    if (currentPolygon) {
        map.removeLayer(currentPolygon);
        currentPolygon = null;
    }
    
    polygonPoints = [];
    
    document.getElementById('drawing-instructions').innerHTML = '';
}

function cleanupRectangleDrawing() {
    if (map._rectangleMouseDown) {
        map.off('mousedown', map._rectangleMouseDown);
        map.off('mousemove', map._rectangleMouseMove);
        map.off('mouseup', map._rectangleMouseUp);
        map._rectangleMouseDown = null;
        map._rectangleMouseMove = null;
        map._rectangleMouseUp = null;
    }
}

async function createPuntoInteres(latlng) {
    const nombre = prompt('Nombre del Punto de Interés:');
    if (!nombre) {
        cancelDrawing();
        return;
    }
    
    const descripcion = prompt('Descripción del Punto de Interés:');
    if (!descripcion) {
        cancelDrawing();
        return;
    }

    const puntoData = {
        nombre,
        descripcion,
        location: {
            type: 'Point',
            coordinates: [latlng.lng, latlng.lat]
        }
    };

    try {
        const response = await fetch(API_BASE + '/pinteres', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(puntoData)
        });

        if (response.ok) {
            const newPunto = await response.json();
            addMarkersToMap(newPunto, 'punto');
            loadData();
            showMessage('Punto de Interés creado exitosamente', 'success'); // NW
            cancelDrawing();
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear el Punto de Interés: ' + error.message, 'error');
    }
}

async function createServicio(latlng) {
    const nombre = prompt('Nombre del Servicio:');
    if (!nombre) {
        cancelDrawing();
        return;
    }
    
    const descripcion = prompt('Descripción del Servicio:');
    if (!descripcion) {
        cancelDrawing();
        return;
    }

    const servicioData = {
        nombre,
        descripcion,
        location: {
            type: 'Point',
            coordinates: [latlng.lng, latlng.lat]
        }
    };

    try {
        const response = await fetch(API_BASE + '/servicio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(servicioData)
        });

        if (response.ok) {
            const newServicio = await response.json();
            showMessage('Servicio creado exitosamente', 'success'); // NW
            addMarkersToMap(newServicio, 'servicio');
            loadData();
            cancelDrawing();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear el Servicio: ' + error.message, 'error');
    }
}

function showPolygonCreationForm(polygon, points) {
    const form = `
        <div class="creation-form">
            <h3>Crear Zona (Polígono)</h3>
            <form id="polygonForm">
                <div class="form-group">
                    <label for="zonaNombre">Nombre:</label>
                    <input type="text" id="zonaNombre" required>
                </div>
                <div class="form-group">
                    <label for="zonaDescripcion">Descripción:</label>
                    <textarea id="zonaDescripcion" required></textarea>
                </div>
                <div class="button-group">
                    <button type="submit" class="btn btn-success">Guardar Zona</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelZonaCreation()">Cancelar</button>
                </div>
            </form>
        </div>
    `;

    const popup = L.popup()
        .setLatLng(polygon.getBounds().getCenter())
        .setContent(form)
        .openOn(map);

    document.getElementById('polygonForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nombre = document.getElementById('zonaNombre').value;
        const descripcion = document.getElementById('zonaDescripcion').value;

        const zonaData = {
            nombre,
            descripcion,
            tipo: 'polygon',
            coordenadas: [points.map(point => ({ lat: point.lat, lng: point.lng }))],
            centro: {
                lat: polygon.getBounds().getCenter().lat,
                lng: polygon.getBounds().getCenter().lng
            }
        };

        await saveZona(zonaData, polygon);
        map.closePopup(popup);
    });
}

function showRectangleCreationForm(rectangle) {
    const form = `
        <div class="creation-form">
            <h3>Crear Zona (Rectángulo)</h3>
            <form id="rectangleForm">
                <div class="form-group">
                    <label for="zonaNombre">Nombre:</label>
                    <input type="text" id="zonaNombre" required>
                </div>
                <div class="form-group">
                    <label for="zonaDescripcion">Descripción:</label>
                    <textarea id="zonaDescripcion" required></textarea>
                </div>
                <div class="button-group">
                    <button type="submit" class="btn btn-success">Guardar Zona</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelZonaCreation()">Cancelar</button>
                </div>
            </form>
        </div>
    `;

    const popup = L.popup()
        .setLatLng(rectangle.getBounds().getCenter())
        .setContent(form)
        .openOn(map);

    console.log("sip1")

    document.getElementById('rectangleForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nombre = document.getElementById('zonaNombre').value;
        const descripcion = document.getElementById('zonaDescripcion').value;

        const bounds = rectangle.getBounds();
        const zonaData = {
            nombre,
            descripcion,
            tipo: 'rectangle',
            bounds: {
                norte: bounds.getNorth(),
                sur: bounds.getSouth(),
                este: bounds.getEast(),
                oeste: bounds.getWest()
            }
        };

        console.log("sip2")

        await saveZona(zonaData, rectangle);
        map.closePopup(popup);
    });
}

async function saveZona(zonaData, layer) {
    try {
        const response = await fetch(API_BASE + '/zona', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(zonaData)
        });

        if (response.ok) {
            const newZona = await response.json();
            layer._id = newZona._id;
            layer.bindPopup(createZonaPopupContent(newZona,));
            zonasLayer.addLayer(layer);
            loadData();
            showMessage('Zona creada exitosamente', 'success');
            cancelDrawing();
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear la zona: ' + error.message, 'error');
    }
}

function checkForExistingLocation(latlng) {
    let foundLocation = null;
    let foundType = null;

    puntosInteres.forEach(punto => {
        if (punto.location && punto.location.coordinates) {
            const puntoLatLng = L.latLng(punto.location.coordinates[1], punto.location.coordinates[0]);
            const distance = puntoLatLng.distanceTo(latlng);
            if (distance < 100) {
                foundLocation = punto;
                foundType = 'punto';
            }
        }
    });

    servicios.forEach(servicio => {
        if (servicio.location && servicio.location.coordinates) {
            const servicioLatLng = L.latLng(servicio.location.coordinates[1], servicio.location.coordinates[0]);
            const distance = servicioLatLng.distanceTo(latlng);
            if (distance < 100) {
                foundLocation = servicio;
                foundType = 'servicio';
            }
        }
    });

    if (foundLocation) {
        createReview(foundLocation._id, foundType);
    } else {
        showMessage('No se encontró un Punto de Interés o Servicio en esta ubicación. Primero crea un lugar.', 'warning');
    }
}

async function createReview(locationId, locationType) {
    let calificacion;
    
    do {
        calificacion = prompt('Calificación (1-5 estrellas):');
        if (calificacion === null) {
            cancelDrawing();
            return;
        }
        calificacion = parseInt(calificacion);
    } while (isNaN(calificacion) || calificacion < 1 || calificacion > 5);

    const opinion = prompt('Tu opinión:');
    if (!opinion) {
        showMessage('La opinión es requerida', 'error');
        return;
    }

    const reviewData = {
        user: currentUser._id,
        calificacion: calificacion,
        opinion: opinion,
        servicioTuristico: locationId
    };

    try {
        const response = await fetch(API_BASE + '/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reviewData)
        });

        if (response.ok) {
            showMessage('Reseña agregada exitosamente', 'success');
            cancelDrawing();
            
            setTimeout(() => {
                localStorage.setItem('currentPlaceId', locationId);
                localStorage.setItem('currentPlaceType', locationType);
                window.location.href = '/resenas';
            }, 1000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al crear la reseña');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear la reseña: ' + error.message, 'error');
    }
}

function cancelDrawing() {
    cleanupDrawing();
    document.getElementById("finishPolygonBtn").style.display = "none";
    currentAction = null;
    drawingMode = false;
    map.dragging.enable();
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

async function loadData() {
    try {
        const [pinteresResponse, serviciosResponse, zonasResponse] = await Promise.all([
            fetch(API_BASE + '/pinteres'),
            fetch(API_BASE + '/servicio'),
            fetch(API_BASE + '/zona')
        ]);

        puntosInteres = await pinteresResponse.json();
        servicios = await serviciosResponse.json();
        zonas = await zonasResponse.json();

        addMarkersToMap();
        addZonasToMap();
        updateTable();
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

function addMarkersToMap() {
    markersLayer.clearLayers();

    puntosInteres.forEach(punto => {
        if (punto.location && punto.location.coordinates) {
            const marker = L.marker([
                punto.location.coordinates[1], 
                punto.location.coordinates[0]
            ], { icon: iconPuntoInteres }).addTo(markersLayer);
            
            marker._id = punto._id;
            marker.bindPopup(createPopupContent(punto, 'punto'));
        }
    });

    servicios.forEach(servicio => {
        if (servicio.location && servicio.location.coordinates) {
            const marker = L.marker([
                servicio.location.coordinates[1], 
                servicio.location.coordinates[0]
            ], { icon: iconServicio }).addTo(markersLayer);
            
            marker._id = servicio._id;
            marker.bindPopup(createPopupContent(servicio, 'servicio'));
        }
    });
}

function addZonasToMap() {
    zonasLayer.clearLayers();

    zonas.forEach(zona => {
        let layer;
        
        switch(zona.tipo) {
            case 'polygon':
                if (zona.coordenadas && zona.coordenadas[0]) {
                    const coordinates = zona.coordenadas[0].map(coord => [coord.lat, coord.lng]);
                    layer = L.polygon(coordinates, { 
                        color: '#3498db', 
                        fillOpacity: 0.2,
                        weight: 2
                    });
                }
                break;
            case 'rectangle':
                if (zona.bounds) {
                    layer = L.rectangle([
                        [zona.bounds.norte, zona.bounds.oeste],
                        [zona.bounds.sur, zona.bounds.este]
                    ], { 
                        color: '#e74c3c', 
                        fillOpacity: 0.2,
                        weight: 2
                    });
                }
                break;
        }
        
        if (layer) {
            layer._id = zona._id;
            layer.bindPopup(createZonaPopupContent(zona));
            zonasLayer.addLayer(layer);
        }
    });
}

function createPopupContent(item, tipo) {
    return `
        <div class="popup-content">
            <h4>${item.nombre}</h4>
            <p>${item.descripcion}</p>
            <div class="popup-actions">
                <button onclick="editLocation('${item._id}', '${tipo}')" class="btn btn-warning btn-sm">
                    Editar
                </button>
                <button onclick="deleteLocation('${item._id}', '${tipo}')" class="btn btn-danger btn-sm">
                    Eliminar
                </button>
                <button onclick="moveLocation('${item._id}', '${tipo}')" class="btn btn-success btn-sm">
                    Mover
                </button>
                <button onclick="verResenas('${item._id}', '${tipo}')" class="btn btn-primary btn-sm">
                    Reseñas
                </button>
            </div>
        </div>
    `;
}

function createZonaPopupContent(zona) {
    return `
        <div class="popup-content">
            <h4>${zona.nombre}</h4>
            <p>${zona.descripcion}</p>
            <p><strong>Tipo:</strong> ${zona.tipo}</p>
            <div class="popup-actions">
                <button onclick="editZona('${zona._id}')" class="btn btn-warning btn-sm">
                    Editar
                </button>
                <button onclick="deleteZona('${zona._id}')" class="btn btn-danger btn-sm">
                    Eliminar
                </button>
            </div>
        </div>
    `;
}

function buildAllLocationEntries() {
    return [
        ...puntosInteres.map(p => ({ ...p, entityType: 'punto', categoriaEtiqueta: 'Lugar Turístico' })),
        ...servicios.map(s => ({ ...s, entityType: 'servicio', categoriaEtiqueta: 'Restaurante' })),
        ...zonas.map(z => ({ ...z, entityType: 'zona', categoriaEtiqueta: 'Zona' }))
    ];
}

function updateTable() {
    const tableBody = document.getElementById('locationsTable');
    tableBody.innerHTML = '';

    allLocations = buildAllLocationEntries();
    lastFocusedLocationId = null;

    allLocations.forEach(item => {
        const row = document.createElement('tr');

        let locationInfo = '';
        if (item.location && item.location.coordinates) {
            const coords = item.location.coordinates;
            locationInfo = `Lat: ${coords[1].toFixed(4)}, Lng: ${coords[0].toFixed(4)}`;
        } else if (item.centro && typeof item.centro.lat === 'number' && typeof item.centro.lng === 'number') {
            locationInfo = `Lat: ${item.centro.lat.toFixed(4)}, Lng: ${item.centro.lng.toFixed(4)}`;
        }

        row.innerHTML = `
            <td>${item.nombre}</td>
            <td>${item.descripcion}</td>
            <td>${item.categoriaEtiqueta}</td>
            <td>${locationInfo}</td>
        `;

        row.addEventListener('click', function() {
            focusOnLocation(item);
        });

        tableBody.appendChild(row);
    });
}

function filterTable(searchTerm) {
    const rows = document.querySelectorAll('#locationsTable tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
}

function focusLocationByName(searchValue, options = {}) {
    const { allowPartial = false, force = false } = options;
    if (!searchValue) {
        lastFocusedLocationId = null;
        return;
    }

    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) {
        lastFocusedLocationId = null;
        return;
    }

    if (!Array.isArray(allLocations) || !allLocations.length) {
        return;
    }

    let match = allLocations.find(item => item.nombre && item.nombre.toLowerCase() === normalized);

    if (!match && allowPartial) {
        const partialMatches = allLocations.filter(item => item.nombre && item.nombre.toLowerCase().includes(normalized));
        if (partialMatches.length === 1) {
            match = partialMatches[0];
        } else if (partialMatches.length > 1) {
            match = partialMatches.find(item => item.nombre.toLowerCase().startsWith(normalized)) || partialMatches[0];
        }
    }

    if (!match) {
        return;
    }

    if (!force && match._id === lastFocusedLocationId) {
        return;
    }

    focusOnLocation(match);
}

function focusOnLocation(entry) {
    if (!entry || !map) {
        return;
    }

    let targetLatLng = null;
    let bounds = null;

    if (entry.location && entry.location.coordinates) {
        const [lng, lat] = entry.location.coordinates;
        targetLatLng = L.latLng(lat, lng);
    } else if (entry.centro && typeof entry.centro.lat === 'number' && typeof entry.centro.lng === 'number') {
        targetLatLng = L.latLng(entry.centro.lat, entry.centro.lng);
    } else if (entry.bounds && typeof entry.bounds.norte === 'number' && typeof entry.bounds.sur === 'number' && typeof entry.bounds.este === 'number' && typeof entry.bounds.oeste === 'number') {
        bounds = L.latLngBounds([
            [entry.bounds.norte, entry.bounds.oeste],
            [entry.bounds.sur, entry.bounds.este]
        ]);
    } else if (entry.coordenadas && entry.coordenadas.length && entry.coordenadas[0].length) {
        const polygonCoords = entry.coordenadas[0].map(coord => [coord.lat, coord.lng]);
        bounds = L.latLngBounds(polygonCoords);
    }

    if (bounds) {
        map.fitBounds(bounds, { maxZoom: 16, padding: [40, 40] });
    } else if (targetLatLng) {
        const targetZoom = Math.max(map.getZoom(), 16);
        map.flyTo(targetLatLng, targetZoom, { duration: 0.8 });
    } else {
        return;
    }

    openPopupForLocation(entry._id, entry.entityType);
    lastFocusedLocationId = entry._id;
}

function openPopupForLocation(locationId, entityType) {
    if (!locationId) {
        return;
    }

    if (entityType === 'punto' || entityType === 'servicio') {
        markersLayer.eachLayer(layer => {
            if (layer._id === locationId) {
                const popup = layer.getPopup();
                const previousAutoPan = popup ? popup.options.autoPan : null;
                if (popup) {
                    popup.options.autoPan = false;
                }
                layer.openPopup();
                if (popup && previousAutoPan !== null) {
                    popup.options.autoPan = previousAutoPan;
                }
            }
        });
    } else if (entityType === 'zona') {
        zonasLayer.eachLayer(layer => {
            if (layer._id === locationId) {
                const popup = layer.getPopup();
                const previousAutoPan = popup ? popup.options.autoPan : null;
                if (popup) {
                    popup.options.autoPan = false;
                }
                layer.openPopup();
                if (popup && previousAutoPan !== null) {
                    popup.options.autoPan = previousAutoPan;
                }
            }
        });
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Funciones globales
window.cancelZonaCreation = function() {
    map.closePopup();
    cancelDrawing();
};

window.editLocation = async function(id, tipo) {
    const nombre = prompt('Nuevo nombre:');
    if (nombre === null) return;
    
    const descripcion = prompt('Nueva descripción:');
    if (descripcion === null) return;
    
    if (nombre && descripcion) {
        try {
            const endpoint = tipo === 'punto' ? '/pinteres' : '/servicio';
            const response = await fetch(API_BASE + endpoint + '/' + id, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nombre, descripcion })
            });

            if (response.ok) {
                loadData();
                showMessage('Ubicación actualizada exitosamente', 'success');
            }
        } catch (error) {
            showMessage('Error al actualizar la ubicación', 'error');
        }
    }
};

// Moving
let moveHandler = null;

window.moveLocation = function(id, tipo) {
    map.closePopup();

    showMessage("Da click en un nuevo punto del mapa para mover la ubicación...", "info");

    // Por si acaso
    if (moveHandler) {
        map.off("click", moveHandler);
        moveHandler = null;
    }


    moveHandler = async function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        console.log(lng);
        console.log(lat);


        map.off("click", moveHandler);
        moveHandler = null;

        try {
            const endpoint = tipo === "punto" ? "/pinteres" : "/servicio";

            const response = await fetch(API_BASE + endpoint + "/" + id, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    location : {
                    type : "Point",
                    coordinates: [lng, lat]
                }})
            });

            console.log(response);

            if (response.ok) {
                loadData();
                showMessage("Ubicación actualizada exitosamente", "success");
            } else {
                showMessage("Error al actualizar la ubicación", "error");
            }
        } catch (error) {
            showMessage("Error al actualizar la ubicación", "error");
        }
    };

    // Activar escucha del clic
    map.on("click", moveHandler);
};

window.editZona = async function(id) {
    const nombre = prompt('Nuevo nombre:');
    if (nombre === null) return;
    
    const descripcion = prompt('Nueva descripción:');
    if (descripcion === null) return;
    
    if (nombre && descripcion) {
        try {
            const response = await fetch(API_BASE + '/zona/' + id, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nombre, descripcion })
            });

            if (response.ok) {
                loadData();
                showMessage('Ubicación actualizada exitosamente', 'success');
            }
        } catch (error) {
            showMessage('Error al actualizar la ubicación', 'error');
        }
    }
};

window.deleteLocation = async function(id, tipo) {
    if (confirm('¿Estás seguro de eliminar esta ubicación?')) {
        try {
            const endpoint = tipo === 'punto' ? '/pinteres' : '/servicio';
            const response = await fetch(API_BASE + endpoint + '/' + id, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadData();
                showMessage('Ubicación eliminada exitosamente', 'success');
            }
        } catch (error) {
            showMessage('Error al eliminar la ubicación', 'error');
        }
    }
};

window.deleteZona = async function(id) {
    if (confirm('¿Estás seguro de eliminar esta zona?')) {
        try {
            const response = await fetch(API_BASE + '/zona/' + id, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadData();
                showMessage('Zona eliminada exitosamente', 'success');
            }
        } catch (error) {
            showMessage('Error al eliminar la zona', 'error');
        }
    }
};

window.verResenas = function(id, tipo) {
    localStorage.setItem('currentPlaceId', id);
    localStorage.setItem('currentPlaceType', tipo);
                window.location.href = '/overview.html';
};