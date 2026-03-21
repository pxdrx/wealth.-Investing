"""EVENT_DASHBOARD_HARD_RESET_STRICT - validate DB and API."""
import sqlite3
import requests

conn = sqlite3.connect("mrkt_edge.db")
c = conn.cursor()
c.execute(
    "SELECT impact, COUNT(*) FROM events WHERE date >= ? AND date <= ? GROUP BY impact",
    ("2026-01-25", "2026-01-31"),
)
rows = c.fetchall()
counts = dict(rows)
total = sum(counts.values())
high = counts.get("HIGH", 0)
medium = counts.get("MEDIUM", 0)
low = counts.get("LOW", 0)
conn.close()

print("=== DB (25-31/01) ===")
print("total:", total, "high:", high, "medium:", medium, "low:", low)
print("displayed:", high + medium)

try:
    r = requests.get("http://127.0.0.1:8000/api/mrkt/realtime-events", timeout=5)
    d = r.json()
    print("\n=== API ===")
    print("status:", r.status_code)
    print("success:", d.get("success"))
    print("summary:", d.get("summary"))
    print("events len:", len(d.get("events", [])))
    print("snapshot_id:", d.get("snapshot_id"))
    print("status:", d.get("status"))
except Exception as e:
    print("API check failed (is backend running?):", e)
