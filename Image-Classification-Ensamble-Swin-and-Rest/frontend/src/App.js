import React from 'react';
import './App.css';
import ImageUploader from './ImageUploader';
import './ImageUploader.css';

function App() {
    return (
        <div className="container mt-5">
            <div className="text-center">
                <h1 className="title">Image Classification App</h1>
                <ImageUploader />
            </div>
        </div>
    );
}

export default App;
