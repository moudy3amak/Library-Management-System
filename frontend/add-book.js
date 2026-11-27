document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addBookForm');
    const message = document.getElementById('formMessage');
    const button = document.getElementById('addBookButton');

    if (!form || !message || !button) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const book = {
            title: document.getElementById('title').value.trim(),
            author: document.getElementById('author').value.trim(),
            category: document.getElementById('category').value.trim(),
            isbn: document.getElementById('isbn').value.trim()
        };

        if (Object.values(book).some(value => !value)) {
            showMessage('Please fill in all fields.', 'error');
            return;
        }

        button.disabled = true;
        button.textContent = 'Adding...';
        showMessage('Sending book details...', 'info');

        try {
            const response = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(book)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.message || result.error ||
                    (response.status === 404
                        ? 'The Add Book API is not available on the server yet.'
                        : 'The book could not be added. Please try again.'));
            }

            form.reset();
            showMessage(result.message || 'Book added successfully.', 'success');
        } catch (error) {
            showMessage(error.message || 'Could not connect to the server.', 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Add Book';
        }
    });

    function showMessage(text, type) {
        message.textContent = text;
        message.className = 'form-message ' + type;
    }
});
