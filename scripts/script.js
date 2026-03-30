
let allRecipes       = [];
let displayedRecipes = [];
let favourites       = JSON.parse(localStorage.getItem('rf_favs')) || [];
let isSortedAZ       = false;
let currentTab       = 'all';
let activeCategory   = 'Chicken';
let activeCountry    = '';
let currentTitle     = 'Popular <span>Recipes</span>';

window.addEventListener('load', () => fetchByCategory('Chicken'));

document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

function handleSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  clearActivePills();
  activeCategory = '';
  activeCountry = '';

  fetchBySearch(query);
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

async function fetchBySearch(query) {
  showLoader();
  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
    const data = await res.json();
    allRecipes       = data.meals || [];
    displayedRecipes = allRecipes;
    currentTitle = `Results for "<span>${query}</span>"`;
    setTitle(currentTitle);
    renderCards(displayedRecipes);
  } catch (err) {
    console.error('Search error:', err);
    showEmpty();
  }
}

function selectCategory(cat, btn) {
  activeCategory = cat;
  activeCountry = '';
  clearActivePills();
  btn.classList.add('active');
  fetchByCategory(cat);
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

async function fetchByCategory(category) {
  showLoader();
  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`);
    const data = await res.json();
    allRecipes       = data.meals || [];
    displayedRecipes = allRecipes;
    currentTitle = `<span>${category}</span> Recipes`;
    setTitle(currentTitle);
    renderCards(displayedRecipes);
  } catch (err) {
    console.error('Category fetch error:', err);
    showEmpty();
  }
}

function selectCountry(country, btn) {
  activeCountry = country;
  activeCategory = '';
  clearActivePills();
  btn.classList.add('active');
  fetchByCountry(country);
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

async function fetchByCountry(country) {
  showLoader();
  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${country}`);
    const data = await res.json();
    allRecipes       = data.meals || [];
    displayedRecipes = allRecipes;
    currentTitle = `<span>${country}</span> Recipes`;
    setTitle(currentTitle);
    renderCards(displayedRecipes);
  } catch (err) {
    console.error('Country fetch error:', err);
    showEmpty();
  }
}

function handleSort() {
  isSortedAZ = !isSortedAZ;
  const btn = document.getElementById('sortBtn');

  if (isSortedAZ) {
    displayedRecipes = [...displayedRecipes].sort((a, b) =>
      a.strMeal.localeCompare(b.strMeal)
    );
    btn.textContent = '↓ Sort Z–A';
    btn.classList.add('active');
  } else {
    displayedRecipes = [...displayedRecipes].sort((a, b) =>
      b.strMeal.localeCompare(a.strMeal)
    );
    btn.textContent = '↑ Sort A–Z';
    btn.classList.remove('active');
  }

  renderCards(displayedRecipes);
}


function renderCards(recipes) {
  hideLoader();
  const grid = document.getElementById('recipeGrid');

  if (!recipes || recipes.length === 0) {
    grid.innerHTML = '';
    showEmpty();
    document.getElementById('resultCount').textContent = '';
    return;
  }

  hideEmpty();
  document.getElementById('resultCount').textContent = `${recipes.length} recipes`;

  grid.innerHTML = recipes.map((recipe, index) => {
    const isFav   = favourites.some(f => f.idMeal === recipe.idMeal);
    const safeName = recipe.strMeal.replace(/'/g, "\\'");
    return `
      <div class="card" style="animation-delay:${index * 35}ms" onclick="openModal('${recipe.idMeal}')">
        <div class="card-img-wrap">
          <img src="${recipe.strMealThumb}/preview" alt="${recipe.strMeal}" loading="lazy"/>
          <div class="card-overlay"></div>
          <div class="view-label">View Recipe</div>
        </div>
        <div class="card-body">
          <h3>${recipe.strMeal}</h3>
          <div class="card-footer">
            <span class="tag">${recipe.strCategory || activeCategory || 'Recipe'}</span>
            <button class="fav-btn"
              onclick="toggleFav(event,'${recipe.idMeal}','${safeName}','${recipe.strMealThumb}')"
            >${isFav ? '❤️' : '🤍'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleFav(event, id, name, thumb) {
  event.stopPropagation();

  const already = favourites.some(f => f.idMeal === id);

  if (already) {
    favourites = favourites.filter(f => f.idMeal !== id);
  } else {
    favourites.push({ idMeal: id, strMeal: name, strMealThumb: thumb });
  }

  localStorage.setItem('rf_favs', JSON.stringify(favourites));

  renderCards(currentTab === 'favourites' ? favourites : displayedRecipes);
}

function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  if (tab === 'favourites') {
    setTitle('My <span>Favourites</span>');
    renderCards(favourites);
  } else {
    setTitle(currentTitle);
    renderCards(displayedRecipes);
  }
}

async function openModal(id) {
  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
    const data = await res.json();
    const meal = data.meals[0];

    document.getElementById('modalImg').src              = meal.strMealThumb;
    document.getElementById('modalImg').alt              = meal.strMeal;
    document.getElementById('modalTitle').textContent    = meal.strMeal;
    document.getElementById('modalTags').innerHTML       = `
      <span class="modal-tag">${meal.strCategory}</span>
      <span class="modal-tag">${meal.strArea}</span>
    `;

    const chips = document.getElementById('modalIngredients');
    chips.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const mea = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        const span = document.createElement('span');
        span.textContent = `${mea ? mea.trim() + ' ' : ''}${ing.trim()}`;
        chips.appendChild(span);
      }
    }

    document.getElementById('modalInstructions').textContent = meal.strInstructions;

    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Could not load recipe details:', err);
  }
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function clearActivePills() {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
}

function showLoader() {
  document.getElementById('loader').classList.add('show');
  document.getElementById('recipeGrid').innerHTML = '';
  document.getElementById('resultCount').textContent = '';
  hideEmpty();
}
function hideLoader() { document.getElementById('loader').classList.remove('show'); }
function showEmpty()  { document.getElementById('emptyState').classList.add('show'); }
function hideEmpty()  { document.getElementById('emptyState').classList.remove('show'); }
function setTitle(html) { document.getElementById('sectionTitle').innerHTML = html; }
