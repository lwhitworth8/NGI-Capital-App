import sqlite3, os

p = os.environ.get('DATABASE_PATH', '/app/data/ngi_capital.db')
con = sqlite3.connect(p)
cur = con.cursor()
print('DB', p)
try:
    cur.execute('SELECT COUNT(*) FROM advisory_projects')
    print('projects_count', cur.fetchone()[0])
except Exception as e:
    print('ERR projects', type(e).__name__, e)

sql = (
    "SELECT p.id, p.project_name, p.client_name, p.summary, p.hero_image_url, p.gallery_urls, p.showcase_pdf_url, p.tags, p.partner_badges, p.backer_badges, p.start_date, p.end_date, p.allow_applications, "
    "p.status, p.mode, p.location_text, p.team_size, p.default_hourly_rate, p.pay_currency, (SELECT COUNT(1) FROM advisory_applications a WHERE a.target_project_id = p.id) AS applied_count "
    "FROM advisory_projects p WHERE 1=1 LIMIT 1"
)
try:
    row = cur.execute(sql).fetchone()
    if row is None:
        print('no project rows')
    else:
        print('row_len', len(row))
        print('row', row)
except Exception as e:
    print('ERR select', type(e).__name__, e)
cur.close(); con.close()
