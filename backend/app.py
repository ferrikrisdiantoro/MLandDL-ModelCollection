from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import torch
import torchvision.transforms as transforms
import io
import mysql.connector
import torch.nn.functional as F


app = Flask(__name__)
CORS(app)

# Load pre-trained model
model = torch.jit.load("../model/ensamble_swin-and-resnet_vegetables.pt", map_location=torch.device('cpu'))
model.eval()

class_names = ['Bawang Merah', 'Bawang Putih', 'Bayam', 'Cabai', 'Kentang', 'Kubis', 'Terong', 'Timun', 'Tomat', 'Wortel']

# Koneksi ke MySQL
db = mysql.connector.connect(
    host="192.168.0.105",
    user="root",
    password="123Ferri!", 
    database="ml-project"
)

# Image pre-processing
def transform_image(image):
    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return preprocess(image).unsqueeze(0)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Baca file gambar dan lakukan prediksi
        img = Image.open(file).convert('RGB')
        img = transform_image(img)
        
        # Prediksi dengan model
        with torch.no_grad():
            outputs = model(img)
            _, predicted_class = torch.max(outputs, 1)
            # Hitung confidence menggunakan softmax
            probabilities = F.softmax(outputs, dim=1)
            confidence = probabilities[0][predicted_class].item() * 100

        # Ambil nama kelas
        class_name = class_names[predicted_class.item()]
        
        # Mengambil data nutrisi dari database
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM `informasi-gizi-sayuran` WHERE class_name = %s", (class_name,))
        nutrition_row = cursor.fetchone()
        cursor.close()

        if nutrition_row:
            # Format data nutrisi sebagai dictionary
            nutrition_info = {
                "energi": {"amount": nutrition_row["energi"], "unit": "kkal", "akg": nutrition_row["akg_energi"]},
                "lemak_total": {"amount": nutrition_row["lemak_total"], "unit": "g", "akg": nutrition_row["akg_lemak_total"]},
                "vitamin_a": {"amount": nutrition_row["vitamin_a"], "unit": "mcg", "akg": nutrition_row["akg_vitamin_a"]},
                "vitamin_b1": {"amount": nutrition_row["vitamin_b1"], "unit": "mg", "akg": nutrition_row["akg_vitamin_b1"]},
                "vitamin_b2": {"amount": nutrition_row["vitamin_b2"], "unit": "mg", "akg": nutrition_row["akg_vitamin_b2"]},
                "vitamin_b3": {"amount": nutrition_row["vitamin_b3"], "unit": "mg", "akg": nutrition_row["akg_vitamin_b3"]},
                "vitamin_c": {"amount": nutrition_row["vitamin_c"], "unit": "mg", "akg": nutrition_row["akg_vitamin_c"]},
                "karbohidrat_total": {"amount": nutrition_row["karbohidrat_total"], "unit": "mg", "akg": nutrition_row["akg_karbohidrat_total"]},
                "protein": {"amount": nutrition_row["protein"], "unit": "g", "akg": nutrition_row["akg_protein"]},
                "serat_pangan": {"amount": nutrition_row["serat_pangan"], "unit": "g", "akg": nutrition_row["akg_serat_pangan"]},
                "kalsium": {"amount": nutrition_row["kalsium"], "unit": "g", "akg": nutrition_row["akg_kalsium"]},
                "fosfor": {"amount": nutrition_row["fosfor"], "unit": "mg", "akg": nutrition_row["akg_fosfor"]},
                "natrium": {"amount": nutrition_row["natrium"], "unit": "mg", "akg": nutrition_row["akg_natrium"]},
                "kalium": {"amount": nutrition_row["kalium"], "unit": "mg", "akg": nutrition_row["akg_kalium"]},
                "tembaga": {"amount": nutrition_row["tembaga"], "unit": "mg", "akg": nutrition_row["akg_tembaga"]},
                "besi": {"amount": nutrition_row["besi"], "unit": "mcg", "akg": nutrition_row["akg_besi"]},
                "seng": {"amount": nutrition_row["seng"], "unit": "mg", "akg": nutrition_row["akg_seng"]},
                "b_karoten": {"amount": nutrition_row["b_karoten"], "unit": "mg", "akg": nutrition_row["akg_b_karoten"]},
                "karoten_total": {"amount": nutrition_row["karoten_total"], "akg": nutrition_row["akg_karoten_total"]},
                "air": {"amount": nutrition_row["air"], "unit": "g", "akg": nutrition_row["akg_air"]},
                "abu": {"amount": nutrition_row["abu"], "unit": "g", "akg": nutrition_row["akg_abu"]}
            }
            
            # Mencari nilai AKG terbesar
            highest_akg_key = max(nutrition_info, key=lambda k: nutrition_info[k]['akg'])
            highest_akg_value = nutrition_info[highest_akg_key]['akg']

            return jsonify({
                "class_id": predicted_class.item(),
                "class_name": class_name,
                "confidence": confidence,
                "highest_akg": {
                    "name": highest_akg_key,
                    "value": highest_akg_value
                },
                "nutrition_info": nutrition_info
            })
        else:
            return jsonify({"error": "Nutrition info not found"}), 404


    except Exception as e:
        print("Error:", e)  # Log error di terminal untuk debugging
        return jsonify({"error": "Prediction failed", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
