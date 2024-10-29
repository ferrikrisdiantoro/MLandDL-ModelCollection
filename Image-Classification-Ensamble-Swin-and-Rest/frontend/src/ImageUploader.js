import React, { useState, useRef } from 'react';
import './ImageUploader.css';

const classes = [
  { name: "Bawang Merah", imageUrl: "/image/bm.jpg" },
  { name: "Bawang Putih", imageUrl: "/image/bp.jpg" },
  { name: "Bayam", imageUrl: "/image/by.jpg" },
  { name: "Cabai", imageUrl: "/image/cb.jpg" },
  { name: "Kentang", imageUrl: "/image/kt.jpg" },
  { name: "Kubis", imageUrl: "/image/ku.jpg" },
  { name: "Terong", imageUrl: "/image/te.png" },
  { name: "Timun", imageUrl: "/image/ti.jpg" },
  { name: "Tomat", imageUrl: "/image/to.jpg" },
  { name: "Wortel", imageUrl: "/image/wo.jpg" }
];

function CardList() {
  return (
    <div className="card-section">
      <h2 className="card-section-title">Sayuran yang dapat di Prediksi</h2>
      <div className="card-list">
        {classes.map((classItem, index) => (
          <div className="card" key={index}>
            <img src={classItem.imageUrl} alt={classItem.name} className="card-image" />
            <h3 className="card-title">{classItem.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [nutrition, setNutrition] = useState('');
  const [topNutrients, setTopNutrients] = useState([]);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false); // State untuk status kamera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const desiredOrder = [
    'energi',
    'lemak_total',
    'vitamin_a',
    'vitamin_b1',
    'vitamin_b2',
    'vitamin_b3',
    'vitamin_c',
    'karbohidrat_total',
    'protein',
    'serat_pangan',
    'kalium',
    'fosfor',
    'natrium',
    'tembaga',
    'besi',
    'seng',
    'b_karoten',
    'karoten_total',
    'air',
    'abu'
  ];

  const nutritionUnits = {
    energi: "kkal",
    lemak_total: "g",
    vitamin_a: "µg",
    vitamin_b1: "mg",
    vitamin_b2: "mg",
    vitamin_b3: "mg",
    vitamin_c: "mg",
    karbohidrat_total: "g",
    protein: "g",
    serat_pangan: "g",
    kalium: "mg",
    fosfor: "mg",
    natrium: "mg",
    tembaga: "mg",
    besi: "mg",
    seng: "mg",
    b_karoten: "µg",
    karoten_total: "µg",
    air: "g",
    abu: "g",
  };
  

  const nutritionNames = {
    energi: "Energi",
    lemak_total: "Lemak Total",
    vitamin_a: "Vitamin A",
    vitamin_b1: "Vitamin B1",
    vitamin_b2: "Vitamin B2",
    vitamin_b3: "Vitamin B3",
    vitamin_c: "Vitamin C",
    karbohidrat_total: "Karbohidrat Total",
    protein: "Protein",
    serat_pangan: "Serat Pangan",
    kalium: "Kalium",
    fosfor: "Fosfor",
    natrium: "Natrium",
    tembaga: "Tembaga",
    besi: "Besi",
    seng: "Seng",
    b_karoten: "B-Karoten",
    karoten_total: "Karoten Total",
    air: "Air",
    abu: "Abu",
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    setSelectedFile(file);
    setPrediction('');
    setConfidence(null);
    setNutrition('');
    setTopNutrients([]);
    setError(null);
    
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    handleUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to get prediction");
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setPrediction(result.class_name);
      setConfidence(result.confidence);
      setNutrition(result.nutrition_info);

      const akgValues = Object.entries(result.nutrition_info)
        .map(([key, value]) => ({ name: key, akg: value.akg }))
        .sort((a, b) => b.akg - a.akg)
        .slice(0, 3);

      setTopNutrients(akgValues);

    } catch (err) {
      setError("Error: Prediction failed. Please try again.");
      console.error("Error:", err);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setIsCameraActive(true); // Aktifkan kamera
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setError("Unable to access the camera. Please check permissions.");
    }
  };

  const captureImage = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageUrl = canvas.toDataURL('image/png');
        setPreview(imageUrl);
        
        // Konversi data URL menjadi Blob
        const blob = await fetch(imageUrl).then(res => res.blob());
        const file = new File([blob], "captured-image.png", { type: "image/png" });
        
        // Upload gambar untuk prediksi
        await handleUpload(file);
        
        stopCamera(); // Matikan kamera setelah gambar diambil
    }
};

  const stopCamera = () => {
    const stream = videoRef.current.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop()); // Hentikan semua track
    }
    videoRef.current.srcObject = null;
    setIsCameraActive(false); // Matikan status kamera
  };

  return (
    <div className="container">
      <div className="uploader">
        <div 
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-input-drag"
          />
          <label htmlFor="file-input-drag" className="upload-label">
            <div className="upload-content">
            <span class="upload-icon">📁</span>
              <span>Drag & Drop atau Klik untuk Unggah</span>
            </div>
          </label>
          <p>atau</p>
        </div>

        <button onClick={openCamera} className="camera-button">
          Buka Kamera
        </button>
        
        <video ref={videoRef} style={{ display: isCameraActive ? 'block' : 'none', width: '100%' }}></video>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        
        {isCameraActive && (
          <button onClick={captureImage} className="capture-button mt-4">
            Tangkap Gambar
          </button>
        )}
        
        {preview && (
          <div className="preview mt-4">
            <h2 className="card-section-title" style={{ marginBottom: '0px' }}>Image yang di Pilih</h2>
            <img src={preview} alt="Selected" className="img-fluid rounded" />
            <div className="result-section">
              {prediction && (
                <div className="result-card">
                  <h5 className="card-section-title">Hasil Prediksi:</h5>
                  <p>{prediction}</p>
                </div>
              )}
              {confidence !== null && confidence !== undefined && (
                <div className="result-card">
                  <h5 className="card-section-title">Keyakinan:</h5>
                  <p>{confidence.toFixed(2)}%</p>
                </div>
              )}
            </div>

            <div className="card-section">
            <h2 className="card-section-title">Ringkasan Nilai Gizi</h2>
            <div className="summary-card">
              <div className="nutrition-cards">
                <div className="nutrition-card energy">
                  <div className="icon">⚡</div>
                  <p className="title">Energi</p>
                  <p className="value">
                    {nutrition && nutrition['energi'] ? nutrition['energi'].amount : '--'}
                    <span className="unit">kkal</span>
                  </p>
                </div>
                <div className="nutrition-card protein">
                  <div className="icon">🍖</div>
                  <p className="title">Protein</p>
                  <p className="value">
                    {nutrition && nutrition['protein'] ? nutrition['protein'].amount : '--'}
                    <span className="unit">g</span>
                  </p>
                </div>
                <div className="nutrition-card fat">
                  <div className="icon">🧈</div>
                  <p className="title">Lemak</p>
                  <p className="value">
                    {nutrition && nutrition['lemak_total'] ? nutrition['lemak_total'].amount : '--'}
                    <span className="unit">g</span>
                  </p>
                </div>
                <div className="nutrition-card carbs">
                  <div className="icon">🍚</div>
                  <p className="title">Karbo</p>
                  <p className="value">
                    {nutrition && nutrition['karbohidrat_total'] ? nutrition['karbohidrat_total'].amount : '--'}
                    <span className="unit">g</span>
                  </p>
                </div>
              </div>
            </div>
            </div>

            <div className="card-section">
            <h2 className="card-section-title">Kandungan Nilai Gizi Terbesar</h2>
            <div className="summary-card">
              <div className="nutrition-cards">
                {topNutrients.map((nutrient, index) => (
                  <div className="nutrition-card" key={index}>
                    <p className="title">{nutritionNames[nutrient.name] || nutrient.name}</p>
                    <p className="value">{nutrient.akg}%</p>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {nutrition && (
            <div className="card-section">
            <h2 className="card-section-title">Informasi Nilai Gizi</h2>
              <div className="nutrition-info">
                <h2 className="card-section-title"></h2>
                <table>
                  <thead>
                    <tr>
                      <th>Komponen</th>
                      <th>Jumlah</th>
                      <th>% AKG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desiredOrder.map((key) => (
                      nutrition[key] ? (
                        <tr key={key}>
                          <td>{nutritionNames[key]}</td>
                          <td>
                            {nutrition[key].amount} {nutritionUnits[key] || ''}
                          </td>
                          <td>{nutrition[key].akg}%</td>
                        </tr>
                      ) : null
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="alert alert-danger mt-4">
            <p>{error}</p>
          </div>
        )}
      </div>

      <CardList />
    </div>
  );
}

export default ImageUploader;
