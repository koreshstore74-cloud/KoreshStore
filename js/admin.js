/* ============================================================
   Koresh Store — لوحة التحكم (admin.html)
   ============================================================ */

let currentTab = "products";
const FIREBASE_ADMIN_EMAIL = "admin@koreshstore.com";

function applyLoginBranding() {
  const cfg = KS.getSettings();
  const mark = document.getElementById("loginMark");
  const title = document.getElementById("loginTitle");
  if (mark) {
    if (cfg.logoUrl) {
      mark.style.background = "none";
      mark.innerHTML = `<img src="${cfg.logoUrl}" alt="${cfg.storeName}" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      mark.textContent = (cfg.storeName || "K").trim().charAt(0).toUpperCase();
    }
  }
  if (title) title.textContent = `لوحة تحكم ${cfg.storeName}`;
}

function checkAuth() {
  if (!KS.isLoggedIn()) {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("adminScreen").style.display = "none";
  } else {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("adminScreen").style.display = "block";
    renderTab();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const pass = document.getElementById("loginPass").value;
  const errorEl = document.getElementById("loginError");
  if (KS.checkPassword(pass)) {
    if (KS.isFirstRun()) KS.setPassword(pass);
    KS.login();
    errorEl.style.display = "none";

    // كمان يسجل دخول في Firebase عشان يقدر يضيف/يعدل/يحذف منتجات
    if (window.firebaseAuth) {
      try {
        await window.firebaseAuth.signInWithEmailAndPassword(
          window.firebaseAuth.auth, FIREBASE_ADMIN_EMAIL, pass
        );
      } catch (err) {
        console.error("Firebase auth sign-in error:", err);
        // مهم: لو كلمة السر اتغيرت من لوحة التحكم لكن ما اتغيرتش في Firebase
        // Authentication كمان، هيفشل تسجيل الدخول ده والحفظ هيرفض بعدين.
        // لازم كلمة سر Firebase Authentication (من Firebase Console) تتطابق دايمًا
        // مع كلمة السر بتاعة لوحة التحكم.
      }
    }

    checkAuth();
  } else {
    errorEl.style.display = "block";
  }
}

function handleLogout() {
  KS.logout();
  if (window.firebaseAuth) {
    window.firebaseAuth.signOut(window.firebaseAuth.auth).catch(() => {});
  }
  checkAuth();
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  renderTab();
}

function renderTab() {
  const content = document.getElementById("tabContent");
  if (currentTab === "products") content.innerHTML = productsTabHTML();
  if (currentTab === "complaints") content.innerHTML = complaintsTabHTML();
  if (currentTab === "orders") content.innerHTML = ordersTabHTML();
  if (currentTab === "settings") content.innerHTML = settingsTabHTML();
}

/* ================= المنتجات ================= */
function productsTabHTML() {
  const products = KS.getProducts();
  return `
    <div class="admin-toolbar">
      <div class="form-note">${products.length} منتج في المتجر</div>
      <button class="btn btn-primary" onclick="openProductModal()">+ إضافة منتج جديد</button>
    </div>
    ${products.length === 0 ? `<div class="empty-state">لسه مفيش منتجات — دوس "إضافة منتج جديد" عشان تبدأ</div>` : `
    <div style="overflow-x:auto">
    <table class="admin-table">
      <thead><tr><th></th><th>الاسم</th><th>القسم</th><th>السعر</th><th>السعر قبل الخصم</th><th>الكمية</th><th></th></tr></thead>
      <tbody>
        ${products.map(p => `
          <tr>
            <td><img src="${p.image}" alt=""></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${KS.fmt(p.price)}</td>
            <td>${p.oldPrice ? KS.fmt(p.oldPrice) : "—"}</td>
            <td>${p.stock ?? "—"}</td>
            <td class="table-actions">
              <button class="btn btn-ghost small-btn" onclick="openProductModal('${p.id}')">تعديل</button>
              <button class="btn btn-danger small-btn" onclick="deleteProduct('${p.id}')">حذف</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    </div>`}
  `;
}

function openProductModal(id) {
  const products = KS.getProducts();
  const p = id ? products.find(x => x.id === id) : null;
  const overlay = document.getElementById("modalOverlay");
  const modal = document.getElementById("modalBody");
  modal.innerHTML = `
    <h3>${p ? "تعديل منتج" : "إضافة منتج جديد"}</h3>
    <form id="productForm">
      <div class="form-grid">
        <div class="field full"><label>اسم المنتج</label><input type="text" id="pName" required value="${p?.name || ""}"></div>
        <div class="field"><label>القسم</label>
          <select id="pCategory">
            ${CATEGORIES.filter(c => c !== "الكل").map(c => `<option value="${c}" ${p?.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>الكمية المتاحة</label><input type="number" id="pStock" min="0" value="${p?.stock ?? 10}"></div>
        <div class="field"><label>السعر (ج.م)</label><input type="number" id="pPrice" required min="0" value="${p?.price ?? ""}"></div>
        <div class="field"><label>السعر قبل الخصم (اختياري)</label><input type="number" id="pOldPrice" min="0" value="${p?.oldPrice ?? ""}"></div>
        <div class="field full"><label>رابط الصورة</label><input type="url" id="pImage" required value="${p?.image || ""}" placeholder="https://..."></div>
        <div class="field"><label>وسم مميز (اختياري)</label><input type="text" id="pBadge" value="${p?.badge || ""}" placeholder="مثال: جديد"></div>
        <div class="field"><label>المقاسات (افصل بفاصلة)</label><input type="text" id="pSizes" value="${p?.variants?.sizes?.join(", ") || ""}" placeholder="S, M, L, XL"></div>
        <div class="field full"><label>الألوان (افصل بفاصلة)</label><input type="text" id="pColors" value="${p?.variants?.colors?.join(", ") || ""}" placeholder="أسود, أبيض"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button type="submit" class="btn btn-primary" style="flex:1">${p ? "حفظ التعديلات" : "إضافة المنتج"}</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      </div>
    </form>
  `;
  overlay.classList.add("open");

  document.getElementById("productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveProduct(id);
  });
}

function saveProduct(id) {
  const products = KS.getProducts();
  const sizes = document.getElementById("pSizes").value.split(",").map(s => s.trim()).filter(Boolean);
  const colors = document.getElementById("pColors").value.split(",").map(s => s.trim()).filter(Boolean);
  const variants = (sizes.length || colors.length) ? { sizes: sizes.length ? sizes : null, colors: colors.length ? colors : null } : null;

  const data = {
    id: id || KS.uid(),
    name: document.getElementById("pName").value,
    category: document.getElementById("pCategory").value,
    price: Number(document.getElementById("pPrice").value),
    oldPrice: document.getElementById("pOldPrice").value ? Number(document.getElementById("pOldPrice").value) : null,
    image: document.getElementById("pImage").value,
    badge: document.getElementById("pBadge").value || null,
    stock: Number(document.getElementById("pStock").value),
    variants
  };

  if (id) {
    const idx = products.findIndex(p => p.id === id);
    products[idx] = data;
  } else {
    products.push(data);
  }
  KS.saveProducts(products);
  closeModal();
  renderTab();
  showToast(id ? "تم تحديث المنتج" : "تم إضافة المنتج بنجاح");
}

function deleteProduct(id) {
  if (!confirm("متأكد إنك عايز تحذف المنتج ده؟")) return;
  const products = KS.getProducts().filter(p => p.id !== id);
  KS.saveProducts(products);
  renderTab();
  showToast("تم حذف المنتج");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

/* ================= الشكاوى ================= */
function statusClass(status) {
  return "status-" + status.replace(/\s+/g, "-");
}

function complaintsTabHTML() {
  const complaints = KS.getComplaints();
  return `
    <div class="admin-toolbar">
      <div class="form-note">${complaints.length} شكوى / اقتراح</div>
    </div>
    ${complaints.length === 0 ? `<div class="empty-state">لسه مفيش شكاوى وصلت</div>` : complaints.map(c => `
      <div class="complaint-row">
        <div style="flex:1;min-width:220px">
          <strong>${c.name}</strong> — ${c.phone}
          <div class="form-note" style="margin:4px 0">${c.type}${c.orderId ? " · طلب " + c.orderId : ""}</div>
          <p style="margin:6px 0;font-size:14px">${c.message}</p>
          <span style="font-size:12.5px;color:#9b9584">${new Date(c.date).toLocaleString("ar-EG")}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <select onchange="updateComplaint('${c.id}', this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid var(--line)">
            ${["جديدة", "قيد المعالجة", "تم الحل"].map(s => `<option ${c.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <button class="btn btn-danger small-btn" onclick="removeComplaint('${c.id}')">حذف</button>
        </div>
      </div>
    `).join("")}
  `;
}

function updateComplaint(id, status) {
  KS.updateComplaintStatus(id, status);
  showToast("تم تحديث حالة الشكوى");
}
function removeComplaint(id) {
  if (!confirm("حذف الشكوى دي؟")) return;
  KS.deleteComplaint(id);
  renderTab();
}

/* ================= الطلبات ================= */
function ordersTabHTML() {
  const orders = KS.getOrders();
  const statuses = KS.ORDER_STATUSES;
  const counts = statuses.reduce((acc, s) => { acc[s] = orders.filter(o => o.status === s).length; return acc; }, {});
  return `
    <div class="stat-cards">
      <div class="stat-card"><span class="stat-num">${orders.length}</span><span class="stat-label">إجمالي الطلبات</span></div>
      ${statuses.map(s => `<div class="stat-card"><span class="stat-num">${counts[s]}</span><span class="stat-label">${s}</span></div>`).join("")}
    </div>
    ${orders.length === 0 ? `<div class="empty-state">لسه مفيش طلبات</div>` : orders.map(o => {
      const sc = KS.statusColor(o.status);
      return `
      <div class="complaint-row">
        <div style="flex:1;min-width:220px">
          <strong>${o.id}</strong> — ${o.name} (${o.phone})
          <div class="form-note" style="margin:4px 0">${o.address}</div>
          <span style="font-size:12.5px;color:#9b9584">${new Date(o.date).toLocaleString("ar-EG")} · ${KS.fmt(o.total)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <span class="status-pill" style="background:${sc.bg};color:${sc.color}">${o.status}</span>
          <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid var(--line)">
            ${statuses.map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
      </div>
    `; }).join("")}
  `;
}
function updateOrderStatus(id, status) {
  const orders = KS.getOrders();
  const o = orders.find(x => x.id === id);
  if (o) o.status = status;
  localStorage.setItem(KS.KEYS.orders, JSON.stringify(orders));
  showToast("تم تحديث حالة الطلب");
}

/* ================= الإعدادات ================= */
function settingsTabHTML() {
  const cfg = KS.getSettings();
  const products = KS.getProducts();
  const orders = KS.getOrders();
  const complaints = KS.getComplaints();
  return `
    <div class="stat-cards">
      <div class="stat-card"><span class="stat-num">${products.length}</span><span class="stat-label">منتج</span></div>
      <div class="stat-card"><span class="stat-num">${orders.length}</span><span class="stat-label">طلب</span></div>
      <div class="stat-card"><span class="stat-num">${complaints.length}</span><span class="stat-label">شكوى / اقتراح</span></div>
    </div>

    <div class="card" style="max-width:560px">
      <h3 style="margin-top:0">شعار المتجر وخلفية الصفحة الرئيسية</h3>
      <form id="brandForm">
        <div class="field" style="margin-bottom:6px">
          <label>رابط شعار المتجر (اللوجو)</label>
          <input type="url" id="settingsLogo" value="${cfg.logoUrl || ""}" placeholder="https://...">
        </div>
        ${cfg.logoUrl ? `<img src="${cfg.logoUrl}" class="settings-preview" alt="اللوجو">` : ""}
        <div class="field" style="margin:14px 0 6px">
          <label>رابط خلفية الصفحة الرئيسية (Hero)</label>
          <input type="url" id="settingsHeroBg" value="${cfg.heroBackgroundUrl || ""}" placeholder="https://...">
        </div>
        ${cfg.heroBackgroundUrl ? `<img src="${cfg.heroBackgroundUrl}" class="settings-preview" alt="خلفية الموقع">` : ""}
        <p class="form-note" style="margin-top:10px">حط رابط صورة مباشر (زي imgbb.com أو Cloudinary). سيب الحقل فاضي عشان ترجع للشكل الافتراضي.</p>
        <div style="display:flex;gap:10px;margin-top:6px">
          <button class="btn btn-primary" type="submit">حفظ الشعار والخلفية</button>
          <button class="btn btn-ghost" type="button" onclick="resetBrandVisuals()">استعادة الشكل الافتراضي</button>
        </div>
      </form>
    </div>

    <div class="card" style="max-width:560px;margin-top:20px">
      <h3 style="margin-top:0">بيانات المتجر</h3>
      <form id="storeInfoForm">
        <div class="form-grid">
          <div class="field full"><label>اسم المتجر</label><input type="text" id="settingsStoreName" value="${cfg.storeName}" required></div>
          <div class="field full"><label>نص الشريط العلوي</label><input type="text" id="settingsTagline" value="${cfg.tagline}"></div>
          <div class="field"><label>رقم واتساب (بالصيغة الدولية بدون +)</label><input type="text" id="settingsWhatsapp" value="${cfg.whatsapp}" placeholder="2011xxxxxxxx"></div>
          <div class="field"><label>رابط فيسبوك</label><input type="url" id="settingsFacebook" value="${cfg.facebook}"></div>
          <div class="field full"><label>رابط انستجرام</label><input type="url" id="settingsInstagram" value="${cfg.instagram}"></div>
        </div>
        <button class="btn btn-primary" style="margin-top:16px" type="submit">حفظ بيانات المتجر</button>
      </form>
    </div>

    <div class="card" style="max-width:480px;margin-top:20px">
      <h3 style="margin-top:0">تغيير كلمة سر الأدمن</h3>
      <p class="form-note" style="margin-bottom:14px;color:#b3813a">⚠️ بعد تغيير كلمة السر هنا، لازم تروح لـ Firebase Console → Authentication → Users وتغيّر كلمة سر المستخدم admin@koreshstore.com لنفس القيمة الجديدة، عشان إضافة/تعديل المنتجات يفضل شغال.</p>
      <form id="passForm">
        <div class="field" style="margin-bottom:14px"><label>كلمة السر الحالية</label><input type="password" id="oldPass" required></div>
        <div class="field" style="margin-bottom:14px"><label>كلمة السر الجديدة</label><input type="password" id="newPass" required minlength="4"></div>
        <button class="btn btn-primary" type="submit">حفظ كلمة السر الجديدة</button>
      </form>
      <p id="passMsg" class="form-note" style="margin-top:12px"></p>
    </div>
    <div class="card" style="max-width:480px;margin-top:20px">
      <h3 style="margin-top:0">إعادة ضبط المتجر</h3>
      <p class="form-note">مسح كل المنتجات المضافة والرجوع لمتجر فاضي. الإجراء ده لا يمكن التراجع عنه.</p>
      <button class="btn btn-danger" onclick="resetStoreData()">مسح كل المنتجات</button>
    </div>
  `;
}

document.addEventListener("submit", (e) => {
  if (e.target.id === "passForm") {
    e.preventDefault();
    const oldPass = document.getElementById("oldPass").value;
    const newPass = document.getElementById("newPass").value;
    const msg = document.getElementById("passMsg");
    if (!KS.checkPassword(oldPass)) {
      msg.textContent = "كلمة السر الحالية غلط";
      msg.style.color = "#b3413a";
      return;
    }
    KS.setPassword(newPass);
    msg.textContent = "تم تغيير كلمة السر بنجاح ✅ — متنساش تغيّرها كمان في Firebase Authentication";
    msg.style.color = "#245c33";
    e.target.reset();
  }

  if (e.target.id === "brandForm") {
    e.preventDefault();
    const settings = KS.getSettings();
    settings.logoUrl = document.getElementById("settingsLogo").value.trim();
    settings.heroBackgroundUrl = document.getElementById("settingsHeroBg").value.trim();
    KS.saveSettings(settings);
    applyLoginBranding();
    renderLayout(null);
    renderTab();
    showToast("تم حفظ الشعار والخلفية");
  }

  if (e.target.id === "storeInfoForm") {
    e.preventDefault();
    const settings = KS.getSettings();
    settings.storeName = document.getElementById("settingsStoreName").value.trim() || settings.storeName;
    settings.tagline = document.getElementById("settingsTagline").value.trim();
    settings.whatsapp = document.getElementById("settingsWhatsapp").value.trim() || settings.whatsapp;
    settings.facebook = document.getElementById("settingsFacebook").value.trim();
    settings.instagram = document.getElementById("settingsInstagram").value.trim();
    KS.saveSettings(settings);
    applyLoginBranding();
    renderLayout(null);
    renderTab();
    showToast("تم حفظ بيانات المتجر");
  }
});

function resetBrandVisuals() {
  const settings = KS.getSettings();
  settings.logoUrl = "";
  settings.heroBackgroundUrl = "";
  KS.saveSettings(settings);
  applyLoginBranding();
  renderLayout(null);
  renderTab();
  showToast("رجعنا الشعار والخلفية للشكل الافتراضي");
}

function resetStoreData() {
  if (!confirm("متأكد؟ هيتم حذف كل المنتجات نهائيًا من المتصفح ده.")) return;
  KS.resetProducts();
  renderTab();
  showToast("تم مسح كل المنتجات");
}
