/* ============================================================
   Koresh Store — لوحة التحكم (admin.html)
   تسجيل الدخول بقى حقيقي عبر Firebase Authentication، وكل التعديلات
   (منتجات، إعدادات، حالات الطلبات والشكاوى) بتتكتب في Firestore
   فتظهر لكل زوار الموقع فورًا.
   ============================================================ */

let currentTab = "overview";
let cloudListenersStarted = false;
let currentProductImage = null; // الصورة اللي هتتخزن مع المنتج بعد الرفع من الجهاز

/* ================= رفع وضغط الصور من الجهاز ================= */
// بتاخد ملف من input[type=file] وترجع Data URL مضغوط وبمقاس مناسب،
// عشان الصور المرفوعة من الجهاز متبقاش تقيلة على قاعدة البيانات (Firestore).
function compressImageToDataURL(file, opts = {}) {
  const {
    maxDim = 1200,
    quality = 0.82,
    mime = "image/jpeg",
    fillWhite = true,
    targetBytes = 700 * 1024
  } = opts;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (mime === "image/jpeg" && fillWhite) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);

      if (mime === "image/png") {
        resolve(canvas.toDataURL("image/png"));
        return;
      }

      let q = quality;
      let dataUrl = canvas.toDataURL(mime, q);
      while (dataUrl.length * 0.75 > targetBytes && q > 0.4) {
        q -= 0.1;
        dataUrl = canvas.toDataURL(mime, q);
      }
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    img.src = objectUrl;
  });
}

/* ================= المصادقة ================= */
function initAdminAuth() {
  KS.initAuthListener((user) => {
    if (user) {
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("adminScreen").style.display = "block";
      startAdminCloudListeners();
      renderTab();
    } else {
      document.getElementById("loginScreen").style.display = "flex";
      document.getElementById("adminScreen").style.display = "none";
      cloudListenersStarted = false;
    }
  });
}

function startAdminCloudListeners() {
  if (cloudListenersStarted) return;
  cloudListenersStarted = true;
  // مهم: صفحة admin.html مش بتحمّل js/store.js (اللي فيه دالة renderProducts)،
  // فـ bootstrapPage وحدها ماكنتش بتشغّل الاستماع اللحظي لمنتجات Firestore هنا،
  // ولذلك كانت لوحة التحكم بتفضل شايفة "لا توجد منتجات" حتى لو المنتج فعلاً
  // متضاف وظاهر في الصفحة الرئيسية. الاستماع بالشكل ده بيحل المشكلة.
  KS.initCloudProducts(() => { if (currentTab === "products" || currentTab === "overview") renderTab(); });
  KS.initCloudOrders(() => { if (currentTab === "orders" || currentTab === "overview") renderTab(); });
  KS.initCloudComplaints(() => { if (currentTab === "complaints" || currentTab === "overview") renderTab(); });
  KS.initCloudVideos(() => { if (currentTab === "videos") renderTab(); });
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;
  const errorEl = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "جاري الدخول...";
  try {
    await KS.loginWithEmail(email, pass);
    errorEl.style.display = "none";
  } catch (err) {
    console.error(err);
    errorEl.textContent = "الإيميل أو كلمة السر غلط، حاول تاني";
    errorEl.style.display = "block";
  }
  btn.disabled = false;
  btn.textContent = "دخول";
}

async function handleLogout() {
  await KS.logout();
}

/* ================= التبويبات ================= */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  renderTab();
}

function renderTab() {
  const content = document.getElementById("tabContent");
  if (currentTab === "overview") content.innerHTML = overviewTabHTML();
  if (currentTab === "products") content.innerHTML = productsTabHTML();
  if (currentTab === "complaints") content.innerHTML = complaintsTabHTML();
  if (currentTab === "orders") content.innerHTML = ordersTabHTML();
  if (currentTab === "videos") { content.innerHTML = videosTabHTML(); bindVideosEvents(); }
  if (currentTab === "settings") { content.innerHTML = settingsTabHTML(); bindSettingsEvents(); }
}

/* ================= نظرة عامة ================= */
function overviewTabHTML() {
  const products = KS.getProducts();
  const orders = KS.getOrders();
  const complaints = KS.getComplaints();

  const revenue = orders.filter(o => o.status !== "ملغي").reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => !["تم التوصيل", "ملغي"].includes(o.status)).length;
  const cancelledOrders = orders.filter(o => o.status === "ملغي").length;
  const newComplaints = complaints.filter(c => c.status === "جديدة").length;
  const lowStock = products.filter(p => (p.stock ?? 0) <= 3).length;

  const stat = (label, value, tint) => `
    <div class="card" style="text-align:center">
      <div style="font-size:26px;font-weight:800;color:${tint || "var(--ink)"}">${value}</div>
      <div class="form-note" style="margin-top:6px">${label}</div>
    </div>
  `;

  return `
    <div class="stats-grid">
      ${stat("إجمالي المنتجات", products.length)}
      ${stat("إجمالي الطلبات", orders.length)}
      ${stat("طلبات قيد التنفيذ", pendingOrders, "var(--clay)")}
      ${stat("طلبات ملغاة", cancelledOrders, "#b3413a")}
      ${stat("إجمالي المبيعات (غير الملغاة)", KS.fmt(revenue), "#245c33")}
      ${stat("شكاوى جديدة لسه ماتحلتش", newComplaints, "var(--clay)")}
    </div>
    ${lowStock > 0 ? `<div class="warn-note" style="margin-top:20px">⚠️ عندك ${lowStock} منتج الكمية بتاعته 3 أو أقل — راجع المخزون من تبويب "المنتجات".</div>` : ""}
    <div class="card" style="margin-top:20px">
      <h3 style="margin-top:0">آخر الطلبات</h3>
      ${orders.length === 0 ? `<div class="empty-state">لسه مفيش طلبات</div>` : orders.slice(0, 5).map(o => `
        <div class="complaint-row">
          <div><strong>${o.id}</strong> — ${o.name} <span class="form-note">(${new Date(o.date).toLocaleDateString("ar-EG")})</span></div>
          <span class="status-pill ${orderStatusClass(o.status)}">${o.status}</span>
        </div>
      `).join("")}
    </div>
  `;
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
  currentProductImage = p?.image || null;

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
        <div class="field full">
          <label>صورة المنتج</label>
          <div class="image-upload-field">
            <img id="pImagePreview" src="${p?.image || ""}" style="${p?.image ? "" : "display:none;"}">
            <input type="file" id="pImageFile" accept="image/*" style="flex:1">
          </div>
          <span class="form-note">ارفع صورة من جهازك مباشرة (يفضّل صورة مربعة الشكل).</span>
        </div>
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

  document.getElementById("pImageFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataURL(file, { maxDim: 1000, quality: 0.82, mime: "image/jpeg", targetBytes: 450 * 1024 });
      currentProductImage = dataUrl;
      const preview = document.getElementById("pImagePreview");
      preview.src = dataUrl;
      preview.style.display = "block";
    } catch (err) {
      console.error(err);
      showToast("حصل خطأ في قراءة الصورة");
    }
  });

  document.getElementById("productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentProductImage) {
      showToast("لازم ترفع صورة للمنتج الأول");
      return;
    }
    saveProduct(id);
  });
}

async function saveProduct(id) {
  const submitBtn = document.querySelector("#productForm button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "جاري الحفظ...";

  const sizes = document.getElementById("pSizes").value.split(",").map(s => s.trim()).filter(Boolean);
  const colors = document.getElementById("pColors").value.split(",").map(s => s.trim()).filter(Boolean);
  const variants = (sizes.length || colors.length) ? { sizes: sizes.length ? sizes : null, colors: colors.length ? colors : null } : null;

  const data = {
    id: id || KS.uid(),
    name: document.getElementById("pName").value,
    category: document.getElementById("pCategory").value,
    price: Number(document.getElementById("pPrice").value),
    oldPrice: document.getElementById("pOldPrice").value ? Number(document.getElementById("pOldPrice").value) : null,
    image: currentProductImage,
    badge: document.getElementById("pBadge").value || null,
    stock: Number(document.getElementById("pStock").value),
    variants
  };

  try {
    await KS.saveProductCloud(data);
    closeModal();
    showToast(id ? "تم تحديث المنتج" : "تم إضافة المنتج بنجاح");
  } catch (err) {
    console.error(err);
    submitBtn.disabled = false;
    submitBtn.textContent = id ? "حفظ التعديلات" : "إضافة المنتج";
    showToast("حصل خطأ، حاول تاني");
  }
}

async function deleteProduct(id) {
  if (!confirm("متأكد إنك عايز تحذف المنتج ده؟")) return;
  try {
    await KS.deleteProductCloud(id);
    showToast("تم حذف المنتج");
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في الحذف");
  }
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

/* ================= الشكاوى ================= */
function statusClass(status) {
  if (status === "ملغي") return "status-ملغي";
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
            ${COMPLAINT_STATUSES.map(s => `<option ${c.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <button class="btn btn-danger small-btn" onclick="removeComplaint('${c.id}')">حذف</button>
        </div>
      </div>
    `).join("")}
  `;
}

async function updateComplaint(id, status) {
  try {
    await KS.updateComplaintStatusCloud(id, status);
    showToast("تم تحديث حالة الشكوى");
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في التحديث");
  }
}
async function removeComplaint(id) {
  if (!confirm("حذف الشكوى دي؟")) return;
  try {
    await KS.deleteComplaintCloud(id);
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في الحذف");
  }
}

/* ================= الطلبات ================= */
function orderStatusClass(status) {
  if (status === "ملغي") return "status-ملغي";
  if (status === "تم التوصيل") return "status-تم-الحل";
  return "status-قيد-المعالجة";
}

function ordersTabHTML() {
  const orders = KS.getOrders();
  return `
    <div class="admin-toolbar"><div class="form-note">${orders.length} طلب</div></div>
    ${orders.length === 0 ? `<div class="empty-state">لسه مفيش طلبات</div>` : orders.map(o => `
      <div class="complaint-row">
        <div style="flex:1;min-width:220px">
          <strong>${o.id}</strong> — ${o.name} (${o.phone})
          <div class="form-note" style="margin:4px 0">${o.address}</div>
          <span style="font-size:12.5px;color:#9b9584">${new Date(o.date).toLocaleString("ar-EG")} · ${KS.fmt(o.total)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid var(--line)">
            ${ORDER_STATUSES.map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <span class="status-pill ${orderStatusClass(o.status)}">${o.status}</span>
        </div>
      </div>
    `).join("")}
  `;
}
async function updateOrderStatus(id, status) {
  try {
    await KS.updateOrderStatusCloud(id, status);
    showToast("تم تحديث حالة الطلب");
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في التحديث");
  }
}

/* ================= الفيديوهات ================= */
function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} م.ب` : `${(bytes / 1024).toFixed(0)} ك.ب`;
}

function videosTabHTML() {
  const videos = KS.getVideos();
  return `
    <div class="admin-toolbar">
      <div class="form-note">${videos.length} فيديو مرفوع — بتظهر لكل زوار الموقع في صفحة "الفيديوهات"</div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-top:0">رفع فيديو جديد</h3>
      <p class="form-note" style="margin-bottom:14px">اختار فيديو أو أكتر من جهاز الكمبيوتر مباشرة (مفيش أي روابط مطلوبة).</p>
      <p class="form-note" style="margin-bottom:14px">⏳ وقت الرفع بيعتمد على حجم الفيديو وسرعة النت عندك — فيديو كبير (دقايق طويلة أو دقة عالية جدًا) ممكن ياخد وقت. لو عايز الرفع يبقى أسرع، قلّل حجم/دقة الفيديو قبل ما ترفعه.</p>
      <input type="file" id="videoUploadInput" accept="video/*" multiple>
      <div id="videoUploadProgress" style="margin-top:14px;display:flex;flex-direction:column;gap:8px"></div>
    </div>
    ${videos.length === 0 ? `<div class="empty-state">لسه مفيش فيديوهات متضافة</div>` : `
    <div class="video-grid">
      ${videos.map(v => `
        <div class="card video-card">
          <video src="${v.url}" controls preload="metadata"></video>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px">
            <div style="min-width:0">
              <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.name || "فيديو"}</div>
              <span class="form-note">${formatBytes(v.size)}</span>
            </div>
            <button class="btn btn-danger small-btn" onclick="deleteVideo('${v.id}')">حذف</button>
          </div>
        </div>
      `).join("")}
    </div>`}
  `;
}

function bindVideosEvents() {
  const input = document.getElementById("videoUploadInput");
  if (!input) return;
  input.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const progressBox = document.getElementById("videoUploadProgress");
    input.disabled = true;

    // بيترفعوا واحد ورا التاني (مش كلهم مع بعض) عشان كل فيديو ياخد أقصى سرعة
    // إنترنت متاحة، وعشان تشوف فيديو خلص وهو ظاهر من غير ما تستنى الكل يخلصوا
    for (const file of files) {
      const row = document.createElement("div");
      row.textContent = `جاري رفع "${file.name}"... 0%`;
      progressBox.appendChild(row);

      try {
        await KS.uploadVideoCloud(file, (pct) => {
          row.textContent = `جاري رفع "${file.name}"... ${pct}%`;
        });
        row.textContent = `تم رفع "${file.name}" ✅`;
      } catch (err) {
        console.error(err);
        row.textContent = `حصل خطأ في رفع "${file.name}"`;
      }
    }

    input.disabled = false;
    e.target.value = "";
    showToast("تم رفع الفيديوهات لكل زوار الموقع");
  });
}

async function deleteVideo(id) {
  if (!confirm("متأكد إنك عايز تحذف الفيديو ده؟")) return;
  try {
    await KS.deleteVideoCloud(id);
    showToast("تم حذف الفيديو");
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في الحذف");
  }
}

/* ================= الإعدادات ================= */
function settingsTabHTML() {
  const s = KS.getSettings();
  return `
    <div class="settings-grid">

      <div class="card">
        <h3 style="margin-top:0">هوية المتجر</h3>
        <form id="identityForm">
          <div class="field" style="margin-bottom:14px">
            <label>اسم المتجر</label>
            <input type="text" id="setStoreName" value="${s.storeName}" required>
          </div>
          <div class="field" style="margin-bottom:14px">
            <label>لوجو المتجر</label>
            <div style="display:flex;align-items:center;gap:14px">
              <img id="logoPreview" src="${s.logo}" style="width:56px;height:56px;object-fit:contain;border:1px solid var(--line);border-radius:10px;background:#fff">
              <input type="file" id="logoUpload" accept="image/*" style="flex:1">
            </div>
            <span class="form-note">ارفع صورة اللوجو (PNG بخلفية شفافة أفضل). هتتخزن في إعدادات المتجر على السحابة.</span>
          </div>
          <div class="field" style="margin-bottom:14px">
            <label>شريط الإعلان العلوي</label>
            <input type="text" id="setTopStrip" value="${s.topStrip}">
          </div>
          <button class="btn btn-primary" type="submit">حفظ هوية المتجر</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin-top:0">التواصل والسوشيال ميديا</h3>
        <form id="contactForm">
          <div class="field" style="margin-bottom:14px">
            <label>رقم الواتساب (بالصيغة الدولية بدون +، مثال 201114577749)</label>
            <input type="text" id="setWhatsapp" value="${s.whatsapp}" required pattern="^[0-9]{10,15}$">
          </div>
          <div class="field" style="margin-bottom:14px">
            <label>رابط صفحة الفيسبوك</label>
            <input type="url" id="setFacebook" value="${s.facebook}">
          </div>
          <div class="field" style="margin-bottom:14px">
            <label>رابط صفحة الانستجرام</label>
            <input type="url" id="setInstagram" value="${s.instagram}">
          </div>
          <button class="btn btn-primary" type="submit">حفظ بيانات التواصل</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin-top:0">صور خلفية الشاشة الرئيسية</h3>
        <p class="form-note" style="margin-bottom:14px">ارفع صورة أو أكتر من جهازك مباشرة، وهتظهر بالتبادل (تلاشي ناعم) في خلفية الشاشة الرئيسية لكل زوار الموقع. الترتيب اللي هنا هو ترتيب الظهور — حد أقصى 6 صور.</p>
        <div id="heroImageManager"></div>
        <div style="margin-top:14px">
          <input type="file" id="heroImageUpload" accept="image/*" multiple>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-top:0">ألوان الموقع</h3>
        <p class="form-note" style="margin-bottom:16px">غيّر ألوان الموقع زي ما تحب — التغيير بيظهر فورًا لكل زوار الموقع</p>
        <form id="themeForm">
          <div class="color-grid">
            <div class="field"><label>اللون الأساسي الغامق (الهيدر والفوتر)</label><input type="color" id="setDark" value="${s.dark}"></div>
            <div class="field"><label>لون التمييز (الأزرار والتفاصيل)</label><input type="color" id="setAccent" value="${s.accent}"></div>
            <div class="field"><label>لون التمييز الفاتح</label><input type="color" id="setAccentLight" value="${s.accentLight}"></div>
            <div class="field"><label>لون خلفية الموقع</label><input type="color" id="setSand" value="${s.sand}"></div>
            <div class="field"><label>لون العروض والخصومات</label><input type="color" id="setClay" value="${s.clay}"></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn btn-primary" type="submit">حفظ الألوان</button>
            <button class="btn btn-ghost" type="button" onclick="resetTheme()">رجوع للألوان الافتراضية</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3 style="margin-top:0">تغيير كلمة سر الأدمن</h3>
        <p class="form-note" style="margin-bottom:12px">لو غيّرت من فترة طويلة ورفض التحديث، سجّل خروج وادخل تاني وجرّب من جديد (Firebase بيطلب تسجيل دخول حديث لتغيير الباسورد).</p>
        <form id="passForm">
          <div class="field" style="margin-bottom:14px"><label>كلمة السر الجديدة</label><input type="password" id="newPass" required minlength="6"></div>
          <button class="btn btn-primary" type="submit">حفظ كلمة السر الجديدة</button>
        </form>
        <p id="passMsg" class="form-note" style="margin-top:12px"></p>
      </div>

      <div class="card">
        <h3 style="margin-top:0;color:#b3413a">منطقة الخطر</h3>
        <p class="form-note" style="margin-bottom:10px">حذف كل المنتجات من المتجر نهائيًا (من عند كل الزوار).</p>
        <button class="btn btn-danger" onclick="resetStoreData()">مسح كل المنتجات</button>
      </div>

    </div>
  `;
}

function bindSettingsEvents() {
  renderHeroImageManager();

  document.getElementById("logoUpload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataURL(file, { maxDim: 260, mime: "image/png" });
      document.getElementById("logoPreview").src = dataUrl;
      const s = KS.getSettings();
      s.logo = dataUrl;
      await KS.saveSettingsCloud(s);
      showToast("تم تحديث اللوجو لكل زوار الموقع");
    } catch (err) {
      console.error(err);
      showToast("حصل خطأ في رفع اللوجو");
    }
    e.target.value = "";
  });

  document.getElementById("heroImageUpload").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const s = KS.getSettings();
    const images = [...(s.heroImages || [])];
    if (images.length >= 6) {
      showToast("وصلت للحد الأقصى (6 صور) — احذف صورة الأول عشان تضيف غيرها");
      e.target.value = "";
      return;
    }
    const room = 6 - images.length;
    const toAdd = files.slice(0, room);
    try {
      for (const file of toAdd) {
        const dataUrl = await compressImageToDataURL(file, { maxDim: 1600, quality: 0.75, mime: "image/jpeg", targetBytes: 260 * 1024 });
        images.push(dataUrl);
      }
      s.heroImages = images;
      await KS.saveSettingsCloud(s);
      renderHeroImageManager();
      showToast(toAdd.length > 1 ? "تم إضافة الصور لخلفية الشاشة الرئيسية" : "تم إضافة الصورة لخلفية الشاشة الرئيسية");
    } catch (err) {
      console.error(err);
      showToast("حصل خطأ في رفع الصورة");
    }
    e.target.value = "";
  });

  document.getElementById("identityForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const s = KS.getSettings();
      s.storeName = document.getElementById("setStoreName").value;
      s.topStrip = document.getElementById("setTopStrip").value;
      await KS.saveSettingsCloud(s);
      showToast("تم حفظ هوية المتجر");
    } catch (err) {
      console.error(err);
      showToast("حصل خطأ في الحفظ");
    }
  });

  document.getElementById("contactForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const s = KS.getSettings();
      s.whatsapp = document.getElementById("setWhatsapp").value;
      s.facebook = document.getElementById("setFacebook").value;
      s.instagram = document.getElementById("setInstagram").value;
      await KS.saveSettingsCloud(s);
      showToast("تم حفظ بيانات التواصل");
    } catch (err) {
      console.error(err);
      showToast("حصل خطأ في الحفظ");
    }
  });

  document.getElementById("themeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const s = KS.getSettings();
      s.dark = document.getElementById("setDark").value;
      s.accent = document.getElementById("setAccent").value;
      s.accentLight = document.getElementById("setAccentLight").value;
      s.sand = document.getElementById("setSand").value;
      s.clay = document.getElementById("setClay").value;
      await KS.saveSettingsCloud(s);
      showToast("تم حفظ ألوان الموقع");
    } catch (err) {
      console.error(err);
      showToast("حصل خطأ في الحفظ");
    }
  });
}

/* ================= صور خلفية الشاشة الرئيسية ================= */
function renderHeroImageManager() {
  const container = document.getElementById("heroImageManager");
  if (!container) return;
  const images = KS.getSettings().heroImages || [];
  if (images.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:18px 10px">لسه مفيش صور خلفية متضافة — الشاشة الرئيسية هتفضل باللون الافتراضي لحد ما تضيف صورة</div>`;
    return;
  }
  container.innerHTML = `
    <div class="hero-thumb-row">
      ${images.map((src, i) => `
        <div class="hero-thumb">
          <img src="${src}" alt="صورة خلفية ${i + 1}">
          <div class="hero-thumb-actions">
            <button type="button" onclick="moveHeroImage(${i}, -1)" ${i === 0 ? "disabled" : ""} title="قدّمها في الترتيب">↑</button>
            <button type="button" onclick="moveHeroImage(${i}, 1)" ${i === images.length - 1 ? "disabled" : ""} title="أخّرها في الترتيب">↓</button>
            <button type="button" class="danger" onclick="removeHeroImage(${i})" title="احذف الصورة">✕</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function moveHeroImage(index, dir) {
  const s = KS.getSettings();
  const images = [...(s.heroImages || [])];
  const target = index + dir;
  if (target < 0 || target >= images.length) return;
  [images[index], images[target]] = [images[target], images[index]];
  s.heroImages = images;
  try {
    await KS.saveSettingsCloud(s);
    renderHeroImageManager();
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في تغيير الترتيب");
  }
}

async function removeHeroImage(index) {
  const s = KS.getSettings();
  const images = [...(s.heroImages || [])];
  images.splice(index, 1);
  s.heroImages = images;
  try {
    await KS.saveSettingsCloud(s);
    renderHeroImageManager();
    showToast("اتشالت الصورة");
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في الحذف");
  }
}

async function resetTheme() {
  try {
    const s = KS.getSettings();
    Object.assign(s, {
      accent: KS.DEFAULT_SETTINGS.accent,
      accentLight: KS.DEFAULT_SETTINGS.accentLight,
      dark: KS.DEFAULT_SETTINGS.dark,
      sand: KS.DEFAULT_SETTINGS.sand,
      clay: KS.DEFAULT_SETTINGS.clay
    });
    await KS.saveSettingsCloud(s);
    renderTab();
    showToast("تم رجوع الألوان الافتراضية");
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ");
  }
}

document.addEventListener("submit", async (e) => {
  if (e.target.id === "passForm") {
    e.preventDefault();
    const newPass = document.getElementById("newPass").value;
    const msg = document.getElementById("passMsg");
    try {
      await KS.changeAdminPassword(newPass);
      msg.textContent = "تم تغيير كلمة السر بنجاح ✅";
      msg.style.color = "#245c33";
      e.target.reset();
    } catch (err) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        msg.textContent = "محتاج تسجّل خروج وتدخل تاني قبل ما تغيّر كلمة السر (إجراء أمان من Firebase)";
      } else {
        msg.textContent = "حصل خطأ، جرّب تاني";
      }
      msg.style.color = "#b3413a";
    }
  }
});

async function resetStoreData() {
  if (!confirm("متأكد؟ هيتم حذف كل المنتجات نهائيًا من المتجر عند كل الزوار.")) return;
  try {
    const { db, collection, getDocs, deleteDoc } = window.firestoreAPI;
    const snap = await getDocs(collection(db, "products"));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    showToast("تم مسح كل المنتجات");
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في المسح");
  }
}
