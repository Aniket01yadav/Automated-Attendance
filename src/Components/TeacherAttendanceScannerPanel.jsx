import React, { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import axios from "axios";
import toast from "react-hot-toast";
import StatusBadge from "./StatusBadge";

const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

const TeacherAttendanceScannerPanel = ({ token, teachers, onAttendanceMarked }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lockRef = useRef(false);
  const scanCooldownRef = useRef(null);
  const hideFeedbackRef = useRef(null);
  const clearFeedbackRef = useRef(null);

  const [modelsLoading, setModelsLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCooldownSeconds, setScanCooldownSeconds] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const teachersWithFace = (teachers || []).filter(
    (t) => Array.isArray(t.faceDescriptor) && t.faceDescriptor.length > 0
  );

  const showFeedback = useCallback((payload) => {
    if (hideFeedbackRef.current) clearTimeout(hideFeedbackRef.current);
    if (clearFeedbackRef.current) clearTimeout(clearFeedbackRef.current);

    setLastResult(payload);
    setFeedbackVisible(true);

    hideFeedbackRef.current = setTimeout(() => {
      setFeedbackVisible(false);
    }, 2600);

    clearFeedbackRef.current = setTimeout(() => {
      setLastResult(null);
    }, 3200);
  }, []);

  const startScanCooldown = useCallback((seconds = 5) => {
    if (scanCooldownRef.current) {
      clearInterval(scanCooldownRef.current);
    }

    setScanCooldownSeconds(seconds);

    scanCooldownRef.current = setInterval(() => {
      setScanCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(scanCooldownRef.current);
          scanCooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    setCameraActive(true);
  }, []);

  const detectFaceWithRetries = useCallback(async (maxAttempts = 8) => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!videoRef.current) break;

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) return detection;

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await faceapi.tf.setBackend("webgl");
        await faceapi.tf.ready();

        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        if (!mounted) return;
        setModelsLoading(false);
      } catch {
        toast.error("Scanner models failed to initialize");
      }
    };

    init();

    return () => {
      mounted = false;
      if (scanCooldownRef.current) clearInterval(scanCooldownRef.current);
      if (hideFeedbackRef.current) clearTimeout(hideFeedbackRef.current);
      if (clearFeedbackRef.current) clearTimeout(clearFeedbackRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  const markAttendanceForTeacher = useCallback(async (teacher) => {
    try {
      const res = await axios.post(
        "https://inclass-dnhc.onrender.com/api/teacher-attendance/scan",
        { teacherId: teacher._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = {
        teacherName: res.data.teacher?.fullName || teacher.fullName,
        action: res.data.action,
        status: res.data.attendance?.status || "Absent",
        message: res.data.message,
        level: "success",
      };

      showFeedback(result);
      startScanCooldown(5);
      if (onAttendanceMarked) onAttendanceMarked();

      toast.success(`${teacher.fullName}: ${res.data.message}`);
    } catch (err) {
      const payload = err.response?.data || {};
      const msg =
        payload.message ||
        payload.error ||
        "Attendance mark failed";

      if (payload.action === "CHECK_OUT_BLOCKED") {
        showFeedback({
          teacherName: payload.teacher?.fullName || teacher.fullName,
          action: "CHECK_OUT_BLOCKED",
          status: payload.attendance?.status || "Late",
          message: msg,
          level: "warning",
        });
      }

      toast.error(msg);
    }
  }, [onAttendanceMarked, showFeedback, startScanCooldown, token]);

  const scanNow = useCallback(async () => {
    if (
      lockRef.current ||
      modelsLoading ||
      teachersWithFace.length === 0 ||
      scanCooldownSeconds > 0 ||
      isScanning
    ) {
      return;
    }

    try {
      lockRef.current = true;
      setIsScanning(true);
      await startCamera();

      const detection = await detectFaceWithRetries();

      if (!detection) {
        toast.error("No face detected. Please try again.");
        return;
      }

      const query = Array.from(detection.descriptor);
      let bestTeacher = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const teacher of teachersWithFace) {
        const distance = euclideanDistance(query, teacher.faceDescriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTeacher = teacher;
        }
      }

      if (!bestTeacher || bestDistance > 0.55) return;

      await markAttendanceForTeacher(bestTeacher);
    } finally {
      stopCamera();
      setIsScanning(false);
      lockRef.current = false;
    }
  }, [
    detectFaceWithRetries,
    isScanning,
    markAttendanceForTeacher,
    modelsLoading,
    scanCooldownSeconds,
    startCamera,
    stopCamera,
    teachersWithFace,
  ]);

  const scanLabelMap = {
    CHECK_IN: "Check-In",
    CHECK_OUT: "Check-Out",
    ON_LEAVE: "Leave",
    ALREADY_COMPLETED: "Already Completed",
    CHECK_OUT_BLOCKED: "Check-Out Blocked",
  };

  const feedbackToneMap = {
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const feedbackTone = feedbackToneMap[lastResult?.level || "info"];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-4">
      <h3 className="text-xl font-semibold text-gray-800">Teacher Face Scanner</h3>
      <p className="text-sm text-gray-500 mb-4">
        Use principal/admin device to mark check-in and check-out.
      </p>

      <div className="w-full max-w-[500px] mx-auto">
        <video
          ref={videoRef}
          autoPlay={cameraActive}
          muted
          playsInline
          className="w-full rounded-xl border-2 border-slate-300 shadow-sm bg-slate-900"
        />
        {!cameraActive && (
          <div className="mt-2 text-center text-sm text-gray-500">
            Camera is off. Click "Scan Now" to start.
          </div>
        )}
      </div>

      {modelsLoading && <p className="text-sm text-gray-500 mt-2 text-center">Loading scanner models...</p>}
      {!modelsLoading && teachersWithFace.length === 0 && (
        <p className="text-sm text-red-500 mt-2 text-center">
          No teacher face profiles found. Register teacher faces first.
        </p>
      )}
      {scanCooldownSeconds > 0 && (
        <p className="text-sm text-amber-600 mt-2 text-center font-medium">
          Scanner paused for {scanCooldownSeconds}s
        </p>
      )}

      <div className="w-full max-w-[500px] mx-auto">
        <button
          onClick={scanNow}
          disabled={modelsLoading || scanCooldownSeconds > 0 || isScanning}
          className="mt-4 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60"
        >
          {isScanning
            ? "Scanning..."
            : scanCooldownSeconds > 0
              ? `Wait ${scanCooldownSeconds}s`
              : "Scan Now"}
        </button>
      </div>

      {lastResult && (
        <div
          className={`mt-4 w-full max-w-[500px] mx-auto p-3 rounded-lg border transition-all duration-300 ${feedbackTone} ${feedbackVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">Scan Result</p>
          <p className="font-semibold mt-1">{lastResult.teacherName}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-white/70 border border-white/80">
              {scanLabelMap[lastResult.action] || "Updated"}
            </span>
            <StatusBadge status={lastResult.status} />
          </div>
          <p className="text-xs mt-2">{lastResult.message}</p>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendanceScannerPanel;
