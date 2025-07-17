document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM fully loaded!");

  // ✅ 1. Your Firebase Config
  const firebaseConfig = {
    apiKey: "AIzaSyAm7dYQ7el_qmfj9ia8FlhK0J7KeCKfOx0",
    authDomain: "memory-app-a58bc.firebaseapp.com",
    projectId: "memory-app-a58bc",
    storageBucket: "memory-app-a58bc.firebasestorage.app",
    messagingSenderId: "576020902077",
    appId: "1:576020902077:web:9749c05e5aa06100ad87d4"
  };

  // ✅ 2. Init Firebase + Firestore
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const entriesRef = db.collection("entries");

  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const categoryInput = document.getElementById("category");
  const tagsInput = document.getElementById("tags");
  const saveBtn = document.getElementById("saveBtn");
  const entriesList = document.getElementById("entriesList");
  const searchInput = document.getElementById("searchInput");
  const dateFilter = document.getElementById("dateFilter");

  // ✅ Global cache of all entries
  let allEntries = [];

  // ✅ Save Entry to Firestore
  saveBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = categoryInput.value.trim();
    const tags = tagsInput.value.trim().split(",").map(tag => tag.trim()).filter(Boolean);

    if (!title) {
      alert("Title is required!");
      return;
    }

    const newEntry = {
      title,
      content,
      category,
      tags,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // ✅ Add to Firestore (onSnapshot will auto-refresh UI)
    await entriesRef.add(newEntry);

    // ✅ Clear the form fields
    titleInput.value = "";
    contentInput.value = "";
    categoryInput.value = "";
    tagsInput.value = "";

    // ❌ Don't call renderEntries() here to avoid duplicate rendering
  });

  // ✅ Listen to Firestore changes in real-time without duplicates
 entriesRef.orderBy("createdAt", "desc").onSnapshot(snapshot => {
  const tempEntries = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.createdAt) { // only render once timestamp is ready
      tempEntries.push({ id: doc.id, ...data });
    }
  });

  // ✅ Always replace full list, no accumulation
  allEntries = tempEntries.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  // ✅ Single clean render
  renderEntries(allEntries, searchInput.value, dateFilter.value);
});




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
    }
  };

  // ✅ Edit Entry (load into form, then delete old)
  window.editEntry = async function (id) {
    const doc = await entriesRef.doc(id).get();
    if (!doc.exists) return;

    const entry = doc.data();
    titleInput.value = entry.title;
    contentInput.value = entry.content;
    categoryInput.value = entry.category;
    tagsInput.value = (entry.tags || []).join(", ");

    await entriesRef.doc(id).delete(); // remove old version
  };

  // ✅ Search & Date Filters (filter in-memory only)
  searchInput.addEventListener("input", () => {
    renderEntries(allEntries, searchInput.value, dateFilter.value);
  });

  dateFilter.addEventListener("change", () => {
    renderEntries(allEntries, searchInput.value, dateFilter.value);
  });
});
