import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs,
  deleteDoc, updateDoc, query, onSnapshot, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

import { 
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";



const firebaseConfig = {
    apiKey: "AIzaSyADvpUQWo75ExePGoCRirD2mM-lmfM4Cmc",
    authDomain: "von600-7982d.firebaseapp.com",
    projectId: "von600-7982d",
    storageBucket: "von600-7982d.appspot.com",
    messagingSenderId: "164591218045",
    appId: "1:164591218045:web:afe17512e16573e7903014",
    measurementId: "G-E69DMPLXBK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const adminEmails = ["admin@gmail.com"];
let latestVendorMap = {};
let latestVendorNames = {};


setPersistence(auth, browserLocalPersistence).catch(error => console.error("Persistence error:", error));

// DOM Elements
const passwordToggle = document.getElementById('password-toggle');
const passwordInput = document.getElementById('password');
const loadingScreen = document.getElementById("loading-screen");
const loginSection = document.getElementById("login-section");
const mainContent = document.getElementById("main-content");
const notification = document.getElementById("notification");
const loginNotification = document.getElementById("login-notification");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginSpinner = document.getElementById("login-spinner");
const dashboardGrid = document.getElementById("dashboard-grid");
const restaurantList = document.getElementById("restaurant-list");
const menuItemList = document.getElementById("menu-item-list");
const vendorMappingList = document.getElementById("vendor-mapping-list");
const ordersList = document.getElementById("orders-list");
const usersList = document.getElementById("users-list");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const overlay = document.getElementById("overlay");
const deliveryPersonnelForm = document.getElementById("delivery-personnel-form");
const exportToggle = document.getElementById("export-toggle");
const exportMenu = document.getElementById("export-menu");

exportToggle.addEventListener("click", () => {
    exportMenu.classList.toggle("hidden");
});

// Close dropdown if clicking outside
document.addEventListener("click", (e) => {
    if (!exportToggle.contains(e.target) && !exportMenu.contains(e.target)) {
        exportMenu.classList.add("hidden");
    }
});


// Password Toggle
if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
}

// Timeout to force hide loading screen after 5 seconds
let timeoutTriggered = false;
const loadingTimeout = setTimeout(() => {
    if (loadingScreen && loadingScreen.style.display !== "none") {
        console.warn("Loading screen timeout: Forcing login section display");
        loadingScreen.style.display = "none";
        loginSection.style.display = "flex";
        mainContent.classList.add("hidden");
        showLoginNotification("Loading took too long. Please try logging in.", "error");
        timeoutTriggered = true;
    }
}, 5000);

// Sidebar Functions
function toggleSidebar() {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("active");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
}

sidebarToggle.addEventListener("click", toggleSidebar);
overlay.addEventListener("click", closeSidebar);

// Notification Functions
function formatErrorMessage(errorMsg) {
    if (errorMsg.includes('auth/invalid-email')) {
        return 'Please enter a valid email address.';
    } else if (errorMsg.includes('auth/user-not-found')) {
        return 'No account found with this email. Please check and try again.';
    } else if (errorMsg.includes('auth/wrong-password')) {
        return 'Incorrect password. Please try again.';
    } else if (errorMsg.includes('auth/too-many-requests')) {
        return 'Too many login attempts. Please try again later.';
    } else if (errorMsg.includes('auth/network-request-failed')) {
        return 'Network error. Please check your connection and try again.';
    } else if (errorMsg.includes('auth/email-already-in-use')) {
        return 'This email is already registered.';
    } else if (errorMsg.includes('auth/weak-password')) {
        return 'Password is too weak. Please use a stronger password.';
    } else if (errorMsg.includes('auth/operation-not-allowed')) {
        return 'This operation is not allowed. Please contact support.';
    } else if (errorMsg.includes('permission-denied') || errorMsg.includes('insufficient permissions')) {
        return 'Permission denied. Please ensure you have admin access or contact support.';
    } else if (errorMsg.includes('auth/')) {
        return 'Wrong email or password. Please try again.';
    } else {
        return errorMsg;
    }
}

function showNotification(message, type = "success", target = notification) {
    let displayMessage = type === "error" ? formatErrorMessage(message) : message;
    target.innerHTML = `<i class="fas fa-${type === "error" ? "exclamation-circle" : "check-circle"} notification-icon"></i><span>${displayMessage}</span>`;
    target.className = `notification ${type === "error" ? "error" : ""} show`;
    setTimeout(() => target.classList.remove("show"), 5000);
}

function showLoginNotification(message, type = "success") {
    showNotification(message, type, loginNotification);
}

// Section Toggle
function toggleSection(sectionId) {
const sections = ["dashboard", "restaurants", "vendor-mappings", "orders", "users", "delivery", "settings", "earnings", "edit-restaurant", "edit-menu", "app", "fees", "discounts"];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.toggle("hidden", id !== sectionId);
        }
        const btn = document.getElementById(`${id}-btn`);
        if (btn) {
            btn.classList.toggle("active", id === sectionId);
        }
    });
    closeSidebar();
}

const loadDiscounts = async () => {
  const container = document.getElementById("discount-list");
  container.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "discountCodes"));
  container.innerHTML = "";

  snapshot.forEach(doc => {
    const data = doc.data();
    const id = doc.id;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h4>${data.code}</h4>
<p>
  ${data.type === "percent" ? data.value + "% off" : "GH₵" + data.value + " off"} 
  ${data.appliesTo === "delivery" ? "Delivery fee" : "Subtotal"}
</p>
      <p>Status: ${data.active ? "✅ Active" : "❌ Inactive"}</p>
      <p>Uses: ${data.uses ?? 0} / ${data.maxUses ?? "∞"}</p>
      ${data.expiresAt ? `<p>Expires: ${new Date(data.expiresAt).toLocaleString()}</p>` : ""}
      <div class="item-actions">
        <button class="btn btn-secondary edit-code">Edit</button>
        <button class="btn btn-tertiary toggle-code">${data.active ? "Deactivate" : "Activate"}</button>
        <button class="btn btn-primary delete-code">Delete</button>
      </div>
    `;

    // DELETE
    div.querySelector(".delete-code").addEventListener("click", async () => {
      if (confirm(`Delete discount code ${data.code}?`)) {
        await deleteDoc(doc.ref);
        showNotification("Discount code deleted");
        loadDiscounts();
      }
    });

    // TOGGLE ACTIVE
    div.querySelector(".toggle-code").addEventListener("click", async () => {
      await updateDoc(doc.ref, { active: !data.active });
      showNotification(`Code ${data.code} is now ${!data.active ? "inactive" : "active"}`);
      loadDiscounts();
    });

    // EDIT
    div.querySelector(".edit-code").addEventListener("click", () => {
      document.getElementById("discount-code").value = data.code;
      document.getElementById("discount-type").value = data.type;
      document.getElementById("discount-value").value = data.value;
      document.getElementById("discount-max-uses").value = data.maxUses ?? "";
      document.getElementById("discount-expiry").value = data.expiresAt ? new Date(data.expiresAt).toISOString().slice(0, 16) : "";
      document.getElementById("discount-active").checked = data.active;
    });

    container.appendChild(div);
  });
};


async function loadTrendingToggles() {
  const container = document.getElementById("trending-toggle-list");
  container.innerHTML = "Loading...";
  const snapshot = await getDocs(collection(db, "restaurant"));

  container.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;

    const div = document.createElement("div");
    div.className = "user-item";
    div.innerHTML = `
      <div class="user-details">
        <h4>${data.name || "Unnamed"}</h4>
        <p>ID: ${id}</p>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" ${data.isTrending ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    `;

    const checkbox = div.querySelector("input");
    checkbox.addEventListener("change", async () => {
      await updateDoc(doc(db, "restaurant", id), {
        isTrending: checkbox.checked
      });
      showNotification(`${data.name} is now ${checkbox.checked ? "trending" : "not trending"}`);
      loadTrendingList(); // reload the list
    });

    container.appendChild(div);
  });
}

// Restaurant Functions
async function loadRestaurantsForDropdown() {
    try {
        const vendorSnapshot = await getDocs(collection(db, "vendorMappings"));
        const mappedRestaurantIds = vendorSnapshot.docs.map(doc => doc.data().restaurantId);
        
        const restaurantSnapshot = await getDocs(collection(db, "restaurant"));
        const dropdown = document.getElementById("vendor-restaurant");
        dropdown.innerHTML = '<option value="" disabled selected>Select Restaurant</option>';
        
        restaurantSnapshot.forEach(doc => {
            if (!mappedRestaurantIds.includes(doc.id)) {
                const option = document.createElement("option");
                option.value = doc.id;
                option.textContent = doc.data().name || "Unnamed";
                dropdown.appendChild(option);
            }
        });
        
        if (dropdown.options.length === 1) {
            dropdown.innerHTML += '<option value="" disabled>No unmapped restaurants</option>';
        }
    } catch (error) {
        console.error("Error loading restaurants for dropdown:", error);
        showNotification("Failed to load restaurants for mapping", "error");
    }
}

function loadEarnings() {
    const totalRevenueEl = document.getElementById("total-revenue");
    const pendingPayoutsEl = document.getElementById("pending-payouts");
    const vendorEarningsList = document.getElementById("vendor-earnings-list");
    const filter = document.getElementById("earnings-filter").value;

    const now = new Date();
    let startDate = new Date(0); // default: all time

    if (filter === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let totalRevenue = 0;
let pendingPayouts = 0;
let vendorMap = {};

onSnapshot(collection(db, "orders"), (snapshot) => {
    totalRevenue = 0;
    pendingPayouts = 0;
    vendorMap = {}; // now allowed since it's declared as let

        snapshot.forEach(doc => {
            const order = doc.data();
            if (!order.timestamp || !order.totalAmount || !order.restaurantId) return;

            const orderDate = new Date(order.timestamp);
            if (orderDate < startDate) return;

            const amount = Number(order.totalAmount);
            totalRevenue += amount;

            if (!order.status || order.status.toLowerCase() !== "completed") {
                pendingPayouts += amount;
            }

            if (!vendorMap[order.restaurantId]) {
                vendorMap[order.restaurantId] = { total: 0, pending: 0, count: 0 };
            }
            vendorMap[order.restaurantId].total += amount;
            vendorMap[order.restaurantId].count += 1;
            if (!order.status || order.status.toLowerCase() !== "completed") {
                vendorMap[order.restaurantId].pending += amount;
            }
        });

        totalRevenueEl.textContent = `GH₵${totalRevenue.toFixed(2)}`;
        pendingPayoutsEl.textContent = `GH₵${pendingPayouts.toFixed(2)}`;

        renderVendorBreakdown(vendorMap);

        let deliveryMap = {};

snapshot.forEach(doc => {
    const order = doc.data();
    if (!order.timestamp || !order.deliveryPersonId || !order.status) return;

    const orderDate = new Date(order.timestamp);
    if (orderDate < startDate) return;

    const status = order.status.toLowerCase();
    if (status !== "delivered" && status !== "completed") return;

    const deliveryId = order.deliveryPersonId;

    if (!deliveryMap[deliveryId]) {
        deliveryMap[deliveryId] = { total: 0, pending: 0, count: 0 };
    }

    deliveryMap[deliveryId].count += 1;
    deliveryMap[deliveryId].total += 5; // GH₵5 per delivery

    if (status !== "completed") {
        deliveryMap[deliveryId].pending += 5;
    }
});

renderDeliveryBreakdown(deliveryMap);


    });
}

async function renderDeliveryBreakdown(deliveryMap) {
    const deliveryList = document.getElementById("delivery-earnings-list");
    deliveryList.innerHTML = "<p>Loading...</p>";

    const userSnapshot = await getDocs(collection(db, "users"));
    const nameMap = {};
    userSnapshot.forEach(doc => {
        const data = doc.data();
        nameMap[doc.id] = data.name || data.email || doc.id;
    });

    const html = Object.entries(deliveryMap).map(([id, data]) => `
        <div class="item">
            <h4>${nameMap[id] || id}</h4>
            <p><b>Deliveries:</b> ${data.count}</p>
            <p><b>Earnings:</b> GH₵${data.total.toFixed(2)}</p>
            <p><b>Pending:</b> GH₵${data.pending.toFixed(2)}</p>
        </div>
    `).join("");

    deliveryList.innerHTML = html || "<p>No delivery data available.</p>";
}





async function renderVendorBreakdown(vendorMap) {
    const vendorList = document.getElementById("vendor-earnings-list");
    vendorList.innerHTML = "<p>Loading...</p>";

    const snapshot = await getDocs(collection(db, "restaurant"));
    const nameMap = {};
    snapshot.forEach(doc => nameMap[doc.id] = doc.data().name || "Unnamed");

    // 🔥 Save globally for CSV export
    latestVendorMap = vendorMap;
    latestVendorNames = nameMap;

    const fragments = Object.entries(vendorMap).map(([vendorId, data]) => {
        return `
            <div class="item">
                <h4>${nameMap[vendorId] || vendorId}</h4>
                <p><b>Orders:</b> ${data.count}</p>
                <p><b>Revenue:</b> GH₵${data.total.toFixed(2)}</p>
                <p><b>Pending:</b> GH₵${data.pending.toFixed(2)}</p>
            </div>
        `;
    });

    async function renderDeliveryBreakdown(deliveryMap) {
    const deliveryList = document.getElementById("delivery-earnings-list");
    deliveryList.innerHTML = "<p>Loading...</p>";

    // You’ll need a way to map delivery personnel ID to names if available
    const userSnapshot = await getDocs(collection(db, "users"));
    const nameMap = {};
    userSnapshot.forEach(doc => nameMap[doc.id] = doc.data().name || doc.data().email || "Unnamed");

    const fragments = Object.entries(deliveryMap).map(([personnelId, data]) => {
        return `
            <div class="item">
                <h4>${nameMap[personnelId] || personnelId}</h4>
                <p><b>Orders:</b> ${data.count}</p>
                <p><b>Revenue:</b> GH₵${data.total.toFixed(2)}</p>
                <p><b>Pending:</b> GH₵${data.pending.toFixed(2)}</p>
            </div>
        `;
    });

    deliveryList.innerHTML = fragments.length ? fragments.join("") : "<p>No data available.</p>";
}


    document.getElementById("export-pdf-btn").addEventListener("click", () => {
    const earningsEl = document.getElementById("earnings");

    const opt = {
        margin: 0.5,
        filename: `vendor_earnings_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(earningsEl).set(opt).save();
});

document.getElementById("export-excel-btn").addEventListener("click", () => {
    if (Object.keys(latestVendorMap).length === 0) {
        showNotification("No data to export.", "error");
        return;
    }

    const ws_data = [["Vendor Name", "Vendor ID", "Orders", "Revenue", "Pending"]];
    Object.entries(latestVendorMap).forEach(([vendorId, data]) => {
        ws_data.push([
            latestVendorNames[vendorId] || vendorId,
            vendorId,
            data.count,
            data.total.toFixed(2),
            data.pending.toFixed(2)
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Earnings");

    XLSX.writeFile(workbook, `vendor_earnings_${new Date().toISOString().split("T")[0]}.xlsx`);
});


    document.getElementById("export-csv-btn").addEventListener("click", () => {
    if (Object.keys(latestVendorMap).length === 0) {
        showNotification("No data available to export.", "error");
        return;
    }
    exportVendorEarningsCSV(latestVendorMap, latestVendorNames);
});


    vendorList.innerHTML = fragments.length ? fragments.join("") : "<p>No data available.</p>";
}

function exportVendorEarningsCSV(vendorMap, nameMap) {
    const headers = ["Vendor Name", "Vendor ID", "Orders", "Revenue (GH₵)", "Pending (GH₵)"];
    const rows = [headers];

    Object.entries(vendorMap).forEach(([vendorId, data]) => {
        const row = [
            nameMap[vendorId] || vendorId,
            vendorId,
            data.count,
            data.total.toFixed(2),
            data.pending.toFixed(2)
        ];
        rows.push(row);
    });

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `vendor_earnings_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


async function loadRestaurants() {
    try {
        const querySnapshot = await getDocs(collection(db, "restaurant"));
        const fragment = document.createDocumentFragment();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement("div");
            item.className = "item";
            item.innerHTML = `
                <h4>${data.name || "Unnamed"}</h4>
                <p>ID: ${doc.id}</p>
                <p>Image: ${data.image || "None"}</p>
                <p>Delivery Time: ${data.delivery_time || "Not set"} minutes</p>
                <p>Status: ${data.isOpen ? "Open" : "Closed"}</p>
                <div class="item-actions">
                    <button class="btn btn-secondary edit-restaurant" data-id="${doc.id}">Edit</button>
                    <button class="btn btn-secondary delete-restaurant" data-id="${doc.id}">Delete</button>
                </div>
            `;
            item.querySelector(".edit-restaurant").addEventListener("click", () => editRestaurant(doc.id));
            item.querySelector(".delete-restaurant").addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete restaurant ID: ${doc.id}?`)) deleteRestaurant(doc.id);
            });
            fragment.appendChild(item);
        });
        restaurantList.innerHTML = "";
        restaurantList.appendChild(fragment);
        if (!querySnapshot.size) restaurantList.innerHTML = "<p class='text-gray-400'>No restaurants found.</p>";
    } catch (error) {
        console.error("Error loading restaurants:", error);
        showNotification("Failed to load restaurants", "error");
    }
}

async function editRestaurant(id) {
    try {
        const restaurantDoc = await getDoc(doc(db, "restaurant", id));
        if (restaurantDoc.exists()) {
            const data = restaurantDoc.data();
            document.getElementById("edit-restaurant-id").value = id;
            document.getElementById("edit-restaurant-name").value = data.name || "";
            document.getElementById("edit-restaurant-image").value = data.image || "";
            document.getElementById("edit-delivery-time").value = data.delivery_time || "";
            const statusCheckbox = document.getElementById("edit-restaurant-status");
            statusCheckbox.checked = data.isOpen;
            document.getElementById("status-text").textContent = data.isOpen ? "Open" : "Closed";
            toggleSection("edit-restaurant");
        }
    } catch (error) {
        console.error("Error loading restaurant for edit:", error);
        showNotification("Failed to load restaurant details", "error");
    }
}

document.getElementById("edit-restaurant-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const id = document.getElementById("edit-restaurant-id").value;
        const name = document.getElementById("edit-restaurant-name").value;
        const image = document.getElementById("edit-restaurant-image").value;
        const delivery_time = document.getElementById("edit-delivery-time").value;
        const isOpen = document.getElementById("edit-restaurant-status").checked;

        if (!name.trim()) {
            showNotification("Please enter a restaurant name.", "error");
            return;
        }

        if (delivery_time && (isNaN(delivery_time) || delivery_time < 0)) {
            showNotification("Please enter a valid delivery time.", "error");
            return;
        }

        await updateDoc(doc(db, "restaurant", id), {
            name,
            image,
            delivery_time: delivery_time ? Number(delivery_time) : null,
            isOpen,
            timestamp: Date.now()
        });

        showNotification(`Restaurant "${name}" updated successfully!`);
        toggleSection("restaurants");
        loadRestaurants();
    } catch (error) {
        console.error("Error updating restaurant:", error);
        showNotification("Unable to update restaurant. Please try again.", "error");
    }
});

document.getElementById("edit-menu-btn").addEventListener("click", () => {
    const restaurantId = document.getElementById("edit-restaurant-id").value;
    document.getElementById("current-restaurant-id").value = restaurantId;
    loadMenuItems(restaurantId);
    toggleSection("edit-menu");
});

document.getElementById("back-to-edit-restaurant").addEventListener("click", () => {
    const restaurantId = document.getElementById("current-restaurant-id").value;
    editRestaurant(restaurantId);
});

document.getElementById("cancel-edit").addEventListener("click", () => {
    toggleSection("restaurants");
});

document.getElementById("edit-restaurant-status").addEventListener("change", (e) => {
    document.getElementById("status-text").textContent = e.target.checked ? "Open" : "Closed";
});

// Vendor Mapping Functions
async function loadVendorMappings() {
    try {
        const querySnapshot = await getDocs(collection(db, "vendorMappings"));
        const fragment = document.createDocumentFragment();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement("div");
            item.className = "item";
            item.innerHTML = `
                <h4>${doc.id}</h4>
                <p>Restaurant ID: ${data.restaurantId}</p>
                <button class="btn btn-secondary delete-mapping" data-id="${doc.id}">Delete</button>
            `;
            item.querySelector(".delete-mapping").addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete vendor mapping for email: ${doc.id}?`)) deleteVendorMapping(doc.id);
            });
            fragment.appendChild(item);
        });
        vendorMappingList.innerHTML = "";
        vendorMappingList.appendChild(fragment);
        if (!querySnapshot.size) vendorMappingList.innerHTML = "<p class='text-gray-400'>No mappings found.</p>";
        loadRestaurantsForDropdown();
    } catch (error) {
        console.error("Error loading vendor mappings:", error);
        showNotification("Failed to load vendor mappings", "error");
    }
}

// Menu Item Functions
async function loadMenuItems(restaurantId) {
    try {
        const querySnapshot = await getDocs(collection(db, "restaurant", restaurantId, "menu"));
        const fragment = document.createDocumentFragment();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement("div");
            item.className = "item";
            item.innerHTML = `
                <h4>${data.name || "Unnamed"}</h4>
                <p>Price: GH₵${data.price?.toFixed(2) || "Not set"}</p>
                <div class="item-actions">
                    <button class="btn btn-secondary edit-menu-item" data-id="${doc.id}" data-restaurant-id="${restaurantId}">Edit</button>
                    <button class="btn btn-secondary delete-menu-item" data-id="${doc.id}" data-restaurant-id="${restaurantId}">Delete</button>
                </div>
            `;
            item.querySelector(".edit-menu-item").addEventListener("click", () => editMenuItem(restaurantId, doc.id));
            item.querySelector(".delete-menu-item").addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete menu item: ${data.name}?`)) deleteMenuItem(restaurantId, doc.id);
            });
            fragment.appendChild(item);
        });
        menuItemList.innerHTML = "";
        menuItemList.appendChild(fragment);
        if (!querySnapshot.size) menuItemList.innerHTML = "<p class='text-gray-400'>No menu items found.</p>";
    } catch (error) {
        console.error("Error loading menu items:", error);
        showNotification("Failed to load menu items", "error");
    }
}

async function editMenuItem(restaurantId, itemId) {
    try {
        const itemDoc = await getDoc(doc(db, "restaurant", restaurantId, "menu", itemId));
        if (itemDoc.exists()) {
            const data = itemDoc.data();
            const nameInput = document.getElementById("menu-item-name");
            const priceInput = document.getElementById("menu-item-price");
            
            nameInput.value = data.name || "";
            priceInput.value = data.price || "";
            
            const form = document.getElementById("menu-item-form");
            form.dataset.itemId = itemId;
            form.querySelector("button").textContent = "Update Menu Item";
        }
    } catch (error) {
        console.error("Error loading menu item for edit:", error);
        showNotification("Failed to load menu item details", "error");
    }
}

async function deleteMenuItem(restaurantId, itemId) {
    try {
        await deleteDoc(doc(db, "restaurant", restaurantId, "menu", itemId));
        showNotification("Menu item successfully deleted!");
        loadMenuItems(restaurantId);
    } catch (error) {
        console.error("Error deleting menu item:", error);
        showNotification("Unable to delete menu item. Please try again.", "error");
    }
}

document.getElementById("menu-item-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const restaurantId = document.getElementById("current-restaurant-id").value;
        const name = document.getElementById("menu-item-name").value;
        const price = document.getElementById("menu-item-price").value;
        const form = document.getElementById("menu-item-form");
        const itemId = form.dataset.itemId;

        if (!name.trim()) {
            showNotification("Please enter a menu item name.", "error");
            return;
        }

        if (!price || isNaN(price) || price < 0) {
            showNotification("Please enter a valid price.", "error");
            return;
        }

        const itemData = {
            name,
            price: Number(price),
            timestamp: Date.now()
        };

        if (itemId) {
            await updateDoc(doc(db, "restaurant", restaurantId, "menu", itemId), itemData);
            showNotification(`Menu item "${name}" updated successfully!`);
            delete form.dataset.itemId;
            form.querySelector("button").textContent = "Add Menu Item";
        } else {
            await addDoc(collection(db, "restaurant", restaurantId, "menu"), itemData);
            showNotification(`Menu item "${name}" added successfully!`);
        }

        document.getElementById("menu-item-name").value = "";
        document.getElementById("menu-item-price").value = "";
        loadMenuItems(restaurantId);
    } catch (error) {
        console.error("Error saving menu item:", error);
        showNotification("Unable to save menu item. Please try again.", "error");
    }
});

// Dashboard Functions
function loadDashboard() {
    try {
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        const currentDate = new Date();
        document.getElementById("current-date").textContent = currentDate.toLocaleDateString('en-US', {
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });

      
        let restaurantCount = 0, vendorCount = 0, orderCount = 0, userCount = 0;

        onSnapshot(collection(db, "restaurant"), (snapshot) => {
            restaurantCount = snapshot.size;
            updateDashboard();
        }, error => console.error("Restaurant snapshot error:", error));

        onSnapshot(collection(db, "vendorMappings"), (snapshot) => {
            vendorCount = snapshot.size;
            updateDashboard();
        }, error => console.error("Vendor snapshot error:", error));

        onSnapshot(collection(db, "orders"), (snapshot) => {
            orderCount = snapshot.size;
            updateDashboard();
        }, error => console.error("Orders snapshot error:", error));

        onSnapshot(collection(db, "users"), (snapshot) => {
            userCount = snapshot.size;
            updateDashboard();
        }, error => console.error("Users snapshot error:", error));

        function updateDashboard() {
            dashboardGrid.innerHTML = "";
            const cards = [
                  { id: "users", title: "Users", count: userCount, icon: "fa-users", tooltip: "Total users" },
                   { id: "orders", title: "Orders", count: orderCount, icon: "fa-shopping-cart", tooltip: "Total orders" },
                { id: "restaurants", title: "Restaurants", count: restaurantCount, icon: "fa-store", tooltip: "Total restaurants" },
                { id: "vendors", title: "Vendors", count: vendorCount, icon: "fa-user-tie", tooltip: "Total vendors" }
            ];
            
            cards.forEach(card => {
                const div = document.createElement("div");
                div.className = `dashboard-card ${card.id}`;
                div.innerHTML = `
                    <div class="tooltip">${card.tooltip}</div>
                    <h3>${card.title}</h3>
                    <div class="subtitle">Total Active</div>
                    <p>${card.count}</p>
                    <i class="fas ${card.icon}"></i>
                `;
                dashboardGrid.appendChild(div);
            });
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
        showNotification("Unable to load dashboard. Please try again.", "error");
    }
}

// Order Functions
function loadOrders() {
  try {
    onSnapshot(query(collection(db, "orders"), orderBy("timestamp", "desc")), (snapshot) => {
      if (snapshot.empty) {
        ordersList.innerHTML = "<p style='color:#aaa;text-align:center;'>No orders yet.</p>";
        return;
      }

      ordersList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const orderId = doc.id;
        const time = data.timestamp?.toDate().toLocaleString() || "Unknown";
        const cart = data.cart || [];
        const delivery = data.deliveryDetails || {};
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const processingFee = data.processingFee ?? 2.00;
        const deliveryFee = data.deliveryFee ?? 3.00;
        const total = data.totalAmount ?? (subtotal + processingFee + deliveryFee);
        const status = data.status || "pending";

        const statusColors = {
          "pending": "bg-yellow-500 text-black",
          "being_delivered": "bg-blue-500 text-white",
          "delivered": "bg-green-500 text-white",
          "not_delivered": "bg-red-500 text-white"
        };
        const statusText = {
          "pending": "Pending",
          "being_delivered": "In Transit",
          "delivered": "Delivered",
          "not_delivered": "Failed"
        };

        const itemDiv = document.createElement("div");
        itemDiv.className = "rounded-xl p-4 mb-4 shadow-md cursor-pointer transition-all duration-200";
        itemDiv.style.background = "#2b2b2d";

        const statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status] || "bg-gray-600 text-white"}">
          ${statusText[status] || status}
        </span>`;

        itemDiv.innerHTML = `
          <div class="flex justify-between items-center flex-wrap mb-2 order-header">
            <div>
              <h4 class="text-white font-semibold text-lg mb-1">Order #${orderId}</h4>
              <p class="text-sm text-gray-400">${time}</p>
            </div>
            <div class="mt-2 sm:mt-0">
              ${statusBadge}
            </div>
          </div>
          <div class="order-details mt-2 text-sm text-gray-300 hidden">
            <p><strong>Location:</strong> ${delivery.hostel || "-"}, Room ${delivery.location || "-"}</p>
            <p><strong>Contact:</strong> ${delivery.contactNumber || "-"}</p>
            <p><strong>Note:</strong> ${delivery.note || "None"}</p>
            <ul class="list-disc list-inside text-white text-sm my-2">
              ${cart.map(item => `<li>${item.quantity}x ${item.name} - GH₵${(item.price * item.quantity).toFixed(2)}</li>`).join("")}
            </ul>
            <p><strong>Subtotal:</strong> GH₵${subtotal.toFixed(2)}</p>
            <p><strong>Processing Fee:</strong> GH₵${processingFee.toFixed(2)}</p>
            <p><strong>Delivery Fee:</strong> GH₵${deliveryFee.toFixed(2)}</p>
            <p class="text-white font-bold mt-1"><strong>Total:</strong> GH₵${total.toFixed(2)}</p>
            <button class="btn btn-secondary delete-order mt-3" data-id="${orderId}">Delete</button>
          </div>
        `;

        // Toggle on click
        itemDiv.addEventListener("click", (e) => {
          if (e.target.classList.contains("delete-order")) return; // prevent toggle on delete
          const details = itemDiv.querySelector(".order-details");
          details.classList.toggle("hidden");
        });

        // Delete listener
        itemDiv.querySelector(".delete-order").addEventListener("click", () => {
          if (confirm(`Delete order ID: ${orderId}?`)) deleteOrder(orderId);
        });

        ordersList.appendChild(itemDiv);
      });
    }, err => {
      console.error(err);
      ordersList.innerHTML = "<p class='text-red-500'>Failed to load orders.</p>";
    });
  } catch (err) {
    console.error(err);
    showNotification("Error loading orders", "error");
  }
}

// User Functions
async function loadUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersArray = [];

        querySnapshot.forEach(doc => {
            const data = doc.data();
            usersArray.push({ id: doc.id, data });
        });

        // Sort by dateJoined or createdAt, newest first
        usersArray.sort((a, b) => {
            const dateA = a.data.dateJoined || a.data.createdAt;
            const dateB = b.data.dateJoined || b.data.createdAt;
            if (dateA && dateB) return new Date(dateB) - new Date(dateA);
            if (dateA) return -1;
            if (dateB) return 1;
            return 0;
        });

        const fragment = document.createDocumentFragment();

        usersArray.forEach(({ id, data }) => {
            const item = document.createElement("div");
            item.className = "user-item";

            const createdAt = formatDate(data.dateJoined || data.createdAt);
            const name = data.name || "";
            const userId = data.userId || "N/A";
            const phone = data.phone || "N/A";
            const email = data.email || "N/A";

            item.innerHTML = `
                <div class="user-details">
                    <h4 class="name-display">${name}</h4>
                    <input type="text" class="edit-name input hidden" value="${name}" style="max-width: 100%;" />
                    <p><strong>User ID:</strong> ${userId}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Created At:</strong> ${createdAt || 'N/A'}</p>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary edit-name-btn">Edit</button>
                    <button class="btn btn-secondary save-name-btn hidden">Save</button>
                    <button class="btn btn-tertiary cancel-edit-btn hidden">Cancel</button>
                    <button class="btn btn-primary delete-user" data-id="${id}">Delete</button>
                </div>
            `;

            const editBtn = item.querySelector(".edit-name-btn");
            const saveBtn = item.querySelector(".save-name-btn");
            const cancelBtn = item.querySelector(".cancel-edit-btn");
            const nameInput = item.querySelector(".edit-name");
            const nameDisplay = item.querySelector(".name-display");

            editBtn.addEventListener("click", () => {
                nameDisplay.classList.add("hidden");
                nameInput.classList.remove("hidden");
                saveBtn.classList.remove("hidden");
                cancelBtn.classList.remove("hidden");
                editBtn.classList.add("hidden");
            });

            cancelBtn.addEventListener("click", () => {
                nameInput.value = nameDisplay.textContent;
                nameDisplay.classList.remove("hidden");
                nameInput.classList.add("hidden");
                saveBtn.classList.add("hidden");
                cancelBtn.classList.add("hidden");
                editBtn.classList.remove("hidden");
            });

            saveBtn.addEventListener("click", async () => {
                const newName = nameInput.value.trim();
                if (!newName) {
                    showNotification("Name cannot be empty", "error");
                    return;
                }
                await updateDoc(doc(db, "users", id), { name: newName });
                nameDisplay.textContent = newName;
                nameDisplay.classList.remove("hidden");
                nameInput.classList.add("hidden");
                saveBtn.classList.add("hidden");
                cancelBtn.classList.add("hidden");
                editBtn.classList.remove("hidden");
                showNotification("Name updated successfully");
            });

            item.querySelector(".delete-user").addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete user ID: ${id}?`)) {
                    deleteUser(id);
                }
            });

            fragment.appendChild(item);
        });

        usersList.innerHTML = "";
        usersList.appendChild(fragment);

        if (!usersArray.length) {
            usersList.innerHTML = "<p class='text-gray-400'>No users found.</p>";
        }

    } catch (error) {
        console.error("Error loading users:", error);
        showNotification("Failed to load users", "error");
    }
}

// Format date as "27 May, 2025"
function formatDate(timestamp) {
    if (!timestamp) return null;
    const date = new Date(timestamp);

    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();

    const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return `${day} ${month}, ${year} at ${time}`;
}

// Delete Functions
async function deleteRestaurant(id) {
    try {
        await deleteDoc(doc(db, "restaurant", id));
        showNotification("Restaurant successfully deleted!");
        loadRestaurants();
    } catch (error) {
        console.error("Error deleting restaurant:", error);
        showNotification("Unable to delete restaurant. Please try again.", "error");
    }
}

async function deleteVendorMapping(id) {
    try {
        await deleteDoc(doc(db, "vendorMappings", id));
        showNotification("Vendor mapping successfully deleted!");
        loadVendorMappings();
        loadRestaurantsForDropdown();
    } catch (error) {
        console.error("Error deleting vendor mapping:", error);
        showNotification("Unable to delete vendor mapping. Please try again.", "error");
    }
}

async function deleteOrder(id) {
    try {
        await deleteDoc(doc(db, "orders", id));
        showNotification("Order successfully deleted!");
    } catch (error) {
        console.error("Error deleting order:", error);
        showNotification("Unable to delete order. Please try again.", "error");
    }
}

async function deleteUser(id) {
    try {
        await deleteDoc(doc(db, "users", id));
        showNotification("User successfully deleted!");
        loadUsers();
    } catch (error) {
        console.error("Error deleting user:", error);
        showNotification("Unable to delete user. Please try again.", "error");
    }
}

// Form Handlers
document.getElementById("add-discount-form").addEventListener("submit", async e => {
  e.preventDefault();

  const code = document.getElementById("discount-code").value.trim().toUpperCase();
  const type = document.getElementById("discount-type").value;
  const value = parseFloat(document.getElementById("discount-value").value);
  const maxUses = parseInt(document.getElementById("discount-max-uses").value) || null;
  const expiresAtRaw = document.getElementById("discount-expiry").value;
  const active = document.getElementById("discount-active").checked;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;
const appliesTo = document.getElementById("discount-applies-to").value;

  if (!code || isNaN(value) || value <= 0) {
    showNotification("Please enter a valid code and value", "error");
    return;
  }

  try {
   await setDoc(doc(db, "discountCodes", code), {
  code,
  type,
  value,
  active,
  maxUses,
  expiresAt,
  appliesTo // ✅ NEW
}, { merge: true });

    showNotification("Discount code saved ✅");
    e.target.reset();
    loadDiscounts();
  } catch (err) {
    console.error(err);
    showNotification("Failed to save discount code", "error");
  }
});


document.getElementById("restaurant-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const name = document.getElementById("restaurant-name").value;
        const image = document.getElementById("restaurant-image").value;
        const delivery_time = document.getElementById("delivery_time").value;
        
        if (!name.trim()) {
            showNotification("Please enter a restaurant name.", "error");
            return;
        }
        
        if (delivery_time && isNaN(delivery_time) || delivery_time < 0) {
            showNotification("Please enter a valid delivery time.", "error");
            return;
        }

        const docRef = await addDoc(collection(db, "restaurant"), { 
            name, 
            image, 
            delivery_time: delivery_time ? Number(delivery_time) : null,
            isOpen: false, 
            timestamp: Date.now() 
        });
        showNotification(`Restaurant "${name}" has been added successfully!`);
        document.getElementById("restaurant-name").value = "";
        document.getElementById("restaurant-image").value = "";
        document.getElementById("delivery_time").value = "";
        loadRestaurants();
    } catch (error) {
        console.error("Error adding restaurant:", error);
        showNotification("Unable to add restaurant. Please try again.", "error");
    }
});

document.getElementById("vendor-mapping-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const email = document.getElementById("vendor-email").value.trim();
        const restaurantId = document.getElementById("vendor-restaurant").value;
        
        if (!email) {
            showNotification("Please enter a vendor email.", "error");
            return;
        }
        
        if (!restaurantId) {
            showNotification("Please select a restaurant.", "error");
            return;
        }
        
        await setDoc(doc(db, "vendorMappings", email), { restaurantId, timestamp: Date.now() });
        showNotification(`Vendor "${email}" has been mapped successfully!`);
        document.getElementById("vendor-email").value = "";
        document.getElementById("vendor-restaurant").value = "";
        loadVendorMappings();
        loadRestaurantsForDropdown();
    } catch (error) {
        console.error("Error adding vendor mapping:", error);
        showNotification("Unable to add vendor mapping. Please try again.", "error");
    }
});

// Delivery Section Functions (UI improved)
async function loadDeliveryPersonnel() {
    try {
        const personnelList = document.getElementById("personnel-list");
        personnelList.innerHTML = `<div style="text-align:center; color:#aaa; padding:20px 0;">Loading delivery personnel...</div>`;
        onSnapshot(collection(db, "deliveryMapping"), (snapshot) => {
            if (!snapshot.size) {
                personnelList.innerHTML = "<p class='text-gray-400' style='text-align:center;'>No delivery personnel found.<br>Add personnel to manage delivery accounts.</p>";
                return;
            }
            const fragment = document.createDocumentFragment();
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const btn = document.createElement("button");
                btn.className = "personnel-list-btn";
                btn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span class="personnel-email">${docSnap.id}</span>
                    <span class="personnel-label">${Array.isArray(data.allowedHostels) && data.allowedHostels.length ? data.allowedHostels.length + ' Hostel' + (data.allowedHostels.length > 1 ? 's' : '') : 'No Hostels'}</span>
                    <span class="status-dot${data.isActive === false ? ' inactive' : ''}" title="${data.isActive === false ? 'Inactive' : 'Active'}"></span>
                `;
                btn.onclick = () => showPersonnelDetails(docSnap.id);
                fragment.appendChild(btn);
            });
            personnelList.innerHTML = "";
            personnelList.appendChild(fragment);
        }, error => {
            personnelList.innerHTML = "<p class='text-red-400' style='text-align:center;'>Failed to load delivery personnel.</p>";
            showNotification("Failed to load delivery personnel. Please check permissions.", "error");
        });
    } catch (error) {
        document.getElementById("personnel-list").innerHTML = "<p class='text-red-400' style='text-align:center;'>Unable to load delivery personnel.</p>";
        showNotification("Unable to load delivery personnel.", "error");
    }
}

async function loadFees() {
  const container = document.getElementById("fees-list");
  container.innerHTML = "Loading...";

  const snapshot = await getDocs(collection(db, "deliveryFees"));
  if (snapshot.empty) {
    container.innerHTML = "<p>No delivery fees found.</p>";
    return;
  }

  const allHostels = [
    "Hostel A", "Hostel B", "Hostel C", 
    "Heavens Gate Block A", "Heavens Gate Block B", "Heavens Gate Block C", 
    "Abrempong Hostel", "Prestige Hostel"
  ];

  const feeMap = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.name) feeMap[data.name] = { ...data, id: doc.id };
  });

  container.innerHTML = "";

  allHostels.forEach(name => {
    const data = feeMap[name];
    if (!data) return; // Skip if no fee exists for that hostel

    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <h4 class="text-white font-semibold text-lg">${data.name}</h4>
      <p class="text-gray-300 mb-2">Delivery Fee: GH₵<span class="fee-value">${data.fee}</span></p>
      <div class="item-actions">
        <button class="btn btn-secondary edit-fee-btn">Edit</button>
      </div>
    `;

    const actions = card.querySelector(".item-actions");
    const editBtn = card.querySelector(".edit-fee-btn");

    editBtn.addEventListener("click", () => {
      actions.innerHTML = `
        <input type="number" min="0" value="${data.fee}" class="input fee-input" placeholder="Enter fee" style="max-width:100px;">
        <button class="btn btn-primary save-fee-btn">Save</button>
        <button class="btn btn-tertiary cancel-fee-btn">Cancel</button>
      `;

      const feeInput = actions.querySelector(".fee-input");
      const saveBtn = actions.querySelector(".save-fee-btn");
      const cancelBtn = actions.querySelector(".cancel-fee-btn");

      cancelBtn.addEventListener("click", () => loadFees());

      saveBtn.addEventListener("click", async () => {
        const newFee = parseFloat(feeInput.value);
        if (isNaN(newFee) || newFee < 0) {
          showNotification("Please enter a valid non-negative fee.", "error");
          return;
        }

        try {
          await setDoc(doc(db, "deliveryFees", data.id), {
            ...data,
            fee: newFee
          });
          showNotification(`Fee updated for ${data.name}`, "success");
          loadFees();
        } catch (err) {
          console.error(err);
          showNotification("Failed to update fee.", "error");
        }
      });
    });

    container.appendChild(card);
  });
}


async function showPersonnelDetails(email) {
    try {
        document.getElementById("delivery").classList.add("hidden");
        document.getElementById("personnel-details-section").classList.remove("hidden");

        const detailsContent = document.getElementById("personnel-details-content");
        detailsContent.innerHTML = `<div style="text-align:center; color:#aaa; padding:20px 0;">Loading details...</div>`;

        const personnelDoc = await getDoc(doc(db, "deliveryMapping", email));
        if (!personnelDoc.exists()) {
            detailsContent.innerHTML = `<p class="text-red-400" style="text-align:center;">Personnel not found.</p>`;
            return;
        }
        const data = personnelDoc.data();

        detailsContent.innerHTML = `
            <div class="item" style="max-width:500px;margin:auto;">
                <h4><i class="fas fa-user"></i> ${email}</h4>
                <p><b>Status:</b> <span style="color:${data.isActive !== false ? '#34c759' : '#ff3b30'};font-weight:600;">${data.isActive !== false ? "Active" : "Inactive"}</span></p>
                <p><b>Hostels:</b> <span style="color:#30c8ff">${Array.isArray(data.allowedHostels) && data.allowedHostels.length ? data.allowedHostels.join(", ") : "None"}</span></p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px;">
                    <button class="btn btn-secondary" id="toggle-personnel-status">${data.isActive !== false ? "Close" : "Open"}</button>
                    <button class="btn btn-secondary" id="edit-personnel-hostels">Edit Hostels</button>
                    <button class="btn btn-secondary" id="delete-personnel">Delete</button>
                </div>
            </div>
        `;

        document.getElementById("toggle-personnel-status").onclick = async () => {
            await updateDoc(doc(db, "deliveryMapping", email), {
                isActive: !data.isActive,
                updatedAt: Date.now()
            });
            showNotification(`Personnel "${email}" is now ${!data.isActive ? "Active" : "Inactive"}.`);
            showPersonnelDetails(email);
        };
        document.getElementById("edit-personnel-hostels").onclick = async () => {
            // 1. Use your static allowed hostels array
            const allHostels = ["Hostel A", "Hostel B", "Hostel C", "Heavens Gate Block A", "Heavens Gate Block B","Heavens Gate Block C", "Abrempong Hostel", "Prestige Hostel"];

            // 2. Build modal HTML
            const currentHostels = Array.isArray(data.allowedHostels) ? data.allowedHostels : [];
            const modal = document.createElement("div");
            modal.id = "hostel-modal";
            modal.style = `
                position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;
                background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;
            `;
            modal.innerHTML = `
                <div style="background:#232325;padding:32px 20px 20px 20px;border-radius:18px;max-width:95vw;width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
                    <h3 style="font-size:1.15rem;font-weight:600;margin-bottom:18px;color:#30c8ff;text-align:center;">Select Allowed Hostels</h3>
                    <div id="hostel-checkboxes" style="max-height:220px;overflow-y:auto;margin-bottom:18px;">
                        ${allHostels.length ? allHostels.map(h => `
                            <label style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:1rem;">
                                <input type="checkbox" value="${h}" ${currentHostels.includes(h) ? "checked" : ""} style="accent-color:#30c8ff;width:18px;height:18px;">
                                <span>${h}</span>
                            </label>
                        `).join('') : '<span style="color:#aaa;">No hostels found.</span>'}
                    </div>
                    <div style="display:flex;gap:12px;justify-content:center;">
                        <button id="hostel-modal-save" class="btn btn-secondary" style="min-width:90px;">Save</button>
                        <button id="hostel-modal-cancel" class="btn btn-tertiary" style="min-width:90px;">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // 3. Modal actions
            document.getElementById("hostel-modal-cancel").onclick = () => modal.remove();
            document.getElementById("hostel-modal-save").onclick = async () => {
                const checked = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                await updateDoc(doc(db, "deliveryMapping", email), {
                    allowedHostels: checked,
                    updatedAt: Date.now()
                });
                showNotification("Hostels updated successfully!");
                modal.remove();
                showPersonnelDetails(email);
            };
            // Optional: close modal on outside click
            modal.onclick = e => { if (e.target === modal) modal.remove(); };
        };
    } catch (error) {
        document.getElementById("personnel-details-content").innerHTML = `<p class="text-red-400" style="text-align:center;">Failed to load details.</p>`;
        showNotification("Failed to load personnel details.", "error");
    }
}

document.addEventListener("click", function(e) {
    if (e.target && e.target.id === "back-to-personnel-list") {
        document.getElementById("personnel-details-section").classList.add("hidden");
        document.getElementById("delivery").classList.remove("hidden");
        loadDeliveryPersonnel();
    }
});

// Authentication Handling
function updateUIForUser(user) {
    console.log("Updating UI for user:", user ? user.email : "No user");
    clearTimeout(loadingTimeout); // Clear timeout if auth resolves
    loadingScreen.style.display = "none";
    if (user && adminEmails.includes(user.email)) {
        console.log("Admin logged in:", user.email);
        loginSection.style.display = "none";
        mainContent.classList.remove("hidden");
        loadDashboard();
        loadRestaurants();
        loadVendorMappings();
        loadOrders();
        loadUsers();
        loadDeliverySection();
    } else {
        console.log("No admin user detected");
        loginSection.style.display = "flex";
        mainContent.classList.add("hidden");
        if (user) {
            signOut(auth).then(() => {
                showLoginNotification("Unauthorized: Not an admin!", "error");
            }).catch(error => {
                console.error("Sign out error:", error);
                showLoginNotification("Failed to sign out.", "error");
            });
        }
    }
}

// Initialize Auth Listener
onAuthStateChanged(auth, (user) => {
    try {
        updateUIForUser(user);
    } catch (error) {
        console.error("Auth state change error:", error);
        loadingScreen.style.display = "none";
        loginSection.style.display = "flex";
        mainContent.classList.add("hidden");
        showLoginNotification("Authentication error", "error");
    }
}, error => {
    console.error("Auth listener error:", error);
    loadingScreen.style.display = "none";
    loginSection.style.display = "flex";
    mainContent.classList.add("hidden");
    showLoginNotification("Authentication listener failed", "error");
});

// Fallback: Check auth state after 3 seconds if listener hasn't fired
setTimeout(() => {
    if (!timeoutTriggered && loadingScreen.style.display !== "none") {
        console.warn("Auth listener hasn't fired, checking current user");
        const user = auth.currentUser;
        updateUIForUser(user);
    }
}, 3000);

document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginBtn) {
        loginBtn.disabled = true;
        if (loginSpinner) loginSpinner.style.display = 'inline-block';
    }
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (adminEmails.includes(user.email)) {
            loginSection.style.display = "none";
            mainContent.classList.remove("hidden");
            loadDashboard();
        } else {
            await signOut(auth);
            showLoginNotification("You do not have admin privileges", "error");
        }
    } catch (error) {
        console.error("Login error:", error);
        showLoginNotification(error.message, "error");
    } finally {
        if (loginBtn) loginBtn.disabled = false;
        if (loginSpinner) loginSpinner.style.display = 'none';
    }
});


// Add this function if not present, or update your delivery tab click handler to use it:
function loadDeliverySection() {
    document.getElementById("personnel-details-section").classList.add("hidden");
    document.getElementById("delivery").classList.remove("hidden");
    loadDeliveryPersonnel();
}



// Handle Delivery Personnel Form Submission
document.getElementById("delivery-personnel-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("personnel-email").value.trim();
    const hostelsRaw = document.getElementById("personnel-hostels").value;
    const allowedHostels = hostelsRaw.split(',').map(h => h.trim()).filter(Boolean);

    if (!email) {
        showNotification("Please enter an email.", "error");
        return;
    }

    try {
        await setDoc(doc(db, "deliveryMapping", email), {
            email,
            allowedHostels,
            isDelivery: true,
            isOpen: true,
            createdAt: Date.now()
        });
        showNotification(`Delivery mapping for ${email} added successfully.`);
        document.getElementById("personnel-email").value = "";
        document.getElementById("personnel-hostels").value = "";
        loadDeliveryPersonnel();
    } catch (error) {
        console.error("Error adding delivery mapping:", error);
        showNotification("Failed to add delivery mapping.", "error");
    }
});



document.getElementById("earnings-btn").addEventListener("click", () => {
    toggleSection("earnings");
    loadEarnings();
});

document.getElementById("earnings-filter").addEventListener("change", loadEarnings);

document.getElementById("export-csv-btn").addEventListener("click", () => {
    if (Object.keys(latestVendorMap).length === 0) {
        showNotification("No data available to export.", "error");
        return;
    }
    exportVendorEarningsCSV(latestVendorMap, latestVendorNames);
});


document.getElementById("dashboard-btn").addEventListener("click", () => { 
    toggleSection("dashboard"); 
    loadDashboard(); 
});

document.getElementById("orders-btn").addEventListener("click", () => { 
    toggleSection("orders"); 
    loadOrders(); 
});
document.getElementById("users-btn").addEventListener("click", () => { 
    toggleSection("users"); 
    loadUsers(); 
});

document.getElementById("settings-btn").addEventListener("click", () => { 
    toggleSection("settings"); 
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => {
        showLoginNotification("Logged out successfully!");
        loadingScreen.style.display = "none";
        loginSection.style.display = "flex";
        mainContent.classList.add("hidden");
    }).catch(error => {
        console.error("Logout error:", error);
        showNotification("Failed to logout. Please try again.", "error");
    });
});
document.getElementById("update-btn").addEventListener("click", () => {
    window.location.reload(true);
});
document.getElementById("vendor-tab").addEventListener("click", () => {
    document.getElementById("vendor-earnings-group").style.display = "block";
    document.getElementById("delivery-earnings-group").style.display = "none";
});

document.getElementById("delivery-tab").addEventListener("click", () => {
    document.getElementById("vendor-earnings-group").style.display = "none";
    document.getElementById("delivery-earnings-group").style.display = "block";
});





let trendingDocs = [];


// Service Worker registration (optional, keep as is if you use it)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}
