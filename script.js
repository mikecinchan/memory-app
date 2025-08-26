document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM fully loaded!");

  // ✅ Firebase Config
  const firebaseConfig = {
    apiKey: "AIzaSyAm7dYQ7el_qmfj9ia8FlhK0J7KeCKfOx0",
    authDomain: "memory-app-a58bc.firebaseapp.com",
    projectId: "memory-app-a58bc",
    storageBucket: "memory-app-a58bc.firebasestorage.app",
    messagingSenderId: "576020902077",
    appId: "1:576020902077:web:9749c05e5aa06100ad87d4"
  };

  // ✅ Init Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const entriesRef = db.collection("entries");
  const auth = firebase.auth();

  // ✅ UI Elements
  const loginSection = document.getElementById("loginSection");
  const appSection   = document.getElementById("appSection");
  const loginEmail   = document.getElementById("loginEmail");
  const loginPassword= document.getElementById("loginPassword");
  const loginBtn     = document.getElementById("loginBtn");
  const loginError   = document.getElementById("loginError");
  const logoutBtn    = document.getElementById("logoutBtn");

  const titleInput   = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const categoryInput= document.getElementById("category");
  const tagsInput    = document.getElementById("tags");
  const saveBtn      = document.getElementById("saveBtn");
  const entriesList  = document.getElementById("entriesList");
  const searchInput  = document.getElementById("searchInput");
  const dateFilter   = document.getElementById("dateFilter");

  let allEntries = [];     // Cache
  let editingId = null;    // <-- track which doc is being edited (null = create mode)

  // Helper: reset form + UI state
  function clearForm() {
    titleInput.value = "";
    contentInput.value = "";
    categoryInput.value = "";
    tagsInput.value = "";
    editingId = null;
    if (saveBtn) saveBtn.textContent = "Save Entry";
  }

  // ✅ Auth State Listener
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("✅ Logged in:", user.email);
      loginSection.style.display = "none";
      appSection.style.display = "block";
      loadEntries(); // Load Firestore entries ONLY after login
    } else {
      console.log("❌ Not logged in");
      appSection.style.display = "none";
      loginSection.style.display = "block";
    }
  });

  // ✅ Login
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        loginError.textContent = err.message;
      }
    };
  }

  // ✅ Logout
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await auth.signOut();
    };
  }

  // ✅ Load Firestore entries after login
  function loadEntries() {
    entriesRef.orderBy("createdAt", "desc").onSnapshot(snapshot => {
      const tempEntries = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          tempEntries.push({ id: doc.id, ...data });
        }
      });
      allEntries = tempEntries.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      renderEntries(allEntries, searchInput.value, dateFilter.value);
    });
  }

  // ✅ Create or Update Entry
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const title    = titleInput.value.trim();
      const content  = contentInput.value.trim();
      const category = categoryInput.value.trim();
      const tags     = tagsInput.value.trim().split(",").map(t => t.trim()).filter(Boolean);

      if (!title) {
        alert("Title is required!");
        return;
      }

      if (editingId) {
        // 🔄 Update existing doc (keep createdAt, add updatedAt)
        await entriesRef.doc(editingId).update({
          title, content, category, tags,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // ✨ Create new doc
        await entriesRef.add({
          title, content, category, tags,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      clearForm(); // exit edit mode
    };
  }

  // ✅ Render function
  function renderEntries(entries, filter = "", date = "") {
    entriesList.innerHTML = "";

    const filtered = entries.filter(entry => {
      const text = `${entry.title} ${entry.content} ${entry.category} ${(entry.tags || []).join(" ")}`.toLowerCase();
      const matchesText = text.includes(filter.toLowerCase());

      let matchesDate = true;
      if (date && entry.createdAt) {
        const entryDate = entry.createdAt.toDate().toISOString().split("T")[0];
        matchesDate = (entryDate === date);
      }

      return matchesText && matchesDate;
    });

    if (filtered.length === 0) {
      entriesList.innerHTML = "<p>No entries found.</p>";
      return;
    }

    filtered.forEach(entry => {
      const div = document.createElement("div");
      div.classList.add("entry-card");

      const createdAtText = entry.createdAt
        ? entry.createdAt.toDate().toLocaleString()
        : "Pending...";

      div.innerHTML = `
        <div class="entry-header">
          <strong>${entry.title}</strong>
          <span>${createdAtText}</span>
        </div>
        <p>${entry.content}</p>
        <p><strong>Category:</strong> ${entry.category || "None"}</p>
        <p class="tags"><strong>Tags:</strong> ${(entry.tags || []).join(", ")}</p>
        <div class="actions">
          <button onclick="editEntry('${entry.id}')">Edit</button>
          <button onclick="deleteEntry('${entry.id}')">Delete</button>
        </div>
      `;
      entriesList.appendChild(div);
    });
  }

  // ✅ Delete Entry
  window.deleteEntry = async function (id) {
    if (confirm("Delete this entry?")) {
      await entriesRef.doc(id).delete();
      if (editingId === id) clearForm(); // if you deleted the one you're editing, exit edit mode
    }
  };

  // ✅ Edit Entry (NO delete here anymore)
  window.editEntry = async function (id) {
    const doc = await entriesRef.doc(id).get();
    if (!doc.exists) return;

    const entry = doc.data();
    titleInput.value    = entry.title || "";
    contentInput.value  = entry.content || "";
    categoryInput.value = entry.category || "";
    tagsInput.value     = (entry.tags || []).join(", ");

    editingId = id;                 // mark we're editing this doc
    saveBtn.textContent = "Save Changes";
    // Optional: scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ Search & Date Filters
  searchInput.addEventListener("input", () => {
    renderEntries(allEntries, searchInput.value, dateFilter.value);
  });

  dateFilter.addEventListener("change", () => {
    renderEntries(allEntries, searchInput.value, dateFilter.value);
  });
});
