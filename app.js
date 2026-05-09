import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentRole = "student";
let authMode = "login";

let listings = [];
let filteredListings = [];
let savedIds = new Set();

const AUTH_ROLES = {
  student: {
    chip: "User Portal",
    heading: "Find your<br>perfect<br><em>nest.</em>",
    sub: "Discover comfortable accommodations designed for modern living. Search smarter, move faster.",
    pills: ["Easy Search", "Budget Friendly", "Better Living", "Location Filter"],
    stats: [
      ["🔍", "SMART SEARCH"],
      ["📍", "TOP LOCATIONS"],
      ["🛏️", "STUDENT STAYS"]
    ],
    loginTitle: "Welcome Back",
    loginSub: "Sign in to your user account",
    registerTitle: "Create Account",
    registerSub: "Register as a user to get started",
    cta: "User Login",
    registerCta: "Create Account"
  },

  owner: {
    chip: "Owner Portal",
    heading: "List your<br>property<br><em>smarter.</em>",
    sub: "Manage PG listings, connect with students, and showcase your property with ease.",
    pills: ["Easy Listing", "Student Reach", "Property Control", "Quick Updates"],
    stats: [
      ["🏠", "Property Listings"],
      ["📈", "Better Visibility"],
      ["🎓", "Student Connect"]
    ],
    loginTitle: "Owner Login",
    loginSub: "Access your property dashboard",
    registerTitle: "Owner Sign Up",
    registerSub: "Register to list and manage properties",
    cta: "Owner Login",
    registerCta: "Register as Owner"
  },

  admin: {
    chip: "Admin Workspace",
    heading: "Manage<br>the platform<br><em>efficiently.</em>",
    sub: "Monitor listings, owners, and student activity from one dashboard.",
    pills: ["Platform Management", "Listings", "Analytics", "Moderation"],
    stats: [
      ["📊", "Dashboard"],
      ["🏠", "Property Records"],
      ["👥", "User Activity"]
    ],
    loginTitle: "Admin Dashboard",
    loginSub: "Sign in to continue",
    registerTitle: "Admin Registration",
    registerSub: "Create a demo admin account",
    cta: "Admin Login",
    registerCta: "Create Admin Account"
  }
};

const $ = id => document.getElementById(id);

function toast(msg) {
  const t = $("toast");
  if (!t) return;

  t.textContent = msg;
  t.classList.add("show");

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    t.classList.remove("show");
  }, 2200);
}

function showView(id) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });

  const view = $(id);
  if (view) view.classList.add("active");

  window.scrollTo(0, 0);
}

function initials(name) {
  return (name || "User")
    .split(/\s+/)
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function clearErr(id) {
  const el = $(id);
  if (el) el.textContent = "";
}

function validateEmail(email) {
  return email && email.includes("@");
}

/* AUTH UI */

function applyAuthRole(role) {
  currentRole = role;

  const d = AUTH_ROLES[role];

  document.querySelectorAll(".role-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.role === role);
  });

  const authView = $("authView");

  if (authView) {
    authView.classList.remove("user-mode", "owner-mode", "admin-mode");

    if (role === "student") authView.classList.add("user-mode");
    if (role === "owner") authView.classList.add("owner-mode");
    if (role === "admin") authView.classList.add("admin-mode");
  }

  if ($("authChipText")) $("authChipText").textContent = d.chip;
  if ($("authHeading")) $("authHeading").innerHTML = d.heading;
  if ($("authSub")) $("authSub").textContent = d.sub;

  if ($("authPills")) {
    $("authPills").innerHTML = d.pills.map(p => `<span>${p}</span>`).join("");
  }

  d.stats.forEach(([v, l], i) => {
    if ($("authS" + (i + 1))) $("authS" + (i + 1)).textContent = v;
    if ($("authS" + (i + 1) + "L")) $("authS" + (i + 1) + "L").textContent = l;
  });

  if ($("propertyField")) {
    $("propertyField").classList.toggle(
      "show",
      role === "owner" && authMode === "register"
    );
  }

  if (authMode === "login") {
    if ($("authTitle")) $("authTitle").textContent = d.loginTitle;
    if ($("authCaption")) $("authCaption").textContent = d.loginSub;
    if ($("loginBtn")) $("loginBtn").textContent = d.cta;
  } else {
    if ($("authTitle")) $("authTitle").textContent = d.registerTitle;
    if ($("authCaption")) $("authCaption").textContent = d.registerSub;
    if ($("registerBtn")) $("registerBtn").textContent = d.registerCta;
  }
}

function setAuthMode(mode) {
  authMode = mode;

  document.querySelectorAll(".mode-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  if ($("loginForm")) $("loginForm").classList.toggle("hidden", mode !== "login");
  if ($("registerForm")) $("registerForm").classList.toggle("hidden", mode !== "register");

  applyAuthRole(currentRole);
}

/* LOGIN */

async function login(e) {
  e.preventDefault();

  const email = $("loginEmail").value.trim();
  const pass = $("loginPass").value.trim();

  clearErr("loginEmailErr");
  clearErr("loginPassErr");

  let ok = true;

  if (!validateEmail(email)) {
    $("loginEmailErr").textContent = "Enter a valid email.";
    ok = false;
  }

  if (pass.length < 6) {
    $("loginPassErr").textContent = "Min. 6 characters.";
    ok = false;
  }

  if (!ok) {
    toast("Please fix the highlighted fields.");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const name = email.split("@")[0];

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userName", name);
    localStorage.setItem("userRole", currentRole);
    localStorage.setItem("firebaseUID", cred.user.uid);

    if (currentRole === "admin" && email === "gummaankita17@gmail.com") {
      localStorage.setItem("adminLevel", "super");
    } else if (currentRole === "admin") {
      localStorage.setItem("adminLevel", "limited");
    }

    toast(`Welcome back, ${name}!`);

    setTimeout(() => {
      routeToDashboard(currentRole);
    }, 500);

  } catch (err) {
    console.error(err);

    if (err.code === "auth/invalid-credential") {
      toast("Invalid email or password.");
    } else if (err.code === "auth/user-not-found") {
      toast("No account found.");
    } else if (err.code === "auth/wrong-password") {
      toast("Wrong password.");
    } else {
      toast(err.message);
    }
  }
}

/* REGISTER */

async function register(e) {
  e.preventDefault();

  const name = $("regName").value.trim();
  const phone = $("regPhone").value.trim();
  const email = $("regEmail").value.trim();
  const pass = $("regPass").value.trim();
  const confirm = $("regConfirm").value.trim();

  const terms = $("regTerms") ? $("regTerms").checked : true;

  const propertyName = $("regProperty")
    ? $("regProperty").value.trim()
    : "";

  [
    "regNameErr",
    "regPhoneErr",
    "regEmailErr",
    "regPassErr",
    "regConfirmErr",
    "regPropertyErr"
  ].forEach(clearErr);

  let ok = true;

  if (name.length < 2) {
    $("regNameErr").textContent = "Enter your full name.";
    ok = false;
  }

  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.length !== 10) {
    $("regPhoneErr").textContent = "Phone number must be exactly 10 digits.";
    ok = false;
  }

  if (!validateEmail(email)) {
    $("regEmailErr").textContent = "Enter valid email.";
    ok = false;
  }

  if (pass.length < 6) {
    $("regPassErr").textContent = "Min. 6 characters.";
    ok = false;
  }

  if (confirm !== pass) {
    $("regConfirmErr").textContent = "Passwords do not match.";
    ok = false;
  }

  if (currentRole === "owner" && !propertyName) {
    $("regPropertyErr").textContent = "Enter property name.";
    ok = false;
  }

  if (!terms) {
    toast("Please agree to Terms & Privacy.");
    ok = false;
  }

  if (!ok) return;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    if (currentRole === "admin") {
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: name,
        phone: phone,
        email: email,
        role: "admin",
        status: "Approved",
        createdAt: serverTimestamp()
      });

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", name);
      localStorage.setItem("userPhone", phone);
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("firebaseUID", cred.user.uid);

      if (email === "gummaankita17@gmail.com") {
        localStorage.setItem("adminLevel", "super");
      } else {
        localStorage.setItem("adminLevel", "limited");
      }

      toast("Admin account created.");

      setTimeout(() => {
        routeToDashboard("admin");
      }, 500);

      return;
    }

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name: name,
      phone: phone,
      email: email,
      role: currentRole,
      propertyName: currentRole === "owner" ? propertyName : "",
      createdAt: serverTimestamp()
    });

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userName", name);
    localStorage.setItem("userPhone", phone);
    localStorage.setItem("userRole", currentRole);
    localStorage.setItem("firebaseUID", cred.user.uid);

    toast(`${currentRole} registered successfully.`);

    setTimeout(() => {
      routeToDashboard(currentRole);
    }, 500);

  } catch (err) {
    console.error(err);

    if (err.code === "auth/email-already-in-use") {
      toast("Email already registered. Please login.");
    } else if (err.code === "auth/invalid-email") {
      toast("Invalid email address.");
    } else if (err.code === "auth/weak-password") {
      toast("Password is too weak.");
    } else {
      toast(err.message);
    }
  }
}

/* ROUTING */

function routeToDashboard(role) {
  if (role === "student") {
    loadUserProfile();
    loadListingsFromFirestore();
    showView("userDashboard");
  }

  if (role === "owner") {
    loadOwnerProfile();
    loadOwnerPGs();
    loadOwnerInquiries();
    showView("ownerDashboard");
  }

  if (role === "admin") {
    loadAdminProfile();
    loadAdminStats();
    loadAdminListings();
    loadAdminOwners();
    renderAdminRequests();
    showView("adminDashboard");
  }
}

async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }

  [
    "isLoggedIn",
    "userEmail",
    "userName",
    "userPhone",
    "userRole",
    "firebaseUID",
    "adminLevel"
  ].forEach(k => {
    localStorage.removeItem(k);
  });

  showView("authView");
  setAuthMode("login");
  toast("Logged out.");
}

/* USER DASHBOARD */

async function loadListingsFromFirestore() {
  listings = [];
  filteredListings = [];

  try {
    const snap = await getDocs(collection(db, "pgs"));

    snap.forEach(d => {
      const data = d.data();

      listings.push({
        id: d.id,
        ...data
      });
    });

  } catch (err) {
    console.error("Failed to load listings:", err);
    toast("Could not load listings. Check your connection.");
  }

  fillAreaFilter();
  filterListings();
}

function fillAreaFilter() {
  const sel = $("areaFilter");
  if (!sel) return;

  const areas = [...new Set(listings.map(l => l.area).filter(Boolean))].sort();

  sel.innerHTML =
    '<option value="All">All Areas</option>' +
    areas.map(a => `<option>${a}</option>`).join("");
}

function filterListings() {
  if (!$("listingGrid")) return;

  const text = ($("listingSearch").value || "").toLowerCase();
  const area = $("areaFilter").value;
  const type = $("typeFilter").value;
  const gender = $("genderFilter").value;
  const price = $("priceFilter").value;
  const amen = $("amenityFilter").value;

  filteredListings = listings.filter(l => {
    const amenities = l.amenities || [];

    const matchText =
      !text ||
      [l.name, l.area, l.ownerName, l.type, l.gender, ...amenities]
        .join(" ")
        .toLowerCase()
        .includes(text);

    const matchArea = area === "All" || l.area === area;
    const matchType = type === "All" || l.type === type;
    const matchGender = gender === "All" || l.gender === gender;
    const matchAmen = amen === "All" || amenities.includes(amen);

    let matchPrice = true;

    if (price === "budget") matchPrice = l.price < 6000;
    if (price === "mid") matchPrice = l.price >= 6000 && l.price <= 9000;
    if (price === "premium") matchPrice = l.price > 9000;

    return matchText && matchArea && matchType && matchGender && matchAmen && matchPrice;
  });

  renderListings();
}

function renderListings() {
  const grid = $("listingGrid");
  if (!grid) return;

  if (!filteredListings.length) {
    grid.innerHTML = `
      <div class="section-card" style="grid-column:1/-1;text-align:center;padding:40px;">
        <p style="font-size:18px;color:var(--muted)">🏠 No PG listings found yet.</p>
        <p style="margin-top:8px;font-size:13px;color:var(--muted)">
          Owners can register and add their PGs. They will appear here.
        </p>
      </div>
    `;
    return;
  }

  const fallbackImg = "./images/pg.jpg";

  grid.innerHTML = filteredListings.map((l, i) => `
    <article class="listing-card">
      <div class="listing-image">
        <img src="${l.image || fallbackImg}" alt="${l.name}" onerror="this.src='${fallbackImg}'">
        <button class="favorite-btn" onclick="favToggle(${i})">
          ${savedIds.has(l.id) ? "♥" : "♡"}
        </button>
      </div>

      <div class="listing-body">
        <div class="listing-name">${l.name}</div>

        <div class="listing-location">
          📍 ${l.area || "Bangalore"}, Bangalore • ${l.type || "PG"} • ${l.gender || "Co-ed"}
        </div>

        <div class="amenity-row">
          ${(l.amenities || []).map(a => `<span class="amenity-chip">${a}</span>`).join("")}
        </div>

        <div class="price-row">
          <div class="price">₹${Number(l.price).toLocaleString("en-IN")}</div>
          <div class="rating">★ ${l.rating || "New"}</div>
        </div>

        <div class="card-actions">
          <button class="secondary-btn" onclick="openModalFor(${i})">View Details</button>
          <button class="primary-btn" onclick="openVisitForm(${i})">Book Visit</button>
        </div>
      </div>
    </article>
  `).join("");
}

function resetSearch() {
  if ($("listingSearch")) $("listingSearch").value = "";

  ["areaFilter", "typeFilter", "genderFilter", "priceFilter", "amenityFilter"].forEach(id => {
    if ($(id)) $(id).value = "All";
  });

  filterListings();
}

function favToggle(i) {
  const l = filteredListings[i];
  if (!l) return;

  if (savedIds.has(l.id)) {
    savedIds.delete(l.id);
  } else {
    savedIds.add(l.id);
  }

  renderListings();
  renderSaved();

  toast(savedIds.has(l.id) ? "Added to saved listings." : "Removed from saved listings.");
}

function renderSaved() {
  const box = $("savedList");
  if (!box) return;

  const saved = listings.filter(l => savedIds.has(l.id));

  if (!saved.length) {
    box.className = "saved-list empty";
    box.textContent = "No saved listings yet.";
    return;
  }

  box.className = "saved-list";

  box.innerHTML = saved.map(l => `
    <div class="pick-item">
      <strong>${l.name}</strong>
      <span>${l.area} • ₹${Number(l.price).toLocaleString("en-IN")}/month</span>
    </div>
  `).join("");
}

function openModalFor(i) {
  const l = filteredListings[i];
  if (!l || !$("modalBody") || !$("modalBg")) return;

  const fallbackImg = "./images/pg.jpg";

  $("modalBody").innerHTML = `
    <h2 class="section-title">${l.name}</h2>

    <p class="section-sub">
      📍 ${l.area}, Bangalore • ${l.type} • ${l.gender} • ${l.sharing || "Shared"} sharing
    </p>

    <img src="${l.image || fallbackImg}"
         style="width:100%;max-height:320px;object-fit:cover;border-radius:18px;margin:16px 0"
         onerror="this.src='${fallbackImg}'">

    <h2 class="price">₹${Number(l.price).toLocaleString("en-IN")} /month</h2>

    <p class="section-sub">${l.desc || "A comfortable stay in Bangalore."}</p>

    <p>
      <strong>Owner:</strong> ${l.ownerName || "—"}<br>
      <strong>Phone:</strong> ${l.ownerPhone || "—"}
    </p>

    <div class="amenity-row">
      ${(l.amenities || []).map(a => `<span class="amenity-chip">${a}</span>`).join("")}
    </div>

    <div class="card-actions">
      <button class="secondary-btn" onclick="closeModal()">Close</button>
      <button class="primary-btn" onclick="openVisitForm(${i})">Book Visit</button>
    </div>
  `;

  $("modalBg").classList.add("open");
}

function openVisitForm(i) {
  const l = filteredListings[i];
  if (!l || !$("modalBody") || !$("modalBg")) return;

  const studentName = localStorage.getItem("userName") || "";
  const studentEmail = localStorage.getItem("userEmail") || "";
  const studentPhone = localStorage.getItem("userPhone") || "";

  $("modalBody").innerHTML = `
    <h2 class="section-title">Book Visit</h2>

    <p class="section-sub">
      You are booking a visit for <strong>${l.name}</strong>.
    </p>

    <form id="visitForm" onsubmit="submitVisitRequest(event, ${i})">
      <div class="field">
        <label>Your Name</label>
        <input id="visitStudentName" value="${studentName}" required>
      </div>

      <div class="field">
        <label>Email</label>
        <input id="visitStudentEmail" type="email" value="${studentEmail}" required>
      </div>

      <div class="field">
        <label>Phone Number</label>
        <input id="visitStudentPhone" type="tel" value="${studentPhone}" placeholder="Enter your phone number" required>
      </div>

      <div class="field">
        <label>Visit Date</label>
        <input id="visitDate" type="date" required>
      </div>

      <div class="field">
        <label>Message</label>
        <textarea id="visitMessage" rows="4" placeholder="I want to visit this PG..."></textarea>
      </div>

      <div class="card-actions">
        <button type="button" class="secondary-btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="primary-btn">Submit Request</button>
      </div>
    </form>
  `;

  $("modalBg").classList.add("open");
}

async function submitVisitRequest(e, i) {
  e.preventDefault();

  const l = filteredListings[i];
  if (!l) return;

  try {
    await addDoc(collection(db, "visitRequests"), {
      pgId: l.id,
      pgName: l.name,
      pgArea: l.area,
      pgRent: l.price,

      ownerUID: l.ownerUID,
      ownerName: l.ownerName,
      ownerPhone: l.ownerPhone || "",

      studentName: $("visitStudentName").value.trim(),
      studentEmail: $("visitStudentEmail").value.trim(),
      studentPhone: $("visitStudentPhone").value.trim(),
      visitDate: $("visitDate").value,
      message: $("visitMessage").value.trim(),

      status: "Pending",
      createdAt: serverTimestamp()
    });

    toast("Visit request submitted successfully.");
    closeModal();

  } catch (err) {
    console.error(err);
    toast("Error submitting visit request.");
  }
}

function closeModal(e) {
  if (e && e.target.id !== "modalBg") return;
  if ($("modalBg")) $("modalBg").classList.remove("open");
}

function openSidebar() {
  if ($("profileSidebar")) $("profileSidebar").classList.add("open");
  if ($("sidebarOverlay")) $("sidebarOverlay").classList.add("open");

  renderSaved();
}

function closeSidebar() {
  if ($("profileSidebar")) $("profileSidebar").classList.remove("open");
  if ($("sidebarOverlay")) $("sidebarOverlay").classList.remove("open");
}

function loadUserProfile() {
  const name = localStorage.getItem("userName") || "Student";
  const email = localStorage.getItem("userEmail") || "student@example.com";
  const ini = initials(name);

  if ($("topUserName")) $("topUserName").textContent = name;
  if ($("topUserAvatar")) $("topUserAvatar").textContent = ini;
  if ($("sidebarName")) $("sidebarName").textContent = name;
  if ($("sidebarEmail")) $("sidebarEmail").textContent = email;
  if ($("sidebarAvatar")) $("sidebarAvatar").textContent = ini;
}

/* OWNER DASHBOARD */

const ownerTitles = {
  ownerHome: ["PG Owner Dashboard", "Manage your listings, students, and property performance."],
  ownerPGs: ["My PG Listings", "View and manage all your listed properties."],
  ownerAdd: ["Add New PG", "Create a new property listing for students."],
  ownerStudents: ["Interested Students", "See students who contacted you about your properties."]
};

function showOwnerPage(id, el) {
  document.querySelectorAll(".owner-page").forEach(p => {
    p.classList.remove("active");
  });

  if ($(id)) $(id).classList.add("active");

  document.querySelectorAll(".owner-sidebar .dash-nav").forEach(n => {
    n.classList.remove("active");
  });

  if (el) el.classList.add("active");

  if ($("ownerPageTitle")) $("ownerPageTitle").textContent = ownerTitles[id][0];
  if ($("ownerPageSub")) $("ownerPageSub").textContent = ownerTitles[id][1];

  if (id === "ownerStudents") {
    loadOwnerInquiries();
  }
}

function loadOwnerProfile() {
  const name = localStorage.getItem("userName") || "Owner";
  const email = localStorage.getItem("userEmail") || "owner@example.com";

  if ($("ownerName")) $("ownerName").textContent = name;
  if ($("ownerEmail")) $("ownerEmail").textContent = email;
}

async function loadOwnerPGs() {
  const uid = localStorage.getItem("firebaseUID");
  const grid = $("ownerCardGrid");
  const stat = $("ownerPgCount");

  let ownerPGs = [];

  try {
    const q = query(collection(db, "pgs"), where("ownerUID", "==", uid));
    const snap = await getDocs(q);

    snap.forEach(d => {
      ownerPGs.push({
        id: d.id,
        ...d.data()
      });
    });

  } catch (err) {
    console.error("Failed to load owner PGs:", err);
  }

  if (stat) stat.textContent = ownerPGs.length;

  if (!grid) return;

  if (!ownerPGs.length) {
    grid.innerHTML = `
      <p style="color:#5d7768;grid-column:1/-1">
        You haven't added any PGs yet. Click <strong>Add PG</strong> to get started.
      </p>
    `;
    return;
  }

  grid.innerHTML = ownerPGs.map(l => `
    <div class="owner-card">
      <strong>${l.name}</strong>
      <span>
        ${l.area} • ₹${Number(l.price).toLocaleString("en-IN")}/mo • ${l.type}
      </span>

      <div style="margin-top:10px;display:flex;gap:8px;">
        <button class="secondary-btn" style="font-size:12px;padding:7px 12px"
          onclick="deletePG('${l.id}')">
          🗑 Remove
        </button>
      </div>
    </div>
  `).join("");
}

async function saveNewPG() {
  const uid = localStorage.getItem("firebaseUID");
  const ownerName = localStorage.getItem("userName") || "Owner";
  const ownerPhone = localStorage.getItem("userPhone") || "";

  const name = $("newPgName") ? $("newPgName").value.trim() : "";
  const area = $("newPgArea") ? $("newPgArea").value.trim() : "";
  const priceRaw = $("newPgPrice") ? $("newPgPrice").value.trim() : "";
  const type = $("newPgType") ? $("newPgType").value : "PG";
  const gender = $("newPgGender") ? $("newPgGender").value : "Co-ed";
  const sharing = $("newPgSharing") ? $("newPgSharing").value : "Double";
  const desc = $("newPgDesc") ? $("newPgDesc").value.trim() : "";
  const amenStr = $("newPgAmenities") ? $("newPgAmenities").value.trim() : "";
  const image = $("newPgImage") ? $("newPgImage").value.trim() : "";

  if (!name || !area || !priceRaw) {
    toast("Please fill in PG name, area, and rent.");
    return;
  }

  const price = parseInt(priceRaw.replace(/[^\d]/g, ""), 10);

  if (!price || price < 500) {
    toast("Enter a valid monthly rent.");
    return;
  }

  const amenities = amenStr
    ? amenStr.split(",").map(a => a.trim()).filter(Boolean)
    : [];

  try {
    await addDoc(collection(db, "pgs"), {
      ownerUID: uid,
      ownerName: ownerName,
      ownerPhone: ownerPhone,
      name: name,
      area: area,
      price: price,
      type: type,
      gender: gender,
      sharing: sharing,
      desc: desc,
      amenities: amenities,
      image: image,
      rating: null,
      createdAt: serverTimestamp()
    });

    toast("PG added successfully. Students can now see it.");

    ["newPgName", "newPgArea", "newPgPrice", "newPgDesc", "newPgAmenities", "newPgImage"].forEach(id => {
      if ($(id)) $(id).value = "";
    });

    await loadOwnerPGs();
    await loadAdminStats();
    await loadAdminListings();
    await loadAdminOwners();

    showOwnerPage(
      "ownerPGs",
      document.querySelectorAll(".owner-sidebar .dash-nav")[1]
    );

  } catch (err) {
    console.error("Failed to save PG:", err);
    toast("Error saving PG. Please try again.");
  }
}

async function deletePG(pgId) {
  const uid = localStorage.getItem("firebaseUID");

  try {
    const pgRef = doc(db, "pgs", pgId);
    const pgSnap = await getDoc(pgRef);

    if (!pgSnap.exists() || pgSnap.data().ownerUID !== uid) {
      toast("You don't have permission to delete this PG.");
      return;
    }

    await deleteDoc(pgRef);

    toast("PG removed.");

    await loadOwnerPGs();
    await loadAdminStats();
    await loadAdminListings();
    await loadOwnerInquiries();

  } catch (err) {
    console.error("Delete failed:", err);
    toast("Error deleting PG.");
  }
}

async function loadOwnerInquiries() {
  const uid = localStorage.getItem("firebaseUID");
  const section = $("ownerStudents");

  if (!section) return;

  let requests = [];

  try {
    const q = query(collection(db, "visitRequests"), where("ownerUID", "==", uid));
    const snap = await getDocs(q);

    snap.forEach(d => {
      requests.push({
        id: d.id,
        ...d.data()
      });
    });

  } catch (err) {
    console.error("Failed to load visit requests:", err);
  }

  const card = section.querySelector(".section-card");
  if (!card) return;

  if (!requests.length) {
    card.innerHTML = `
      <h2 class="section-title">Interested Students</h2>
      <table>
        <tr>
          <th>Name</th>
          <th>PG</th>
          <th>Phone</th>
          <th>Visit Date</th>
          <th>Status</th>
        </tr>
        <tr>
          <td colspan="5" style="color:#5d7768;text-align:center">
            No student inquiries yet.
          </td>
        </tr>
      </table>
    `;
    return;
  }

  card.innerHTML = `
    <h2 class="section-title">Interested Students</h2>
    <table>
      <tr>
        <th>Name</th>
        <th>PG</th>
        <th>Phone</th>
        <th>Visit Date</th>
        <th>Status</th>
      </tr>

      ${requests.map(r => `
        <tr>
          <td>${r.studentName || "—"}</td>
          <td>${r.pgName || "—"}</td>
          <td>${r.studentPhone || "—"}</td>
          <td>${r.visitDate || "—"}</td>
          <td>${r.status || "Pending"}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

/* ADMIN DASHBOARD */

function loadAdminProfile() {
  const name = localStorage.getItem("userName") || "Admin";
  const email = localStorage.getItem("userEmail") || "admin@example.com";

  if ($("adminName")) $("adminName").textContent = name;
  if ($("adminEmail")) $("adminEmail").textContent = email;
  if ($("adminAvatar")) $("adminAvatar").textContent = initials(name);
}

async function loadAdminStats() {
  let allPGs = [];
  let owners = new Set();
  let users = 0;

  try {
    const pgSnap = await getDocs(collection(db, "pgs"));

    pgSnap.forEach(d => {
      const data = d.data();
      allPGs.push(data);

      if (data.ownerUID) {
        owners.add(data.ownerUID);
      }
    });

  } catch (err) {
    console.error("PG stats error:", err);
  }

  try {
    const userSnap = await getDocs(collection(db, "users"));

    userSnap.forEach(() => {
      users++;
    });

  } catch (err) {
    console.error("User stats error:", err);
  }

  const count = allPGs.length;

  const avgRent = count
    ? Math.round(
        allPGs.reduce((sum, pg) => {
          return sum + (Number(pg.price) || 0);
        }, 0) / count
      )
    : 0;

  if ($("statListings")) $("statListings").textContent = count;
  if ($("statOwners")) $("statOwners").textContent = owners.size;
  if ($("statUsers")) $("statUsers").textContent = users;

  if ($("statAvgRent")) {
    $("statAvgRent").textContent = count
      ? `₹${avgRent.toLocaleString("en-IN")}`
      : "—";
  }
}

async function loadAdminOwners() {
  const box = $("adminOwnerList");
  if (!box) return;

  let owners = [];

  try {
    const q = query(collection(db, "users"), where("role", "==", "owner"));
    const snap = await getDocs(q);

    snap.forEach(d => {
      owners.push({
        id: d.id,
        ...d.data()
      });
    });

  } catch (err) {
    console.error("Admin owners load error:", err);
    box.innerHTML = '<div class="admin-list-item">Failed to load owners.</div>';
    return;
  }

  if (!owners.length) {
    box.innerHTML = '<div class="admin-list-item">No owners registered yet.</div>';
    return;
  }

  box.innerHTML = owners.map(o => `
    <div class="admin-list-item">
      <strong>${o.name || "—"}</strong><br>
      <span>
        ${o.email} • ${o.phone || "—"} • Property: ${o.propertyName || "—"}
      </span>
    </div>
  `).join("");
}

async function loadAdminListings() {
  const out = $("adminListingOutput");
  if (!out) return;

  let allPGs = [];

  try {
    const snap = await getDocs(collection(db, "pgs"));

    snap.forEach(d => {
      allPGs.push({
        id: d.id,
        ...d.data()
      });
    });

  } catch (err) {
    console.error("Admin listings load error:", err);
    out.innerHTML = '<div class="admin-list-item">Failed to load listings.</div>';
    return;
  }

  if (!allPGs.length) {
    out.innerHTML = '<div class="admin-list-item">No PGs registered yet.</div>';
    return;
  }

  out.innerHTML = allPGs.map(l => `
    <div class="admin-list-item">
      <strong>${l.name}</strong><br>

      <span>
        ${l.area} • ${l.type} • ₹${Number(l.price).toLocaleString("en-IN")}/mo
        • Owner: ${l.ownerName || "—"}
      </span>

      <div style="margin-top:8px">
        <button class="admin-primary" style="padding:6px 12px;font-size:12px"
          onclick="adminDeletePG('${l.id}')">
          🗑 Remove
        </button>
      </div>
    </div>
  `).join("");
}

async function adminDeletePG(pgId) {
  try {
    await deleteDoc(doc(db, "pgs", pgId));

    toast("PG removed by admin.");

    await loadAdminListings();
    await loadAdminStats();

  } catch (err) {
    console.error(err);
    toast("Error removing PG.");
  }
}

function scrollAdmin(id, el) {
  if ($(id)) {
    $(id).scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  document.querySelectorAll(".admin-nav").forEach(n => {
    n.classList.remove("active");
  });

  if (el) el.classList.add("active");
}

function renderAdminRequests() {
  const box = $("adminRequestsBox");
  if (!box) return;

  const requests = JSON.parse(localStorage.getItem("adminRequests") || "[]");

  if (!requests.length) {
    box.innerHTML = '<div class="admin-list-item">No pending admin requests.</div>';
    return;
  }

  box.innerHTML = requests.map((a, i) => `
    <div class="admin-list-item">
      <strong>${a.name}</strong><br>
      <span>${a.email} • ${a.status}</span><br>
      <button class="admin-primary" style="margin-top:8px;padding:8px 12px"
        onclick="approveAdmin(${i})">
        Approve
      </button>
    </div>
  `).join("");
}

function approveAdmin(i) {
  const requests = JSON.parse(localStorage.getItem("adminRequests") || "[]");
  const approved = JSON.parse(localStorage.getItem("approvedAdmins") || "[]");

  const admin = requests.splice(i, 1)[0];

  if (admin) approved.push(admin);

  localStorage.setItem("adminRequests", JSON.stringify(requests));
  localStorage.setItem("approvedAdmins", JSON.stringify(approved));

  renderAdminRequests();
  toast("Admin approved.");
}

/* INIT */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".role-tab").forEach(t => {
    t.addEventListener("click", () => applyAuthRole(t.dataset.role));
  });

  document.querySelectorAll(".mode-tab").forEach(t => {
    t.addEventListener("click", () => setAuthMode(t.dataset.mode));
  });

  document.querySelectorAll(".eye").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.eye);
      if (!input) return;

      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "👁" : "🙈";
    });
  });

  if ($("loginForm")) $("loginForm").addEventListener("submit", login);
  if ($("registerForm")) $("registerForm").addEventListener("submit", register);

  [
    "listingSearch",
    "areaFilter",
    "typeFilter",
    "genderFilter",
    "priceFilter",
    "amenityFilter"
  ].forEach(id => {
    const el = $(id);

    if (el) {
      el.addEventListener(id === "listingSearch" ? "input" : "change", filterListings);
    }
  });

  applyAuthRole("student");
  setAuthMode("login");

  if (localStorage.getItem("isLoggedIn") === "true") {
    routeToDashboard(localStorage.getItem("userRole") || "student");
  }

  window.openModalFor = openModalFor;
  window.openVisitForm = openVisitForm;
  window.submitVisitRequest = submitVisitRequest;
  window.closeModal = closeModal;
  window.favToggle = favToggle;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.showOwnerPage = showOwnerPage;
  window.scrollAdmin = scrollAdmin;
  window.renderAdminRequests = renderAdminRequests;
  window.approveAdmin = approveAdmin;
  window.logout = logout;
  window.resetSearch = resetSearch;
  window.toast = toast;
  window.saveNewPG = saveNewPG;
  window.deletePG = deletePG;
  window.adminDeletePG = adminDeletePG;
  window.loadAdminOwners = loadAdminOwners;
});

window.addEventListener("load", () => {
  const loader = document.getElementById("pageLoader");

  if (!loader) return;

  setTimeout(() => {
    loader.classList.add("hide");
  }, 1800);
});