const API_BASE = 'http://localhost:3001';

let currentPlaceId;
let currentPlaceType;
let currentUser;
let reviews = [];

document.addEventListener('DOMContentLoaded', function() {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    currentPlaceId = localStorage.getItem('currentPlaceId');
    currentPlaceType = localStorage.getItem('currentPlaceType');

    if (!currentUser || !currentPlaceId) {
        window.location.href = 'index.html';
        return;
    }

    initializePage();
    loadReviews();
    setupEventListeners();
});

async function initializePage() {
    try {
        let place;
        
        if (currentPlaceType === 'punto') {
            const response = await fetch(`${API_BASE}/pinteres/${currentPlaceId}`);
            place = await response.json();
        } else {
            const response = await fetch(`${API_BASE}/servicio/${currentPlaceId}`);
            place = await response.json();
        }

        if (place) {
            document.getElementById('lugarTitulo').textContent = `Reseñas - ${place.nombre}`;
            
            const lugarInfo = document.getElementById('lugarInfo');
            lugarInfo.innerHTML = `
                <h2>${place.nombre}</h2>
                <p>${place.descripcion}</p>
            `;
        }
    } catch (error) {
        console.error('Error cargando información del lugar:', error);
    }
}


async function getUserName(id) {
    const responseUserName = await fetch(`${API_BASE}/user/${id}`);
    const user = await responseUserName.json();
    return user.username
}

async function loadReviews() {
    try {
        const response = await fetch(`${API_BASE}/review`);
        const allReviews = await response.json();

        
        // Filtrar reseñas para este lugar específico
        reviews = allReviews.filter(review => 
            review.servicioTuristico === currentPlaceId
        );
        
        displayReviews();
        updateStats();
    } catch (error) {
        console.error('Error cargando reseñas:', error);
    }
}

async function displayReviews() {
    const reviewsList = document.getElementById('reviewsList');
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<p class="empty-state">No hay reseñas todavía. ¡Sé el primero en opinar!</p>';
        return;
    } else {


        // Esperar nombres de usuario
        const usernames = await Promise.all(
            reviews.map(r => getUserName(r.user))
        );
            
        reviewsList.innerHTML = reviews.map((review, i) => {
            const formattedDate = new Date(review.createdAt || Date.now()).toLocaleDateString();
            const isoDate = review.createdAt || '';
            return `<article class="review-item">
    <header class="review-header">
        <span class="review-stars">${'★'.repeat(review.calificacion)}${'☆'.repeat(5 - review.calificacion)}</span>
        <span class="review-username">${usernames[i]}</span>
        <time class="review-date" datetime="${isoDate}">${formattedDate}</time>
    </header>
    <p class="review-content">${review.opinion}</p>
</article>`;
        }).join('');
    }
    
}

function updateStats() {
    if (reviews.length === 0) {
        document.getElementById('ratingValue').textContent = '0.0';
        document.getElementById('totalReviews').textContent = '0 reseñas';
        return;
    }

    const average = reviews.reduce((sum, review) => sum + review.calificacion, 0) / reviews.length;
    document.getElementById('ratingValue').textContent = average.toFixed(1);
    document.getElementById('totalReviews').textContent = `${reviews.length} reseña${reviews.length !== 1 ? 's' : ''}`;
}

function setupEventListeners() {
    // Botón volver al mapa
    document.getElementById('btnVolverMapa').addEventListener('click', function() {
        window.location.href = 'world.html';
    });

    // Estrellas de calificación
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            setRating(stars, rating);
        });
    });

    // Contador de caracteres
    const opinionTextarea = document.getElementById('opinion');
    const charCount = document.getElementById('charCount');
    
    opinionTextarea.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });

    // Formulario de reseña
    document.getElementById('reviewForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const calificacion = document.getElementById('calificacion').value;
        const opinion = document.getElementById('opinion').value;

        if (!calificacion) {
            alert('Por favor, selecciona una calificación');
            return;
        }

        const nuevaReview = {
            user: currentUser._id,
            calificacion: parseInt(calificacion),
            opinion: opinion,
            servicioTuristico: currentPlaceId
        };

        try {
            const response = await fetch(`${API_BASE}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(nuevaReview)
            });

            if (response.ok) {
                alert('Reseña enviada exitosamente');
                document.getElementById('reviewForm').reset();
                document.getElementById('charCount').textContent = '0';
                setRating(document.querySelectorAll('.star-rating .star'), 0);
                loadReviews(); // Recargar reseñas
            } else {
                alert('Error al enviar la reseña');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al conectar con el servidor');
        }
    });
}

function setRating(stars, rating) {
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    document.getElementById('calificacion').value = rating;
}