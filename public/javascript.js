document.addEventListener("DOMContentLoaded", () => fetchBooks());

async function fetchBooks(query = "", category = "") {
  const grid = document.getElementById("bookGrid");
  const loading = document.getElementById("loading");
  const noResults = document.getElementById("noResults");

  grid.innerHTML = "";
  loading.style.display = "block";
  noResults.style.display = "none";

  try {
    const res = await fetch(
      `/api/books?search=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
    );
    const books = await res.json();

    loading.style.display = "none";

    if (books.length === 0) {
      noResults.style.display = "block";
      return;
    }

    books.forEach((b) => {
      const card = document.createElement("div");
      card.className = "book-card";
      card.innerHTML = `
                <span class="badge">${escapeHtml(b.category)}</span>
                <h3>${escapeHtml(b.title)}</h3>
                <p><strong>Author:</strong> ${escapeHtml(b.author)}</p>
                <p><strong>ISBN:</strong> ${escapeHtml(b.isbn)}</p>
                <span class="status ${b.is_available ? "available" : "borrowed"}">
                    ${b.is_available ? "Available" : "Borrowed"}
                </span>

                <div class="actions">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
      card
        .querySelector(".edit-btn")
        .addEventListener("click", () => editBook(b));
      card
        .querySelector(".delete-btn")
        .addEventListener("click", () => deleteBook(b));
      grid.appendChild(card);
    });
  } catch (e) {
    loading.style.display = "none";
    grid.innerHTML = `<p class="error">Error loading books.</p>`;
  }
}

function handleSearch() {
  const q = document.getElementById("searchInput").value.trim();
  const c = document.getElementById("categoryFilter").value;
  fetchBooks(q, c);
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}

async function deleteBook(book) {
  if (!confirm(`Delete "${book.title}"?`)) return;
  await sendChange(`/api/books/${book.id}`, { method: "DELETE" });
}
async function editBook(book) {
  const updated = {};
  for (const field of ["title", "author", "category", "isbn"]) {
    const value = prompt(`Edit ${field}:`, book[field]);
    if (value === null) return;
    if (!value.trim()) return alert(`${field} cannot be empty.`);
    updated[field] = value.trim();
  }
  await sendChange(`/api/books/${book.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  });
}

async function sendChange(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error();
    handleSearch();
  } catch {
    alert("Could not save the change.");
  }
}