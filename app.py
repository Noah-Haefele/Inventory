import sqlite3
import os
from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    flash,
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from database import get_db_connection, init_db

app = Flask(__name__)
app.secret_key = "pi_inventur_geheim"

init_db()


# --- PAGE-ROUTES ---
@app.route("/")
def index():
    return (
        redirect(url_for("home"))
        if "user_id" in session
        else redirect(url_for("login"))
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        u, p = request.form["username"], request.form["password"]
        conn = get_db_connection() # connects to db with function from database.py
        user = conn.execute("SELECT * FROM users WHERE username = ?", (u,)).fetchone()
        conn.close() # closes connection
        if user and check_password_hash(user["password"], p): # checks if the users password matches the entered password
            session.update(
                {
                    "user_id": user["id"],
                    "username": user["username"],
                    "role": user["role"],
                }
            )
            return redirect(url_for("home"))
        flash("Login fehlgeschlagen!")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear() # user logged out
    return redirect(url_for("login"))


@app.route("/home")
def home():
    if "user_id" not in session: 
        return redirect(url_for("login"))
    return render_template(
        "home.html", username=session["username"], role=session["role"] 
    )


@app.route("/events")
def events():
    if "user_id" not in session: 
        return redirect(url_for("login"))
    return render_template(
        "events.html", username=session["username"], role=session["role"] 
    )


@app.route("/event_detail/<int:event_id>")
def event_detail(event_id):
    if "user_id" not in session: 
        return redirect(url_for("login"))
    conn = get_db_connection()
    event = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone() 
    conn.close()
    if not event:
        return "Event nicht gefunden", 404
    return render_template( 
        "event_detail.html",
        event=event,
        username=session["username"],
        role=session["role"],
    )


# only admin account can visit this route
@app.route("/users")
def users():
    if session.get("role") != "Administrator": # checks if user not is admin
        return redirect(url_for("home"))
    conn = get_db_connection()
    all_users = conn.execute("SELECT * FROM users").fetchall()
    conn.close()
    return render_template(
        "users.html",
        users=all_users,
        username=session["username"],
        role=session["role"],
    )




# --- API-INVENTORY ---
@app.route("/api/get_inventory")
def get_inventory():
    conn = get_db_connection()
    sql = """
    SELECT i.*, 
           (i.anzahl - COALESCE(
                (SELECT SUM(ea.anzahl) 
                 FROM event_assignments ea
                 JOIN events e ON ea.event_id = e.id
                 WHERE ea.inventory_id = i.id AND e.is_active = 1), 
            0)) as aktuell
    FROM inventory i
    """
    items = conn.execute(sql).fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in items])


@app.route("/api/add_inventory", methods=["POST"])
def add_inventory():
    conn = get_db_connection()
    try:
        first_group = conn.execute(
            "SELECT name FROM inventory_groups LIMIT 1"
        ).fetchone()

        # default group
        group_name = first_group["name"] if first_group else "Standard"

        # finds unique name
        i = 1
        while conn.execute(
            "SELECT id FROM inventory WHERE name_id=?", (f"Neuer Artikel {i}",)
        ).fetchone():
            i += 1
        new_name = f"Neuer Artikel {i}"

        cur = conn.execute(
            "INSERT INTO inventory (gruppe, name_id, lagerort, anzahl, info, gebrauch) VALUES (?, ?, ?, ?, ?, ?)",
            (group_name, new_name, "-", 1, "-", "-"),
        )
        new_id = cur.lastrowid
        conn.commit()

        return jsonify({"success": True, "id": new_id})

    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Name bereits vergeben"}), 400
    finally:
        conn.close()


@app.route("/api/update_inventory", methods=["POST"])
def update_inventory():
    d = request.json
    conn = get_db_connection()
    try:
        conn.execute(
            f"UPDATE inventory SET {d['field']} = ? WHERE id = ?", (d["value"], d["id"])
        )
        conn.commit()
        return jsonify({"success": True})
    except:
        return jsonify({"error": "Existiert bereits"}), 400
    finally:
        conn.close()
    


@app.route("/api/delete_inventory", methods=["POST"])
def delete_inventory():
    conn = get_db_connection()
    conn.execute("DELETE FROM inventory WHERE id = ?", (request.json["id"],))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- API-EVENTS ---
@app.route("/api/get_events")
def get_events():
    conn = get_db_connection()
    events = conn.execute("SELECT * FROM events ORDER BY datum DESC").fetchall()
    conn.close()
    return jsonify([dict(e) for e in events])


@app.route("/api/add_event", methods=["POST"])
def add_event():
    conn = get_db_connection()
    cur = conn.execute(
        "INSERT INTO events (name, datum, ort, verantwortlich, info) VALUES (?, ?, ?, ?, ?)",
        ("Neues Event", "2026-01-15", "-", "-", "-"),
    )
    new_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"success": True, "id": new_id})


@app.route("/api/update_event", methods=["POST"])
def update_event():
    d = request.json
    conn = get_db_connection()
    conn.execute(
        f"UPDATE events SET {d['field']} = ? WHERE id = ?", (d["value"], d["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/delete_event", methods=["POST"])
def delete_event():
    d = request.json
    conn = get_db_connection()
    conn.execute("DELETE FROM event_assignments WHERE event_id = ?", (d["id"],))
    conn.execute("DELETE FROM events WHERE id = ?", (d["id"],))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/set_active_event", methods=["POST"])
def set_active_event():
    d = request.json
    event_id = d.get("id")  # can be none
    conn = get_db_connection()
    conn.execute("UPDATE events SET is_active = 0")
    if event_id is not None:
        conn.execute("UPDATE events SET is_active = 1 WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- API-USER ---


@app.route("/api/get_users")
def get_users():
    if "user_id" not in session:
        return jsonify({"error": "Nicht angemeldet"}), 401
    conn = get_db_connection()
    users = conn.execute("SELECT username FROM users ORDER BY username ASC").fetchall()
    conn.close()
    return jsonify([u["username"] for u in users])


@app.route("/api/add_user", methods=["POST"])
def add_user():
    if session.get("role") != "Administrator":
        return jsonify({"error": "Verweigert"}), 403
    conn = get_db_connection()
    i = 1
    while conn.execute(
        "SELECT id FROM users WHERE username=?", (f"User_{i}",)
    ).fetchone():
        i += 1
    new_u = f"User_{i}"
    conn.execute(
        "INSERT INTO users (username, password, role, info) VALUES (?, ?, ?, ?)",
        (new_u, generate_password_hash("1234"), "User", "-"),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/update_user", methods=["POST"])
def update_user():
    # only admins can switch roles
    if session.get("role") != "Administrator":
        return jsonify({"error": "Nicht erlaubt"}), 403

    d = request.json
    # pwd hash
    val = generate_password_hash(d["value"]) if d["field"] == "password" else d["value"]

    conn = get_db_connection()
    try:
        conn.execute(f"UPDATE users SET {d['field']} = ? WHERE id = ?", (val, d["id"]))
        conn.commit()
        return jsonify({"success": True})
    except:
        return jsonify({"error": "Existiert bereits"}), 400
    finally:
        conn.close()



@app.route("/api/delete_user", methods=["POST"])
def delete_user():
    if session.get("role") != "Administrator":
        return jsonify({"error": "Verweigert"}), 403
    conn = get_db_connection()
    conn.execute("DELETE FROM users WHERE id = ?", (request.json["id"],))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# --- API-GROUPS ---
@app.route("/api/get_groups")
def get_groups():
    conn = get_db_connection()
    groups = conn.execute("SELECT * FROM inventory_groups").fetchall()
    conn.close()
    return jsonify([dict(g) for g in groups])


@app.route("/api/add_group", methods=["POST"])
def add_group():
    name = request.json.get("name")
    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO inventory_groups (name) VALUES (?)", (name,))
        conn.commit()
        return jsonify({"success": True})
    except:
        return jsonify({"error": "Existiert bereits"}), 400
    finally:
        conn.close()


@app.route("/api/delete_group", methods=["POST"])
def delete_group():
    conn = get_db_connection()

    count = conn.execute("SELECT COUNT(*) FROM inventory_groups").fetchone()[0]

    if count <= 1:
        conn.close()
        return jsonify({"error": "Es muss mindestens eine Gruppe existieren!"}), 400

    conn.execute("DELETE FROM inventory_groups WHERE id = ?", (request.json["id"],))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/get_event_items/<int:event_id>")
def get_event_items(event_id):
    conn = get_db_connection()
    sql = "SELECT inventory.*, event_assignments.id as assignment_id, event_assignments.anzahl as assigned_qty FROM inventory JOIN event_assignments ON inventory.id = event_assignments.inventory_id WHERE event_assignments.event_id = ?"
    items = conn.execute(sql, (event_id,)).fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in items])


@app.route("/api/assign_item", methods=["POST"])
def assign_item():
    d = request.json
    conn = get_db_connection()
    existing = conn.execute(
        "SELECT id FROM event_assignments WHERE event_id=? AND inventory_id=?",
        (d["event_id"], d["inventory_id"]),
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE event_assignments SET anzahl = ? WHERE id = ?",
            (d["anzahl"], existing["id"]),
        )
    else:
        conn.execute(
            "INSERT INTO event_assignments (event_id, inventory_id, anzahl) VALUES (?, ?, ?)",
            (d["event_id"], d["inventory_id"], d["anzahl"]),
        )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/update_assignment_qty", methods=["POST"])
def update_assignment_qty():
    d = request.json
    conn = get_db_connection()
    print(d["anzahl"])
    print(d["id"])
    conn.execute(
        "UPDATE event_assignments SET anzahl = ? WHERE id = ?", (d["anzahl"], d["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/remove_assignment", methods=["POST"])
def remove_assignment():
    conn = get_db_connection()
    conn.execute("DELETE FROM event_assignments WHERE id = ?", (request.json["id"],))
    conn.commit()
    conn.close()
    return jsonify({"success": True})



UPLOAD_FOLDER = "static/manuals"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/api/get_pdfs/<int:item_id>")
def get_pdfs(item_id):
    conn = get_db_connection()
    pdfs = conn.execute(
        "SELECT * FROM inventory_pdfs WHERE inventory_id = ?", (item_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(p) for p in pdfs])


@app.route("/api/upload_pdf", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return jsonify({"error": "Keine Datei"}), 400
    file = request.files["file"]
    item_id = request.form.get("item_id")

    if file and file.filename.endswith(".pdf"):
        filename = secure_filename(file.filename)
        path = os.path.join(app.config["UPLOAD_FOLDER"], f"{item_id}_{filename}")
        file.save(path)

        conn = get_db_connection()
        conn.execute(
            "INSERT INTO inventory_pdfs (inventory_id, filename, filepath) VALUES (?, ?, ?)",
            (item_id, filename, path),
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    return jsonify({"error": "Nur PDFs erlaubt"}), 400


@app.route("/api/delete_pdf", methods=["POST"])
def delete_pdf():
    d = request.json
    pdf_id = d.get("id")
    conn = get_db_connection()
    pdf = conn.execute(
        "SELECT filepath FROM inventory_pdfs WHERE id = ?", (pdf_id,)
    ).fetchone()
    if pdf:
        if os.path.exists(pdf["filepath"]):
            os.remove(pdf["filepath"])
        conn.execute("DELETE FROM inventory_pdfs WHERE id = ?", (pdf_id,))
        conn.commit()
    conn.close()
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
