import csv
import json
import os
import re

# File paths
BASE_DIR = r"c:\xampp\htdocs\RecursosUniversidadAbaco"
TEMP_DIR = os.path.join(BASE_DIR, "Data", "Temp")
OUTPUT_JSON = os.path.join(BASE_DIR, "Data", "videos.json")

FILE_1 = os.path.join(TEMP_DIR, "Links programas 2025 - Columnado Bancos de Alimetos.csv")
FILE_2 = os.path.join(TEMP_DIR, "Links programas 2025 - Temas Tecnicos.csv")

def parse_csv(filepath, default_type):
    videos = []
    # Using ansi/latin-1 because excel exports in spanish often use latin-1
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        with open(filepath, 'r', encoding='latin-1') as f:
            lines = f.readlines()
            
    # Find header row
    header_idx = -1
    for i, line in enumerate(lines[:20]):
        if 'Día' in line or 'D?a' in line or 'D\u00eda' in line or 'Mes' in line:
            header_idx = i
            break
            
    if header_idx == -1:
        print(f"No header found in {filepath}")
        return []

    # Read data
    reader = csv.reader(lines[header_idx:], delimiter=';')
    headers = next(reader)
    # clean headers
    headers = [h.strip() for h in headers]
    
    # Try to find key indices based on generic names
    def find_idx(keywords):
        for i, h in enumerate(headers):
            h_lower = h.lower()
            if any(k in h_lower for k in keywords):
                return i
        return -1

    idx_dia = find_idx(['d\u00eda', 'd?a', 'dia'])
    idx_mes = find_idx(['mes'])
    idx_ano = find_idx(['a\u00f1o', 'ano', 'a?o'])
    idx_link = find_idx(['enlace', 'link'])
    idx_tiempo = find_idx(['tiempo', 'duraci'])
    idx_programa = find_idx(['programa'])
    idx_entrevistado = find_idx(['entrevista', 'expositor', 'persona'])
    idx_banco = find_idx(['banco'])
    idx_tema = find_idx(['tema'])
    
    # If some are not found, assume standard positions based on sample:
    # Día;Mes;Año;Enlace;Tiempo;Programa;Entrevista/Expositor;Banco;Tema
    if idx_dia == -1: idx_dia = 0
    if idx_mes == -1: idx_mes = 1
    if idx_ano == -1: idx_ano = 2
    if idx_link == -1: idx_link = 3
    if idx_tiempo == -1: idx_tiempo = 4
    if idx_programa == -1: idx_programa = 5
    if idx_entrevistado == -1: idx_entrevistado = 6
    if idx_banco == -1 and 'Bancos de Alimetos' in filepath: idx_banco = 7
    if idx_tema == -1: idx_tema = 8 if 'Bancos de Alimetos' in filepath else 7 # Guessed based on typical structure

    print(f"Headers for {os.path.basename(filepath)}: {headers[:10]}")
    
    for row in reader:
        if not row or len(row) < 4: continue
        
        # Must have a link to be a video
        if idx_link < len(row):
            link = row[idx_link].strip()
            if not link.startswith('http'):
                continue
        else:
            continue
            
        def get_val(idx):
            return row[idx].strip() if idx != -1 and idx < len(row) else ""
            
        dia = get_val(idx_dia)
        mes = get_val(idx_mes)
        ano = get_val(idx_ano)
        
        # Valid date check
        if not dia.isdigit() and not mes.isdigit():
            continue
            
        # extract youtube id for thumbnail
        # e.g., https://youtube.com/live/unaDUOtoPrc -> unaDUOtoPrc
        yt_id = ""
        match = re.search(r'(?:v=|/)([0-9A-Za-z_-]{11}).*', link)
        if match:
            yt_id = match.group(1)
            
        video = {
            "fecha": f"{dia}/{mes}/{ano}",
            "enlace": link,
            "youtube_id": yt_id,
            "tiempo": get_val(idx_tiempo),
            "programa": get_val(idx_programa),
            "entrevistado": get_val(idx_entrevistado),
            "banco": get_val(idx_banco),
            "tema": get_val(idx_tema),
            "tipo": default_type
        }
        # Clean up empty values to avoid ';;;' strings
        for k in video:
            if type(video[k]) == str:
                video[k] = video[k].strip(';')
        
        videos.append(video)
        
    return videos

def main():
    if not os.path.exists(os.path.dirname(OUTPUT_JSON)):
        os.makedirs(os.path.dirname(OUTPUT_JSON))
        
    videos1 = parse_csv(FILE_1, "Bancos de Alimentos")
    videos2 = parse_csv(FILE_2, "Temas Técnicos")
    
    all_videos = videos1 + videos2
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_videos, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully exported {len(all_videos)} videos to {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
