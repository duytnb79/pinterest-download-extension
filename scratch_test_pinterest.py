import urllib.request
import re
import json
import sys

# Reconfigure stdout to use UTF-8 just in case
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = "https://www.pinterest.com/pin/1105070827338767690/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
        print("=== TEST __PWS_DATA__ ===")
        pws_match = re.search(r'<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>', html)
        if pws_match:
            print("Found __PWS_DATA__ script tag!")
            try:
                data = json.loads(pws_match.group(1))
                # Print keys inside data to see redux state structure
                print("Data keys:", list(data.keys()))
                redux_state = data.get('props', {}).get('initialReduxState', {})
                print("Redux state keys:", list(redux_state.keys()))
                pins_data = redux_state.get('pins', {})
                print("Pins keys found:", list(pins_data.keys()))
                
                # Check if our pinId exists in pins redux store
                for k, v in pins_data.items():
                    print(f"Pin info for key {k}:")
                    print("Title:", v.get('title'))
                    print("Has tags:", 'tags' in v)
                    if 'tags' in v:
                        print("Tags length:", len(v['tags']))
                        print("Tags sample:", [t.get('name') for t in v['tags']][:5])
                    print("Has visual annotations:", 'visual_annotation_keywords' in v)
                    if 'visual_annotation_keywords' in v:
                        print("Visual annotations:", v['visual_annotation_keywords'][:5])
            except Exception as e:
                print("Error parsing __PWS_DATA__ JSON:", e)
        else:
            print("NOT found __PWS_DATA__ script tag!")
            
        print("\n=== TEST JSON-LD ===")
        ld_matches = re.findall(r'<script type="application\/ld\+json">([\s\S]*?)<\/script>', html)
        print(f"Found {len(ld_matches)} JSON-LD tags!")
        for idx, ld in enumerate(ld_matches):
            try:
                data = json.loads(ld)
                print(f"Tag {idx}: Type: {data.get('@type')}")
                if 'keywords' in data:
                    print("Keywords found:", data['keywords'])
                if 'about' in data:
                    print("About field found:", data['about'])
            except Exception as e:
                pass
except Exception as e:
    print("Fetch error:", e)
