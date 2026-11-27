// Library Management System: small web server (no extra libraries needed).
//
//  * Serves the web pages from the `public/` and `frontend/` folders.
//  * GET  /api/books?search=...&category=...   -> list / search books (JSON)
//  * POST /api/books  {title,author,category,isbn} -> add a book
//
// Books are kept in memory (a std::vector). The "Database" teammate can later
// replace `g_books` with real database calls.
//
// Build:  make server        Run:  ./build/server [port]   (default 8080)

#include <arpa/inet.h>
#include <netinet/in.h>
#include <signal.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

#include "book_search.hpp"

// ---------------------------------------------------------------- data ----
static std::vector<Book> g_books;
static int g_nextId = 1;

static void addBookToList(const std::string& title, const std::string& author,
                          const std::string& isbn, const std::string& category,
                          bool available = true) {
    Book b;
    b.id = g_nextId++;
    b.title = title;
    b.author = author;
    b.isbn = isbn;
    b.category = category;
    b.is_available = available;
    g_books.push_back(b);
}

static void loadSampleBooks() {
    addBookToList("Clean Code", "Robert Martin", "9780132350884", "Technology");
    addBookToList("The Hobbit", "J.R.R. Tolkien", "9780547928227", "Fiction");
    addBookToList("A Brief History of Time", "Stephen Hawking", "9780553380163", "Science", false);
    addBookToList("Sapiens", "Yuval Harari", "9780062316097", "History");
}

// --------------------------------------------------------------- helpers ----
static std::string urlDecode(const std::string& s) {
    std::string out;
    for (std::size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '+') {
            out += ' ';
        } else if (s[i] == '%' && i + 2 < s.size() + 0 && std::isxdigit((unsigned char)s[i + 1]) &&
                   std::isxdigit((unsigned char)s[i + 2])) {
            out += static_cast<char>(std::stoi(s.substr(i + 1, 2), nullptr, 16));
            i += 2;
        } else {
            out += s[i];
        }
    }
    return out;
}

// "a=1&b=two" -> { a:"1", b:"two" }
static std::map<std::string, std::string> parseQuery(const std::string& q) {
    std::map<std::string, std::string> result;
    std::stringstream ss(q);
    std::string pair;
    while (std::getline(ss, pair, '&')) {
        std::size_t eq = pair.find('=');
        if (eq == std::string::npos) result[urlDecode(pair)] = "";
        else result[urlDecode(pair.substr(0, eq))] = urlDecode(pair.substr(eq + 1));
    }
    return result;
}

// Reads the text value of "key" from a flat JSON object like {"title":"Hi"}.
static std::string jsonGetString(const std::string& json, const std::string& key) {
    std::string needle = "\"" + key + "\"";
    std::size_t pos = json.find(needle);
    if (pos == std::string::npos) return "";
    pos = json.find(':', pos + needle.size());
