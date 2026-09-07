/* ============================================================
   Koresh Store — طبقة التخزين
   ============================================================
   - المنتجات، الإعدادات، الطلبات، الشكاوى: بقت متخزنة في Firebase
     Firestore، فأي تغيير من لوحة التحكم بيظهر لكل زوار الموقع فورًا،
     من أي جهاز.
   - السلة (Cart): لسه في localStorage لأنها بيانات مؤقتة خاصة
     بجلسة تسوق العميل نفسه بس، مفيش داعي تتخزن على السيرفر.
   - تسجيل دخول الأدمن: بقى حقيقي عبر Firebase Authentication
     (إيميل وباسورد)، مش باسورد وهمي متخزن في المتصفح زي الأول.
   ============================================================ */

const KS = {
  KEYS: {
    cart: "koresh_cart",
    // نسخة محلية خفيفة من طلبات/شكاوى العميل على الجهاز ده، لعرض
    // "طلباتي على الجهاز ده" بسرعة من غير ما نستنى السيرفر
    myOrders: "koresh_my_orders",
    myComplaints: "koresh_my_complaints"
  },

  /* ============== الجاهزية (Firebase) ============== */
  whenFirebaseReady(cb) {
    if (window.firestoreAPI) {
      cb();
    } else {
      window.addEventListener("firebase-ready", () => cb(), { once: true });
    }
  },
  whenFirebaseReadyPromise() {
    return new Promise((resolve) => this.whenFirebaseReady(resolve));
  },

  /* ============== الكاش المحلي (بيتحدث لحظيًا) ============== */
  _products: [],
  _settings: null,
  _orders: [],      // متاحة بس للأدمن بعد تسجيل الدخول
  _complaints: [],  // متاحة بس للأدمن بعد تسجيل الدخول

  DEFAULT_SETTINGS: {
    storeName: "Koresh Store",
    logo: "assets/logo.png",
    whatsapp: "201114577749",
    facebook: "https://www.facebook.com/share/1HpLuiX16D/?mibextid=wwXIfr",
    instagram: "https://instagram.com/koresh.store",
    accent: "#c8963e",
    accentLight: "#e3b563",
    dark: "#141225",
    sand: "#f4ede1",
    clay: "#b5502f",
    heroTitle: "كل اللي محتاجه",
    heroTitleAccent: "في مكان واحد",
    heroSubtitle: "إلكترونيات، موبايلات، أزياء، ومنتجات منزلية — أقسام واضحة، أسعار مباشرة، وشحن لحد باب البيت في كل المحافظات.",
    topStrip: "شحن سريع لكل المحافظات — والدفع عند الاستلام متاح",
    // صور خلفية الشاشة الرئيسية — بترفعها من لوحة التحكم مباشرة من الجهاز،
    // وبتتخزن كـ Data URL جوه إعدادات المتجر فتظهر لكل الزوار من أي جهاز.
    heroImages: []
  },

  getProducts() {
    return this._products;
  },
  getSettings() {
    return { ...this.DEFAULT_SETTINGS, ...(this._settings || {}) };
  },
  getOrders() {
    return this._orders;
  },
  getComplaints() {
    return this._complaints;
  },

  /* ============== الاستماع اللحظي (Realtime) ============== */
  initCloudProducts(onChange) {
    this.whenFirebaseReady(() => {
      const { db, collection, onSnapshot } = window.firestoreAPI;
      onSnapshot(
        collection(db, "products"),
        (snap) => {
          this._products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          onChange && onChange();
        },
        (err) => console.error("products snapshot error:", err)
      );
    });
  },

  initCloudSettings(onChange) {
    this.whenFirebaseReady(() => {
      const { db, doc, onSnapshot } = window.firestoreAPI;
      onSnapshot(
        doc(db, "settings", "site"),
        (snap) => {
          this._settings = snap.exists() ? snap.data() : {};
          onChange && onChange();
        },
        (err) => console.error("settings snapshot error:", err)
      );
    });
  },

  // بس للأدمن — بتتنادى بعد تسجيل الدخول
  initCloudOrders(onChange) {
    this.whenFirebaseReady(() => {
      const { db, collection, query, orderBy, onSnapshot } = window.firestoreAPI;
      onSnapshot(
        query(collection(db, "orders"), orderBy("date", "desc")),
        (snap) => {
          this._orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          onChange && onChange();
        },
        (err) => console.error("orders snapshot error:", err)
      );
    });
  },

  initCloudComplaints(onChange) {
    this.whenFirebaseReady(() => {
      const { db, collection, query, orderBy, onSnapshot } = window.firestoreAPI;
      onSnapshot(
        query(collection(db, "complaints"), orderBy("date", "desc")),
        (snap) => {
          this._complaints = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          onChange && onChange();
        },
        (err) => console.error("complaints snapshot error:", err)
      );
    });
  },

  /* ============== الكتابة (Firestore) ============== */
  async saveProductCloud(product) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, setDoc } = window.firestoreAPI;
    await setDoc(doc(db, "products", product.id), product);
  },
  async deleteProductCloud(id) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, deleteDoc } = window.firestoreAPI;
    await deleteDoc(doc(db, "products", id));
  },
  async saveSettingsCloud(settings) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, setDoc } = window.firestoreAPI;
    await setDoc(doc(db, "settings", "site"), settings, { merge: true });
  },
  async createOrderCloud(order) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, setDoc } = window.firestoreAPI;
    await setDoc(doc(db, "orders", order.id), order);
    this.rememberLocally(this.KEYS.myOrders, order.id);
  },
  async updateOrderStatusCloud(id, status) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, updateDoc } = window.firestoreAPI;
    await updateDoc(doc(db, "orders", id), { status });
  },
  async createComplaintCloud(complaint) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, setDoc } = window.firestoreAPI;
    await setDoc(doc(db, "complaints", complaint.id), complaint);
    this.rememberLocally(this.KEYS.myComplaints, complaint.id);
  },
  async updateComplaintStatusCloud(id, status) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, updateDoc } = window.firestoreAPI;
    await updateDoc(doc(db, "complaints", id), { status });
  },
  async deleteComplaintCloud(id) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, deleteDoc } = window.firestoreAPI;
    await deleteDoc(doc(db, "complaints", id));
  },

  /* ============== القراءة بمعرّف واحد (للتتبع العام) ============== */
  async getOrderById(id) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, getDoc } = window.firestoreAPI;
    const snap = await getDoc(doc(db, "orders", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  async getComplaintById(id) {
    await this.whenFirebaseReadyPromise();
    const { db, doc, getDoc } = window.firestoreAPI;
    const snap = await getDoc(doc(db, "complaints", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  /* ============== "طلباتي/شكاويّ على الجهاز ده" ============== */
  rememberLocally(key, id) {
    try {
      const list = JSON.parse(localStorage.getItem(key)) || [];
      list.unshift(id);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
    } catch { /* ignore */ }
  },
  getLocalIds(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  /* ============== تسجيل دخول الأدمن (Firebase Auth) ============== */
  _authUser: null,
  isLoggedIn() {
    return !!this._authUser;
  },
  initAuthListener(onChange) {
    this.whenFirebaseReady(() => {
      const { auth, onAuthStateChanged } = window.firestoreAPI;
      onAuthStateChanged(auth, (user) => {
        this._authUser = user;
        onChange && onChange(user);
      });
    });
  },
  async loginWithEmail(email, password) {
    await this.whenFirebaseReadyPromise();
    const { auth, signInWithEmailAndPassword } = window.firestoreAPI;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    this._authUser = cred.user;
    return cred.user;
  },
  async logout() {
    await this.whenFirebaseReadyPromise();
    const { auth, signOut } = window.firestoreAPI;
    await signOut(auth);
    this._authUser = null;
  },
  async changeAdminPassword(newPassword) {
    await this.whenFirebaseReadyPromise();
    const { auth, updatePassword } = window.firestoreAPI;
    if (!auth.currentUser) throw new Error("not-logged-in");
    await updatePassword(auth.currentUser, newPassword);
  },

  /* ============== السلة (localStorage فقط) ============== */
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

  /* ============== أدوات عامة ============== */
  fmt(n) {
    return new Intl.NumberFormat("ar-EG").format(n) + " ج.م";
  },
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
};
