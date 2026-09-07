/* ============================================================
   Koresh Store — طبقة التخزين (localStorage + Firebase Firestore)
   ============================================================ */

const KS = {
  KEYS: {
    products: "koresh_products",
    cart: "koresh_cart",
    complaints: "koresh_complaints",
    orders: "koresh_orders",
    auth: "koresh_admin_auth",
    passHash: "koresh_admin_pass_hash",
    settings: "koresh_settings"
  },

  // --- إعدادات المتجر (الشعار، الخلفية، بيانات التواصل) ---
  ORDER_STATUSES: ["قيد التجهيز", "تم الشحن", "تم التوصيل", "ملغي"],

  DEFAULT_SETTINGS: {
    storeName: SITE_CONFIG.storeName,
    tagline: "شحن سريع لكل المحافظات — والدفع عند الاستلام متاح",
    whatsapp: SITE_CONFIG.whatsapp,
    facebook: SITE_CONFIG.facebook,
    instagram: SITE_CONFIG.instagram,
    logoUrl: "",
    heroBackgroundUrl: ""
  },
  getSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.KEYS.settings)) || {};
      return { ...this.DEFAULT_SETTINGS, ...stored };
    } catch {
      return { ...this.DEFAULT_SETTINGS };
    }
  },
  saveSettings(settings) {
    localStorage.setItem(this.KEYS.settings, JSON.stringify(settings));
  },
  resetSettings() {
    localStorage.removeItem(this.KEYS.settings);
  },
  statusColor(status) {
    const map = {
      "قيد التجهيز": { bg: "#fdecd8", color: "#9a5a12" },
      "تم الشحن": { bg: "#e2ecfb", color: "#1e4c8f" },
      "في الطريق": { bg: "#e2ecfb", color: "#1e4c8f" },
      "تم التوصيل": { bg: "#e1f4e5", color: "#1f6b32" },
      "ملغي": { bg: "#fbe2e2", color: "#9a1f1f" }
    };
    return map[status] || { bg: "#eee", color: "#555" };
  },

  // --- تشفير بسيط لكلمة السر (مش تشفير قوي، بس أفضل من نص عادي) ---
  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return "h" + h.toString(16);
  },

  // =========================================================
  // المنتجات — دلوقتي متزامنة مع Firebase (Firestore)
  // بترجع فورًا من الكاش المحلي، وبتتحدّث تلقائيًا لو حصل تغيير
  // في Firebase (من أي جهاز تاني فتح لوحة التحكم)
  // =========================================================
  productsCache: null,

  getProducts() {
    if (this.productsCache) return this.productsCache;
    const raw = localStorage.getItem(this.KEYS.products);
    if (raw) {
      try {
        this.productsCache = JSON.parse(raw);
        return this.productsCache;
      } catch {}
    }
    this.productsCache = structuredClone(DEFAULT_PRODUCTS);
    return this.productsCache;
  },

  // تشغّل مرة واحدة مع فتح الصفحة، وبتفضل "سامعة" لأي تغيير في Firebase
  // onChange: دالة بتتنفذ كل ما البيانات تتحدث (تستخدمها عشان تعمل إعادة رسم)
  initCloudProducts(onChange) {
    if (!window.firestoreAPI) return;
    const { db, collection, onSnapshot } = window.firestoreAPI;
    onSnapshot(collection(db, "products"), (snap) => {
      const items = [];
      snap.forEach(docSnap => items.push(docSnap.data()));
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (items.length) {
        this.productsCache = items;
        localStorage.setItem(this.KEYS.products, JSON.stringify(items));
      } else if (!this.productsCache || this.productsCache === DEFAULT_PRODUCTS) {
        // أول مرة ومفيش حاجة في Firebase لسه: ارفع المنتجات الافتراضية
        this.saveProducts(structuredClone(DEFAULT_PRODUCTS));
      }
      if (typeof onChange === "function") onChange(this.productsCache);
    }, (err) => console.error("Firebase products sync error:", err));
  },

  // بتحفظ قائمة المنتجات كاملة في Firebase (وبتمسح أي منتج اتشال من القائمة)
  async saveProducts(products) {
    this.productsCache = products;
    localStorage.setItem(this.KEYS.products, JSON.stringify(products));
    if (!window.firestoreAPI) return;
    const { db, collection, doc, getDocs, setDoc, deleteDoc } = window.firestoreAPI;
    try {
      const existingSnap = await getDocs(collection(db, "products"));
      const existingIds = new Set();
      existingSnap.forEach(d => existingIds.add(d.id));

      const newIds = new Set(products.map(p => p.id));
      const toDelete = [...existingIds].filter(id => !newIds.has(id));

      await Promise.all(
        products.map((p, i) => setDoc(doc(db, "products", p.id), { ...p, order: i }))
      );
      await Promise.all(
        toDelete.map(id => deleteDoc(doc(db, "products", id)))
      );
    } catch (err) {
      console.error("Firebase save error:", err);
    }
  },

  resetProducts() {
    localStorage.removeItem(this.KEYS.products);
    this.productsCache = null;
  },

  // --- السلة ---
  getCart() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.cart)) || [];
    } catch {
      return [];
    }
  },
  saveCart(cart) {
    localStorage.setItem(this.KEYS.cart, JSON.stringify(cart));
  },
  addToCart(item) {
    const cart = this.getCart();
    const existing = cart.find(
      (c) => c.id === item.id && c.size === item.size && c.color === item.color
    );
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.push(item);
    }
    this.saveCart(cart);
    return cart;
  },
  removeFromCart(index) {
    const cart = this.getCart();
    cart.splice(index, 1);
    this.saveCart(cart);
    return cart;
  },
  clearCart() {
    localStorage.removeItem(this.KEYS.cart);
  },
  cartCount() {
    return this.getCart().reduce((sum, i) => sum + i.qty, 0);
  },
  cartTotal() {
    return this.getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
  },

  // --- الطلبات (لتتبع الطلب) ---
  getOrders() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.orders)) || [];
    } catch {
      return [];
    }
  },
  addOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order);
    localStorage.setItem(this.KEYS.orders, JSON.stringify(orders));
  },

  // --- الشكاوى ---
  getComplaints() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.complaints)) || [];
    } catch {
      return [];
    }
  },
  addComplaint(complaint) {
    const complaints = this.getComplaints();
    complaints.unshift(complaint);
    localStorage.setItem(this.KEYS.complaints, JSON.stringify(complaints));
    return complaints;
  },
  updateComplaintStatus(id, status) {
    const complaints = this.getComplaints();
    const c = complaints.find((x) => x.id === id);
    if (c) c.status = status;
    localStorage.setItem(this.KEYS.complaints, JSON.stringify(complaints));
  },
  deleteComplaint(id) {
    let complaints = this.getComplaints();
    complaints = complaints.filter((x) => x.id !== id);
    localStorage.setItem(this.KEYS.complaints, JSON.stringify(complaints));
  },

  // --- تسجيل دخول الأدمن ---
  DEFAULT_PASSWORD: "koresh2026",

  isFirstRun() {
    return !localStorage.getItem(this.KEYS.passHash);
  },
  setPassword(pass) {
    localStorage.setItem(this.KEYS.passHash, this.hash(pass));
  },
  checkPassword(pass) {
    const stored = localStorage.getItem(this.KEYS.passHash);
    if (!stored) {
      // أول مرة: لو مفيش باسورد متسجل، استخدم الافتراضي
      return pass === this.DEFAULT_PASSWORD;
    }
    return this.hash(pass) === stored;
  },
  login() {
    sessionStorage.setItem(this.KEYS.auth, "1");
  },
  logout() {
    sessionStorage.removeItem(this.KEYS.auth);
  },
  isLoggedIn() {
    return sessionStorage.getItem(this.KEYS.auth) === "1";
  },

  // --- أدوات عامة ---
  fmt(n) {
    return new Intl.NumberFormat("ar-EG").format(n) + " ج.م";
  },
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
};
