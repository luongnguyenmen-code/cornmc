from flask import Flask, request, send_file, jsonify
import mcschematic
from PIL import Image
import json
import tempfile
import os

app = Flask(__name__)

# Lấy đường dẫn của thư mục 'api/' để tìm file mapping và settings
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Bê nguyên danh sách blocks từ file skintool.py của bạn vào đây
blocks = [
    {'color':(8, 10, 15, 255),'block':'black_concrete'},
    {'color':(37, 22, 16, 255),'block':'black_terracotta'},
    {'color':(20, 21, 25, 255),'block':'black_wool'},
    {'color':(44, 46, 143, 255),'block':'blue_concrete'},
    {'color':(74, 59, 91, 255),'block':'blue_terracotta'},
    {'color':(53, 57, 157, 255),'block':'blue_wool'},
    {'color':(96, 59, 31, 255),'block':'brown_concrete'},
    {'color':(77, 51, 35, 255),'block':'brown_terracotta'},
    {'color':(114, 71, 40, 255),'block':'brown_wool'},
    {'color':(21, 119, 136, 255),'block':'cyan_concrete'},
    {'color':(86, 91, 91, 255),'block':'cyan_terracotta'},
    {'color':(21, 137, 145, 255),'block':'cyan_wool'},
    {'color':(54, 57, 61, 255),'block':'gray_concrete'},
    {'color':(57, 42, 35, 255),'block':'gray_terracotta'},
    {'color':(62, 68, 71, 255),'block':'gray_wool'},
    {'color':(73, 91, 36, 255),'block':'green_concrete'},
    {'color':(76, 83, 42, 255),'block':'green_terracotta'},
    {'color':(84, 109, 27, 255),'block':'green_wool'},
    {'color':(35, 137, 198, 255),'block':'light_blue_concrete'},
    {'color':(113, 108, 137, 255),'block':'light_blue_terracotta'},
    {'color':(58, 175, 217, 255),'block':'light_blue_wool'},
    {'color':(125, 125, 115, 255),'block':'light_gray_concrete'},
    {'color':(135, 106, 97, 255),'block':'light_gray_terracotta'},
    {'color':(142, 142, 134, 255),'block':'light_gray_wool'},
    {'color':(94, 168, 24, 255),'block':'lime_concrete'},
    {'color':(103, 117, 52, 255),'block':'lime_terracotta'},
    {'color':(112, 185, 25, 255),'block':'lime_wool'},
    {'color':(169, 48, 159, 255),'block':'magenta_concrete'},
    {'color':(149, 88, 108, 255),'block':'magenta_terracotta'},
    {'color':(189, 68, 179, 255),'block':'magenta_wool'},
    {'color':(224, 97, 0, 255),'block':'orange_concrete'},
    {'color':(161, 83, 37, 255),'block':'orange_terracotta'},
    {'color':(240, 118, 19, 255),'block':'orange_wool'},
    {'color':(213, 101, 142, 255),'block':'pink_concrete'},
    {'color':(161, 78, 78, 255),'block':'pink_terracotta'},
    {'color':(237, 141, 172, 255),'block':'pink_wool'},
    {'color':(100, 31, 156, 255),'block':'purple_concrete'},
    {'color':(118, 70, 86, 255),'block':'purple_terracotta'},
    {'color':(121, 42, 172, 255),'block':'purple_wool'},
    {'color':(142, 32, 32, 255),'block':'red_concrete'},
    {'color':(143, 61, 46, 255),'block':'red_terracotta'},
    {'color':(160, 39, 34, 255),'block':'red_wool'},
    {'color':(207, 213, 214, 255),'block':'white_concrete'},
    {'color':(209, 178, 161, 255),'block':'white_terracotta'},
    {'color':(233, 236, 236, 255),'block':'white_wool'},
    {'color':(240, 175, 21, 255),'block':'yellow_concrete'},
    {'color':(186, 133, 35, 255),'block':'yellow_terracotta'},
    {'color':(248, 197, 39, 255),'block':'yellow_wool'},
]

def colordiff(pixelcolor, blockcolor):
    out = 0
    for i in range(4):
        out += abs(pixelcolor[i] - blockcolor[i])
    return out

def findblockfromcolor(pixcolor):
    # Tìm block có màu giống nhất (Tối ưu lại thuật toán cũ của bạn cho web chạy nhanh hơn)
    best_block = min(blocks, key=lambda b: colordiff(pixcolor["color"], b["color"]))
    return best_block["block"]

def combinedata(im, map_img):
    image_val = list(im.getdata())
    map_val = list(map_img.getdata())
    conversions = []
    for i in range(len(map_val)):
        conversions.append({
            "color": image_val[i],
            "pos": map_val[i],
            "block": ""
        })

    out = []
    for i in conversions:
        if i["color"][3] == 0 or i["pos"][3] == 0:
            continue
        else:
            out.append(i)
    return out

@app.route('/api/convert', methods=['POST', 'OPTIONS'])
def convert_skin():
    if request.method == 'OPTIONS': 
        return '', 200
        
    if 'skin' not in request.files:
        return jsonify({"error": "Chưa chọn file skin!"}), 400
    
    file = request.files['skin']
    
    try:
        # 1. Đọc file mapping và settings từ thư mục /api/
        map_path = os.path.join(BASE_DIR, 'mapping_4px.png')
        settings_path = os.path.join(BASE_DIR, 'settings.json')

        mapping = Image.open(map_path).convert("RGBA")
        skin = Image.open(file).convert("RGBA")
        
        try:
            with open(settings_path) as f:
                settings = json.load(f)
        except:
            settings = {"version": "JE_1_20_1"}

        schem = mcschematic.MCSchematic()
        conversions = combinedata(skin, mapping)
        
        # 2. Xử lý convert
        for i in range(len(conversions)):
            conversions[i]["block"] = findblockfromcolor(conversions[i])
            
        for i in conversions:
            x, y, z, *rest = i["pos"]
            schem.setBlock((x, y, z), i["block"])

        # 3. Lưu file vào thư mục rác tạm thời của máy chủ Vercel (/tmp)
        temp_dir = tempfile.gettempdir()
        output_name = "Skin_Converted"
        
        # Xác định phiên bản
        schem_version = mcschematic.Version.JE_1_20_1
        if "version" in settings:
            try:
                schem_version = getattr(mcschematic.Version, settings["version"])
            except: pass
            
        schem.save(temp_dir, output_name, schem_version)
        file_path = os.path.join(temp_dir, f"{output_name}.schem")
        
        # 4. Gửi file về cho người dùng tải
        return send_file(file_path, as_attachment=True, download_name="SkinCustom.schem")

    except Exception as e:
        return jsonify({"error": str(e)}), 500