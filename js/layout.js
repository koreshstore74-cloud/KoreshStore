/* ============================================================
   Koresh Store — الهيدر والفوتر وسلة التسوق (مشتركين بين الصفحات)
   ============================================================ */

function bootstrapPage(activePage) {
  // أول رندر فوري بالإعدادات الافتراضية (عشان الصفحة متبقاش فاضية وهي مستنية Firebase)
  renderLayout(activePage);
  // لما إعدادات المتجر الحقيقية توصل من Firestore، أعد رسم الهيدر/الفوتر بيها
  KS.initCloudSettings(() => {
    renderLayout(activePage);
    if (typeof onSettingsReady === "function") onSettingsReady();
  });
  // المنتجات بتتحدث لحظيًا لكل زوار الموقع
  if (typeof renderProducts === "function") {
    KS.initCloudProducts(() => renderProducts());
  }
}

function applyTheme() {
  const s = KS.getSettings();
  const root = document.documentElement.style;
  root.setProperty("--brass", s.accent);
  root.setProperty("--brass-light", s.accentLight);
  root.setProperty("--ink", s.dark);
  root.setProperty("--sand", s.sand);
  root.setProperty("--clay", s.clay);
  document.title = document.title.replace(/Koresh Store/g, s.storeName);
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon && s.logo) favicon.href = s.logo;
}

function renderLayout(activePage) {
  applyTheme();
  const s = KS.getSettings();
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");

  const nav = [
    { href: "index.html", label: "الرئيسية", key: "home" },
    { href: "index.html#products", label: "المنتجات", key: "products" },
    { href: "track-order.html", label: "تتبّع طلبك", key: "track" },
    { href: "videos.html", label: "الفيديوهات", key: "videos" },
    { href: "complaints.html", label: "الشكاوى والاقتراحات", key: "complaints" },
    { href: "policies.html", label: "سياسات المتجر", key: "policies" }
  ];

  if (header) {
    header.innerHTML = `
      <div class="top-strip">${s.topStrip}</div>
      <div class="wrap header-inner">
        <a href="index.html" class="brand">
          <img src="${s.logo}" alt="${s.storeName}" class="brand-logo">
          ${s.storeName}
        </a>
        <nav class="main-nav" id="mainNav">
          ${nav.map(n => `<a class="nav-link${n.key === activePage ? " active" : ""}" href="${n.href}">${n.label}</a>`).join("")}
        </nav>
        <div class="header-actions">
          <div class="social-icons">
            <a href="${s.facebook}" target="_blank" rel="noopener" aria-label="فيسبوك">${ICONS.facebook}</a>
            <a href="${s.instagram}" target="_blank" rel="noopener" aria-label="انستجرام">${ICONS.instagram}</a>
          </div>
          <button class="icon-btn" id="cartBtn" aria-label="السلة">
            ${ICONS.cart}
            <span class="cart-count" id="cartCount">0</span>
          </button>
          <button class="mobile-menu-btn" id="menuBtn" aria-label="القائمة">☰</button>
        </div>
      </div>
    `;

    document.getElementById("menuBtn").addEventListener("click", () => {
      document.getElementById("mainNav").classList.toggle("open");
    });
    document.getElementById("cartBtn").addEventListener("click", openCartDrawer);
    updateCartCount();
  }

  if (footer) {
    footer.innerHTML = `
      <div class="wrap footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="brand" style="color:var(--sand)">
            <img src="${s.logo}" alt="${s.storeName}" class="brand-logo">
            ${s.storeName}
          </a>
          <p>متجر مصري بسيط وسريع بيجمع احتياجاتك اليومية في أقسام واضحة وأسعار مباشرة.</p>
          <div class="footer-social">
            <a href="${s.facebook}" target="_blank" rel="noopener" aria-label="فيسبوك">${ICONS.facebook}</a>
            <a href="${s.instagram}" target="_blank" rel="noopener" aria-label="انستجرام">${ICONS.instagram}</a>
            <a href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener" aria-label="واتساب">${ICONS.whatsapp}</a>
          </div>
        </div>
        <div>
          <h4>روابط مهمة</h4>
          <ul>
            <li><a href="index.html#products">كل المنتجات</a></li>
            <li><a href="track-order.html">تتبّع طلبك</a></li>
            <li><a href="policies.html">الشحن والاستبدال</a></li>
            <li><a href="complaints.html">الشكاوى والاقتراحات</a></li>
          </ul>
        </div>
        <div>
          <h4>خدمة العملاء</h4>
          <ul>
            <li><a href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">واتساب: ${formatPhone(s.whatsapp)}</a></li>
            <li><a href="tel:+${s.whatsapp}">اتصال مباشر</a></li>
          </ul>
        </div>
        <div>
          <h4>تابعنا</h4>
          <ul>
            <li><a href="${s.facebook}" target="_blank" rel="noopener">فيسبوك</a></li>
            <li><a href="${s.instagram}" target="_blank" rel="noopener">انستجرام</a></li>
            <li><a href="admin.html">إدارة المتجر</a></li>
          </ul>
        </div>
      </div>
      <div class="wrap footer-bottom">
        <span>© ${new Date().getFullYear()} ${s.storeName} — كل الحقوق محفوظة</span>
        <span>صُنع بعناية في مصر</span>
      </div>
    `;
  }

  injectCartDrawer();
  injectWhatsappFloat();
}

function formatPhone(p) {
  // 201114577749 -> 01114577749
  return "0" + p.slice(2);
}

const ICONS = {
  cart: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  facebook: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12"/></svg>`,
  instagram: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`,
  whatsapp: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.3-1.2-3.2-2.8-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4-.1-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5-.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"/></svg>`,
  whatsappBig: `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.3-1.2-3.2-2.8-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4-.1-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5-.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z"/></svg>`
};

function injectWhatsappFloat() {
  if (document.getElementById("waFloat")) return;
  const s = KS.getSettings();
  const a = document.createElement("a");
  a.id = "waFloat";
  a.className = "wa-float";
  a.href = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("مرحبًا، عندي استفسار بخصوص منتجات " + s.storeName)}`;
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", "تواصل عبر واتساب");
  a.innerHTML = ICONS.whatsappBig;
  document.body.appendChild(a);
}

/* ---------------- Cart Drawer ---------------- */
function injectCartDrawer() {
  if (document.getElementById("cartOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "cartOverlay";
  overlay.className = "overlay";
  overlay.addEventListener("click", closeCartDrawer);

  const drawer = document.createElement("div");
  drawer.id = "cartDrawer";
  drawer.className = "drawer";
  drawer.innerHTML = `
    <div class="drawer-head">
      <h3 style="margin:0">سلة المشتريات</h3>
      <button class="icon-btn" id="closeCart" aria-label="إغلاق">✕</button>
    </div>
    <div class="drawer-body" id="cartBody"></div>
    <div class="drawer-foot" id="cartFoot"></div>
  `;
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  document.getElementById("closeCart").addEventListener("click", closeCartDrawer);
  renderCartDrawer();
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
}
function closeCartDrawer() {
  document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("cartDrawer").classList.remove("open");
}

function renderCartDrawer() {
  const body = document.getElementById("cartBody");
  const foot = document.getElementById("cartFoot");
  if (!body) return;
  const cart = KS.getCart();

  if (cart.length === 0) {
    body.innerHTML = `<div class="empty-state">السلة فاضية دلوقتي 🛒<br>يلا نضيف أول منتج!</div>`;
    foot.innerHTML = "";
    return;
  }

  body.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="info">
        <h5>${item.name}</h5>
        <div class="meta">${[item.size, item.color].filter(Boolean).join(" · ") || item.category}</div>
        <div class="meta">${KS.fmt(item.price)}</div>
        <div class="qty-row">
          <button onclick="changeQty(${i},-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${i},1)">+</button>
        </div>
        <button class="remove-btn" onclick="removeCartItem(${i})">إزالة</button>
      </div>
    </div>
  `).join("");

  foot.innerHTML = `
    <div class="cart-total-row"><span>الإجمالي</span><span>${KS.fmt(KS.cartTotal())}</span></div>
    <a href="checkout.html" class="btn btn-primary" style="width:100%">إتمام الطلب</a>
  `;
}

function changeQty(index, delta) {
  const cart = KS.getCart();
  cart[index].qty = Math.max(1, cart[index].qty + delta);
  KS.saveCart(cart);
  renderCartDrawer();
  updateCartCount();
}
function removeCartItem(index) {
  KS.removeFromCart(index);
  renderCartDrawer();
  updateCartCount();
}
function updateCartCount() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = KS.cartCount();
}

function addToCartFromCard(id, size, color) {
  const products = KS.getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;
  KS.addToCart({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, qty: 1, size: size || null, color: color || null });
  updateCartCount();
  showToast(`تمت إضافة "${p.name}" للسلة`);
  openCartDrawer();
}

function showToast(msg) {
  let toast = document.getElementById("ksToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ksToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
