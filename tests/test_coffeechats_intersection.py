import os
from fastapi.testclient import TestClient

os.environ['DISABLE_ADVISORY_AUTH'] = '1'

from src.api.main import app  # noqa: E402
from tests.helpers_auth import auth_headers

client = TestClient(app)


def _iso_in(minutes_from_now: int) -> str:
    import datetime as _dt
    d = _dt.datetime.utcnow() + _dt.timedelta(minutes=minutes_from_now)
    return d.replace(microsecond=0).isoformat()


def test_either_overlay_uses_minimal_grid_and_includes_intersection():
    # Add Andre (30m) and Landon (15m) overlapping availability
    astart, aend = _iso_in(60), _iso_in(120)
    lstart, lend = _iso_in(75), _iso_in(135)

    r1 = client.post('/api/advisory/coffeechats/availability', json={
        'start_ts': astart, 'end_ts': aend, 'slot_len_min': 30, 'admin_email': 'anurmamade@ngicapitaladvisory.com'
    }, headers=auth_headers('anurmamade@ngicapitaladvisory.com'))
    assert r1.status_code == 200

    r2 = client.post('/api/advisory/coffeechats/availability', json={
        'start_ts': lstart, 'end_ts': lend, 'slot_len_min': 15, 'admin_email': 'lwhitworth@ngicapitaladvisory.com'
    }, headers=auth_headers('lwhitworth@ngicapitaladvisory.com'))
    assert r2.status_code == 200

    res = client.get('/api/public/coffeechats/availability')
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict) and 'slots' in data
    slots = data['slots']
    assert any(s.get('type') == 'either' for s in slots)
    # Minimal grid should be 15 minutes
    assert any(s.get('type') == 'either' and int(s.get('slot_len_min')) == 15 for s in slots)
