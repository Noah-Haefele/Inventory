import sqlite3
from werkzeug.security import generate_password_hash

DATABASE = "users.db"


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()

    # 1. user-table
    conn.execute(
        """CREATE TABLE IF NOT EXISTS users 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  username TEXT UNIQUE, password TEXT, role TEXT, info TEXT)"""
    )

    # 2. inventory-table
    conn.execute(
        """CREATE TABLE IF NOT EXISTS inventory 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  gruppe TEXT, name_id TEXT UNIQUE, lagerort TEXT, 
                  anzahl INTEGER DEFAULT 1, info TEXT, gebrauch TEXT)"""
    )

    # 3. group-table
    conn.execute(
        """CREATE TABLE IF NOT EXISTS inventory_groups 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)"""
    )

    # 4. events-table
    conn.execute(
        """CREATE TABLE IF NOT EXISTS events 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  datum TEXT, name TEXT, ort TEXT, verantwortlich TEXT, 
                  info TEXT, status TEXT, is_active INTEGER DEFAULT 0)"""
    )

    # 5. assignment
    conn.execute(
        """CREATE TABLE IF NOT EXISTS event_assignments 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  event_id INTEGER, 
                  inventory_id INTEGER, 
                  anzahl INTEGER DEFAULT 1,
                  FOREIGN KEY(event_id) REFERENCES events(id),
                  FOREIGN KEY(inventory_id) REFERENCES inventory(id))"""
    )

    # 6. pdf-table
    conn.execute(
        """CREATE TABLE IF NOT EXISTS inventory_pdfs 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  inventory_id INTEGER, 
                  filename TEXT, 
                  filepath TEXT,
                  FOREIGN KEY(inventory_id) REFERENCES inventory(id))"""
    )

    # !!! standard admin !!!
    admin = conn.execute('SELECT * FROM users WHERE username="Admin"').fetchone()
    if not admin:
        conn.execute(
            "INSERT INTO users (username, password, role, info) VALUES (?, ?, ?, ?)",
            (
                "Admin",
                generate_password_hash("admin"),
                "Administrator",
                "System Account",
            ),
        )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
