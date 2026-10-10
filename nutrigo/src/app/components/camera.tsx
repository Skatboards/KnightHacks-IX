import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const WebcamComponent = () => {
  const webcamRef = useRef<Webcam | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // Optional configuration constraints (forces front camera on mobile)
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
  };

  const captureSnapshot = () => {
      const imageSrc = webcamRef.current?.getScreenshot();

      if (imageSrc) {
          setImgSrc(imageSrc);
      }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2>Webcam Live Feed</h2>
      
      <Webcam
        audio={false} // Set to true if you need microphone audio
        height={360}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={640}
        videoConstraints={videoConstraints}
      />
      
      <button onClick={captureSnapshot} style={{ margin: "10px", padding: "10px" }}>
        Take Photo
      </button>

      {imgSrc && (
        <div>
          <h3>Captured Preview:</h3>
          <img src={imgSrc} alt="webcam snapshot" />
        </div>
      )}
    </div>
  );
};

export default WebcamComponent;
