/* ============================================================
   Koresh Store — منطق صفحة المنتجات (index.html)
   ============================================================ */

let currentCategory = "الكل";
let currentSort = "featured";

function discountPct(p) {
  if (!p.oldPrice || p.oldPrice <= p.price) return 0;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function renderCategoryPills() {
  const row = document.getElementById("catRow");
  if (!row) return;
  row.innerHTML = CATEGORIES.map(c => `
    <button class="cat-pill${c === currentCategory ? " active" : ""}" data-cat="${c}">${c}</button>
  `).join("");
  row.querySelectorAll(".cat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.cat;
      renderCategoryPills();
      renderProducts();
    });
  });
}

function getFilteredSortedProducts() {
  let products = KS.getProducts();
  if (currentCategory !== "الكل") {
    products = products.filter(p => p.category === currentCategory);
  }
  switch (currentSort) {
    case "discount":
      products = [...products].sort((a, b) => discountPct(b) - discountPct(a));
      break;
    case "price-asc":
      products = [...products].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      products = [...products].sort((a, b) => b.price - a.price);
      break;
    default:
      // featured: خليه بنفس الترتيب المخزن
      break;
  }
  return products;
}

function productCard(p) {
  const disc = discountPct(p);
  const hasVariants = p.variants && (p.variants.sizes || p.variants.colors);
  return `
    <div class="product-card">
      <div class="product-media">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        ${disc > 0 ? `<span class="discount-tag">خصم ${disc}٪</span>` : ""}
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-body">
        <span class="product-cat">${p.category}</span>
        <h3 class="product-name">${p.name}</h3>
        <div class="price-row">
          <span class="price">${KS.fmt(p.price)}</span>
          ${p.oldPrice ? `<span class="price-old">${KS.fmt(p.oldPrice)}</span>` : ""}
        </div>
        <button class="btn ${hasVariants ? "btn-ghost" : "btn-dark"} add-btn" onclick="${hasVariants ? `openVariantModal('${p.id}')` : `addToCartFromCard('${p.id}')`}">
          ${hasVariants ? "اختار المقاس واللون" : "أضف للسلة"}
        </button>
      </div>
    </div>
  `;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const countEl = document.getElementById("productCount");
  if (!grid) return;
  const products = getFilteredSortedProducts();
  countEl.textContent = `${products.length} منتج متاح`;
  grid.innerHTML = products.length
    ? products.map(productCard).join("")
    : `<div class="empty-state" style="grid-column:1/-1">لسه مفيش منتجات مضافة${currentCategory !== "الكل" ? " في القسم ده" : ""} — تقدر تضيفها من <a href="admin.html" style="color:var(--clay)">لوحة التحكم</a></div>`;
}

/* ---------------- Variant modal ---------------- */
function openVariantModal(id) {
  const p = KS.getProducts().find(x => x.id === id);
  if (!p) return;
  const overlay = document.getElementById("variantOverlay");
  const modal = document.getElementById("variantModal");
  modal.innerHTML = `
    <h3>${p.name}</h3>
    <p style="color:var(--ink-soft);margin-top:-8px">${KS.fmt(p.price)}</p>
    ${p.variants.sizes ? `
      <div class="field" style="margin-bottom:14px">
        <label>المقاس</label>
        <select id="vSize">${p.variants.sizes.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
      </div>` : ""}
    ${p.variants.colors ? `
      <div class="field" style="margin-bottom:14px">
        <label>اللون</label>
        <select id="vColor">${p.variants.colors.map(c => `<option value="${c}">${c}</option>`).join("")}</select>
      </div>` : ""}
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" style="flex:1" onclick="confirmVariantAdd('${p.id}')">أضف للسلة</button>
      <button class="btn btn-ghost" onclick="closeVariantModal()">إلغاء</button>
    </div>
  `;
  overlay.classList.add("open");
}
function closeVariantModal() {
  document.getElementById("variantOverlay").classList.remove("open");
}
function confirmVariantAdd(id) {
  const size = document.getElementById("vSize")?.value;
  const color = document.getElementById("vColor")?.value;
  addToCartFromCard(id, size, color);
  closeVariantModal();
}

/* ---------------- init ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderCategoryPills();
  renderProducts();

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      renderProducts();
    });
  }
});
