from sqlalchemy import create_engine, text
import os

url = f"sqlite:///{os.environ.get('DATABASE_PATH','/app/data/ngi_capital.db')}"
engine = create_engine(url, connect_args={"check_same_thread": False})
with engine.connect() as conn:
    try:
        r = conn.execute(text('SELECT COUNT(*) FROM advisory_projects')).fetchone()
        print('projects_count', r[0])
    except Exception as e:
        print('ERR projects', type(e).__name__, e)
    sql = (
        "SELECT p.id, p.project_name, p.client_name, p.summary, p.hero_image_url, p.gallery_urls, p.showcase_pdf_url, p.tags, p.partner_badges, p.backer_badges, p.start_date, p.end_date, p.allow_applications, "
        "p.status, p.mode, p.location_text, p.team_size, p.default_hourly_rate, p.pay_currency, (SELECT COUNT(1) FROM advisory_applications a WHERE a.target_project_id = p.id) AS applied_count "
        "FROM advisory_projects p WHERE 1=1 LIMIT 1"
    )
    try:
        row = conn.execute(text(sql)).fetchone()
        if row is None:
            print('no project rows')
        else:
            print('row_len', len(row))
            print('row_last', row[-1])
    except Exception as e:
        print('ERR select', type(e).__name__, e)
