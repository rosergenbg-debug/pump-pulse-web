import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data/history-seed.json"

def request_json(url, params, retries=4):
    address = url + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(address, headers={"Accept":"application/json","User-Agent":"PUMP-Pulse-History/1.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except Exception:
            if attempt + 1 == retries:
                raise
            time.sleep(1.5 * (attempt + 1))

def fetch_rows(url, symbol, start, end, limit=1000):
    rows, cursor = [], start
    while cursor < end:
        batch = request_json(url, {"symbol":symbol,"interval":"30m","startTime":cursor,"endTime":end,"limit":limit})
        if not batch:
            break
        rows.extend(batch)
        next_cursor = int(batch[-1][6]) + 1
        if next_cursor <= cursor:
            break
        cursor = next_cursor
        if len(batch) < limit:
            break
    return rows

def fetch_funding(start, end):
    rows, cursor = [], start
    while cursor < end:
        batch = request_json("https://fapi.binance.com/fapi/v1/fundingRate", {"symbol":"PUMPUSDT","startTime":cursor,"endTime":end,"limit":1000})
        if not batch:
            break
        rows.extend(batch)
        next_cursor = int(batch[-1]["fundingTime"]) + 1
        if next_cursor <= cursor:
            break
        cursor = next_cursor
        if len(batch) < 1000:
            break
    return rows

def compact_rows(rows):
    return [[int(r[0]),float(r[1]),float(r[2]),float(r[3]),float(r[4]),float(r[5]),int(r[6]),float(r[9])] for r in rows]

seed = json.loads(TARGET.read_text())
start, end = int(seed["pump"][0][0]), int(seed["pump"][-1][6])
print("downloading ETH and SOL history", flush=True)
eth_rows = fetch_rows("https://data-api.binance.vision/api/v3/klines", "ETHUSDT", start, end, 1000)
sol_rows = fetch_rows("https://data-api.binance.vision/api/v3/klines", "SOLUSDT", start, end, 1000)
print("downloading PUMP futures, premium and funding history", flush=True)
futures_rows = fetch_rows("https://fapi.binance.com/fapi/v1/klines", "PUMPUSDT", start, end, 1500)
premium_rows = fetch_rows("https://fapi.binance.com/fapi/v1/premiumIndexKlines", "PUMPUSDT", start, end, 1500)
funding_rows = fetch_funding(start, end)
def context_rows(rows):
    return [[int(r[6]),float(r[4]),float(r[5]),float(r[9])] for r in rows]

context = {
    "eth": context_rows(eth_rows),
    "sol": context_rows(sol_rows),
    "futures": context_rows(futures_rows),
    "premium": [[int(r[6]),float(r[4])] for r in premium_rows],
    "funding": [[int(r["fundingTime"]),float(r["fundingRate"])] for r in funding_rows],
}
for key, rows in context.items():
    (ROOT / f"data/context-{key}.json").write_text(json.dumps({key:rows}, separators=(",",":")))
TARGET.write_text(json.dumps({key:seed[key] for key in ["generatedAt","pump","eur","btc"]}, separators=(",",":")))
(ROOT / "data/history-meta.json").write_text(json.dumps({"generatedAt":seed["generatedAt"]}, separators=(",",":")))
for key in ["pump","eur"]:
    middle = len(seed[key]) // 2
    (ROOT / f"data/{key}-a.json").write_text(json.dumps(seed[key][:middle], separators=(",",":")))
    (ROOT / f"data/{key}-b.json").write_text(json.dumps(seed[key][middle:], separators=(",",":")))
(ROOT / "data/btc.json").write_text(json.dumps({"btc":seed["btc"]}, separators=(",",":")))
print({key:len(context[key]) for key in ["eth","sol","futures","premium","funding"]})
