import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import axios from "axios";
import toast from "react-hot-toast";

const TeacherFaceCaptureModal = ({ teacher, token, onClose, onSuccess }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        await faceapi.tf.setBackend("webgl");
        await faceapi.tf.ready();

        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (!active) return;

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setLoading(false);
      } catch {
        toast.error("Unable to start face capture");
      }
    };

    init();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    try {
      setCapturing(true);

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("No face detected. Try again.");
        setCapturing(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      await axios.put(
        `https://inclass-dnhc.onrender.com/api/teacher-attendance/face/${teacher._id}`,
        { descriptor },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Face registered for ${teacher.fullName}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || "Face registration failed";
      toast.error(msg);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md">
        <h3 className="text-xl font-semibold text-gray-800">Register Teacher Face</h3>
        <p className="text-sm text-gray-500 mb-4">{teacher.fullName}</p>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg border border-gray-200"
        />

        {loading && <p className="text-sm text-gray-500 mt-2">Starting camera...</p>}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={handleCapture}
            disabled={loading || capturing}
            className="bg-green-600 text-white py-2 rounded-lg font-semibold disabled:opacity-60"
          >
            {capturing ? "Capturing..." : "Capture"}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherFaceCaptureModal;
