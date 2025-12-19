import React, { useRef, useState, useEffect } from "react";
import { MdCameraswitch } from "react-icons/md";


export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startStream(mode = facingMode) {
    try {
      stopStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });


      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setActive(true);
    } catch {
      alert("Camera permission denied or unavailable.");
    }
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);

        setPreviewUrl(url);
        onCapture(blob);
        stopStream();
      },
      "image/jpeg",
      0.85
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    startStream();
  }

  function switchCamera() {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startStream(newMode);
  }

  return (
    <div className="w-full rounded-xl border bg-gray-50 overflow-hidden">
      {/* RATIO LOCK — 1:1 */}
      <div className="relative w-full pt-[100%]">

        {/* CONTENT */}
        <div
          className="absolute inset-0 bg-black cursor-pointer"
          onClick={() => {
            if (!previewUrl && !active) startStream();
          }}
        >
          {/* IMAGE / VIDEO */}
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              className={`w-full h-full object-cover ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />
          )}

          {/* CLICK HINT TEXT */}
          {!previewUrl && !active && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                Tap to capture photo
              </span>
            </div>
          )}
        </div>

        {/* CAPTURE BUTTON */}
        {active && (
          <button
            type="button"
            onClick={takePhoto}
            className="absolute bottom-3 left-1/2 -translate-x-1/2
                       bg-[#0B8A42] text-white text-sm px-5 py-2
                       rounded-full shadow"
          >
            Capture
          </button>
        )}

        {/* SWITCH CAMERA */}
        {active && !previewUrl && (
          <button
            type="button"
            onClick={switchCamera}
            className="absolute top-2 left-2 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center shadow" aria-label="Switch camera"
          >
            <MdCameraswitch size={20} />
          </button>
        )}

        {/* RETAKE BUTTON */}
        {previewUrl && (
          <button
            type="button"
            onClick={retake}
            className="absolute top-2 right-2
                       bg-black/60 text-white text-xs
                       px-3 py-1 rounded-full"
          >
            Retake
          </button>
        )}
      </div>
    </div>
  );
}
