import urllib.request
import re
import json

url = "https://www.youtube.com/watch?v=b7fKfZAzxTY"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as r:
        html = r.read().decode('utf-8', errors='ignore')
        
        match = re.search(r'ytInitialPlayerResponse\s*=\s*({.+?});', html)
        if match:
            data = json.loads(match.group(1))
            renderer = data.get('captions', {}).get('playerCaptionsTracklistRenderer', {})
            tracks = renderer.get('captionTracks', [])
            print("Number of tracks:", len(tracks))
            for i, track in enumerate(tracks):
                print(f"Track {i}: languageCode={track.get('languageCode')} kind={track.get('kind')} baseUrl={track.get('baseUrl')[:100]}...")
            
            if tracks:
                first_track = tracks[0]
                base_url = first_track.get('baseUrl').replace('&amp;', '&')
                print("\nFetching track:", base_url[:150] + "...")
                
                # Fetch XML format
                req_xml = urllib.request.Request(base_url, headers=headers)
                with urllib.request.urlopen(req_xml) as rx:
                    xml_text = rx.read().decode('utf-8', errors='ignore')
                    print(f"XML length: {len(xml_text)}")
                    print("XML first 200 chars:", xml_text[:200])
                    
                # Fetch JSON format (fmt=json3)
                json_url = base_url + ("&fmt=json3" if "?" in base_url else "?fmt=json3")
                print("\nFetching JSON track:", json_url[:150] + "...")
                req_json = urllib.request.Request(json_url, headers=headers)
                with urllib.request.urlopen(req_json) as rj:
                    json_text = rj.read().decode('utf-8', errors='ignore')
                    print(f"JSON length: {len(json_text)}")
                    print("JSON first 200 chars:", json_text[:200])
except Exception as e:
    import traceback
    traceback.print_exc()
