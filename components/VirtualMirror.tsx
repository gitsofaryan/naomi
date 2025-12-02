'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Webcam from 'react-webcam';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { Loader2, Camera, RefreshCw, Shirt, AlertTriangle, Sparkles, MessageCircle } from 'lucide-react';
import { removeBackground } from "@imgly/background-removal";
import { cn } from '@/lib/utils';

// --- Types ---
type Landmark = { x: number; y: number; z: number; visibility: number };

// --- Constants ---
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const ASPECT_RATIO = VIDEO_WIDTH / VIDEO_HEIGHT;

// --- Helper: Smart Crop ---
async function cropToContent(imageBlob: Blob): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(URL.createObjectURL(imageBlob));

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            let found = false;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
                    if (alpha > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        found = true;
                    }
                }
            }

            if (!found) return resolve(URL.createObjectURL(imageBlob));

            const padding = 20;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(canvas.width, maxX + padding);
            maxY = Math.min(canvas.height, maxY + padding);

            const width = maxX - minX;
            const height = maxY - minY;

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = width;
            cropCanvas.height = height;
            const cropCtx = cropCanvas.getContext('2d');
            if (!cropCtx) return resolve(URL.createObjectURL(imageBlob));

            cropCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
            resolve(cropCanvas.toDataURL());
        };
        img.src = URL.createObjectURL(imageBlob);
    });
}

// --- Helper: Convert to PNG (Sanitize Input) ---
async function convertToPng(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Canvas context failed"));
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Conversion failed"));
            }, 'image/png');
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// --- Interactive Cloth Component ---
function WarpedCloth({ landmarks, clothImage }: { landmarks: Landmark[] | null, clothImage: string | null }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const texture = useLoader(TextureLoader, clothImage || '/placeholder-cloth.png');

    // High-Fidelity Grid: 10x10 vertices (9x9 segments)
    const GRID_X = 10;
    const GRID_Y = 10;
    const TOTAL_POINTS = GRID_X * GRID_Y;

    // Refs for vertex smoothing
    const prevVertices = useRef<THREE.Vector3[]>([]);

    // Initialize prevVertices if empty
    if (prevVertices.current.length === 0) {
        for (let i = 0; i < TOTAL_POINTS; i++) {
            prevVertices.current.push(new THREE.Vector3(0, 0, 0));
        }
    }

    texture.center.set(0.5, 0.5);

    useFrame(() => {
        if (!meshRef.current || !landmarks) {
            if (meshRef.current) meshRef.current.visible = false;
            return;
        }

        // Body Landmarks
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            meshRef.current.visible = false;
            return;
        }
        meshRef.current.visible = true;

        // --- Coordinate Mapping ---
        const visibleHeight = 4.6;
        const visibleWidth = visibleHeight * ASPECT_RATIO;

        const mapToWorld = (l: Landmark) => {
            const wx = (0.5 - l.x) * visibleWidth;
            const wy = -(l.y - 0.5) * visibleHeight;
            return new THREE.Vector3(wx, wy, 0);
        };

        const rawRS = mapToWorld(rightShoulder);
        const rawLS = mapToWorld(leftShoulder);
        const rawRH = mapToWorld(rightHip);
        const rawLH = mapToWorld(leftHip);

        // --- Advanced Grid Calculation (Simulating TPS/Draping) ---

        // 1. Spine & Dimensions
        const shoulderCenter = new THREE.Vector3().addVectors(rawLS, rawRS).multiplyScalar(0.5);
        const hipCenter = new THREE.Vector3().addVectors(rawLH, rawRH).multiplyScalar(0.5);
        const spineVec = new THREE.Vector3().subVectors(hipCenter, shoulderCenter);
        const spineLen = spineVec.length();
        const spineDir = spineVec.clone().normalize();

        const shoulderVec = new THREE.Vector3().subVectors(rawLS, rawRS);
        const shoulderWidth = shoulderVec.length();
        const rightDir = shoulderVec.clone().normalize(); // Points Right (Screen Left -> Right)

        // 2. Vertical Extents (High Neck, Long Hem)
        // NECK UP: 0.25 -> Raised slightly to sit naturally at the collar
        const neckUp = spineLen * 0.25;
        const hemDown = spineLen * 0.25;

        const topCenter = shoulderCenter.clone().sub(spineDir.clone().multiplyScalar(neckUp));
        const bottomCenter = hipCenter.clone().add(spineDir.clone().multiplyScalar(hemDown));
        const fullSpineVec = new THREE.Vector3().subVectors(bottomCenter, topCenter);
        const fullHeight = fullSpineVec.length();

        // 3. Width Profile (Bezier Curve for Sides)

        // EXACT SHOULDER MATCH:
        // Adjusted to 0.38 (Wider) to ensure it covers the shoulders fully
        const topWidth = shoulderWidth / 0.38;

        // TIGHTER WAIST: 0.75 -> Snug fit to "stick" to body
        const waistWidth = topWidth * 0.75;
        const hipWidth = topWidth * 0.95; // Flare out slightly
        const targets: THREE.Vector3[] = [];

        for (let y = 0; y < GRID_Y; y++) {
            const vRatio = y / (GRID_Y - 1); // 0 (Top) to 1 (Bottom)

            // Calculate Center for this row
            const currentCenter = topCenter.clone().add(fullSpineVec.clone().multiplyScalar(vRatio));

            // Calculate Width for this row using Bezier interpolation

            let currentRowWidth;
            if (vRatio < 0.5) {
                const t = vRatio * 2; // 0 to 1
                currentRowWidth = topWidth * (1 - t) + waistWidth * t;
            } else {
                const t = (vRatio - 0.5) * 2; // 0 to 1
                currentRowWidth = waistWidth * (1 - t) + hipWidth * t;
            }

            const currentHalfWidth = currentRowWidth * 0.5;

            for (let x = 0; x < GRID_X; x++) {
                const uRatio = x / (GRID_X - 1); // 0 (Right Edge) to 1 (Left Edge)

                // Horizontal Offset
                const xOffset = (uRatio - 0.5) * 2 * currentHalfWidth;

                // Base Position
                const pos = currentCenter.clone().add(rightDir.clone().multiplyScalar(xOffset));

                // --- 3D "Embedding" (Z-Axis Wrapping) ---
                // Simulate a cylinder/ellipsoid wrap around the body.
                // Center (uRatio 0.5) is closest to camera (Z=0 or slightly +).
                // Sides (uRatio 0 or 1) curve back (Z negative).

                // Normalized horizontal distance from center (-1 to 1)
                const hDist = (uRatio - 0.5) * 2;

                // Parabolic curve: Z = -k * x^2
                // "Stick" factor: How much it wraps.
                const wrapDepth = 0.8; // STRONG EMBEDDING (0.8)
                const zOffset = -Math.pow(hDist, 2) * wrapDepth;

                pos.z += zOffset;

                targets.push(pos);
            }
        }

        // --- Smoothing & Update ---
        const smoothFactor = 0.3;
        const positions = meshRef.current.geometry.attributes.position;

        // We need to map our 1D targets array to the PlaneGeometry vertex order
        // PlaneGeometry (w, h, wSeg, hSeg)
        // Vertices: (wSeg+1) * (hSeg+1)
        // Order: Row by row, Left to Right (x increasing)
        // Our targets: Row by row, Right to Left (x loop 0..9, where 0 is Right)
        // So we need to reverse the X index when mapping to geometry

        for (let i = 0; i < TOTAL_POINTS; i++) {
            prevVertices.current[i].lerp(targets[i], smoothFactor);

            // Calculate Grid Coords
            const y = Math.floor(i / GRID_X);
            const x = i % GRID_X;

            // Geometry Index: Row y, Column (GRID_X - 1 - x)
            const geomIndex = y * GRID_X + (GRID_X - 1 - x);

            positions.setXYZ(geomIndex, prevVertices.current[i].x, prevVertices.current[i].y, 0);
        }

        positions.needsUpdate = true;
    });

    if (!clothImage) return null;

    return (
        <group>
            <mesh ref={meshRef}>
                {/* 9x9 Segments = 10x10 Vertices */}
                <planeGeometry args={[1, 1, 9, 9]} />
                <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} opacity={1} />
            </mesh>
        </group>
    );
}

// --- Main Component ---
export default function VirtualMirror() {
    console.log("VirtualMirror v14.1 (Syntax Fixed) Loaded");
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);
    const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingCloth, setIsProcessingCloth] = useState(false);
    const [clothImage, setClothImage] = useState<string | null>(null);

    // AI Analysis State
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [hasCaptured, setHasCaptured] = useState(false);

    // Load MediaPipe
    useEffect(() => {
        const loadLandmarker = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );
            const landmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numPoses: 1,
                minPoseDetectionConfidence: 0.6,
                minPosePresenceConfidence: 0.6,
                minTrackingConfidence: 0.6
            });
            setLandmarker(landmarker);
            setIsLoading(false);
        };
        loadLandmarker();
    }, []);

    // Detection Loop
    useEffect(() => {
        let animationFrameId: number;

        const detect = () => {
            if (webcamRef.current && webcamRef.current.video && landmarker) {
                const video = webcamRef.current.video;
                if (video.readyState === 4) {
                    const startTimeMs = performance.now();
                    const result = landmarker.detectForVideo(video, startTimeMs);

                    if (result.landmarks && result.landmarks.length > 0) {
                        setLandmarks(result.landmarks[0] as Landmark[]);

                        // Debug Drawing (Only if NOT capturing)
                        if (canvasRef.current && !isCapturing) {
                            const ctx = canvasRef.current.getContext('2d');
                            if (ctx) {
                                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                ctx.save();
                                ctx.scale(-1, 1);
                                ctx.translate(-canvasRef.current.width, 0);
                                const drawingUtils = new DrawingUtils(ctx);
                                drawingUtils.drawLandmarks(result.landmarks[0], {
                                    radius: 4,
                                    color: "rgba(255, 255, 255, 0.8)" // WHITE Landmarks
                                });
                                drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
                                    color: "rgba(255, 255, 255, 0.5)", // WHITE Connections
                                    lineWidth: 4
                                });
                                ctx.restore();
                            }
                        }
                    } else {
                        setLandmarks(null);
                        if (canvasRef.current) {
                            const ctx = canvasRef.current.getContext('2d');
                            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(detect);
        };

        detect();
        return () => cancelAnimationFrame(animationFrameId);
    }, [landmarker, isCapturing]);

    // --- Auto-Capture Logic ---
    useEffect(() => {
        // Start countdown if:
        // 1. Cloth is loaded
        // 2. Body is detected
        // 3. Not already captured
        // 4. Not currently counting down
        // 5. Not currently capturing
        if (clothImage && landmarks && !hasCaptured && countdown === null && !isCapturing) {
            setCountdown(3);
        }
    }, [clothImage, landmarks, hasCaptured, countdown, isCapturing]);

    useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            // Trigger Capture
            setCountdown(null);
            handleCapture();
        }
    }, [countdown]);

    const handleCapture = async () => {
        setIsCapturing(true);

        // Wait a brief moment for UI to clear (hide landmarks)
        await new Promise(r => setTimeout(r, 100));

        if (webcamRef.current && webcamRef.current.video) {
            const video = webcamRef.current.video;

            // Create a temporary canvas to combine Video + Three.js
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = VIDEO_WIDTH;
            tempCanvas.height = VIDEO_HEIGHT;
            const ctx = tempCanvas.getContext('2d');

            if (ctx) {
                // 1. Draw Video (Mirrored)
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-VIDEO_WIDTH, 0);
                ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
                ctx.restore();

                // 2. Draw Three.js Canvas (Cloth)
                // We need to find the Three.js canvas in the DOM
                // Note: R3F wraps the canvas in a div, so we select the canvas inside our specific class
                const threeCanvas = document.querySelector('.three-canvas-root canvas');
                if (threeCanvas) {
                    ctx.drawImage(threeCanvas as HTMLCanvasElement, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
                }

                // 3. Get Data URL
                const dataUrl = tempCanvas.toDataURL('image/png');
                setCapturedImage(dataUrl);
                setHasCaptured(true);
                setShowChat(true);

                // 4. Analyze
                analyzeFit(dataUrl);
            }
        }
        setIsCapturing(false);
    };

    const analyzeFit = async (imageUrl: string) => {
        try {
            setAiResponse("Analyzing your fit...");
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: "text", text: "How does this look on me? Be honest!" },
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ]
                })
            });
            const data = await response.json();
            if (data.error) {
                setAiResponse(`⚠️ ${data.error}`);
            } else {
                setAiResponse(data.content);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            setAiResponse("Oops! My vision is blurry. Try again?");
        }
    };

    // Handle Cloth Upload with Smart Crop
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsProcessingCloth(true);
            setHasCaptured(false); // Reset capture state
            setShowChat(false);
            setAiResponse(null);

            const file = e.target.files[0];
            try {
                // 1. Sanitize: Convert to PNG first (fixes AVIF/HEIC issues)
                const pngBlob = await convertToPng(file);

                // 2. Remove Background
                const bgRemovedBlob = await removeBackground(pngBlob);

                // 3. Smart Crop
                const croppedUrl = await cropToContent(bgRemovedBlob);
                setClothImage(croppedUrl);
            } catch (error) {
                console.error("Processing failed:", error);
                // Fallback: Try to show original if possible
                setClothImage(URL.createObjectURL(file));
            } finally {
                setIsProcessingCloth(false);
            }
        }
    };

    return (
        <div className="relative h-full w-full bg-black overflow-hidden">
            <Webcam
                ref={webcamRef}
                className="absolute inset-0 w-full h-full object-cover mirror-x"
                mirrored
                videoConstraints={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, facingMode: "user" }}
            />
            <canvas
                ref={canvasRef}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-30"
            />
            <div className="absolute inset-0 z-10 pointer-events-none">
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 50 }}
                    className="three-canvas-root"
                    gl={{ preserveDrawingBuffer: true }}
                >
                    <ambientLight intensity={1} />
                    <Suspense fallback={null}>
                        {clothImage && <WarpedCloth landmarks={landmarks} clothImage={clothImage} />}
                    </Suspense>
                </Canvas>
            </div>

            {/* Controls */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                <label className={cn(
                    "glass px-4 py-2 rounded-full cursor-pointer flex items-center gap-2 hover:bg-white/10 transition",
                    isProcessingCloth && "opacity-50 cursor-not-allowed"
                )}>
                    {isProcessingCloth ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Shirt className="w-5 h-5" />}
                    <span className="text-sm font-medium">
                        {isProcessingCloth ? "Processing..." : "Upload Cloth"}
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={isProcessingCloth}
                    />
                </label>

                <div className={cn(
                    "glass px-3 py-1 rounded-lg text-xs flex items-center gap-2 transition-colors duration-300",
                    landmarks ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                )}>
                    {landmarks ? "Body Detected" : <><AlertTriangle className="w-3 h-3" /> No Body Detected</>}
                </div>
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="text-9xl font-bold text-white animate-pulse">
                        {countdown}
                    </div>
                </div>
            )}

            {/* AI Chat Overlay */}
            {showChat && (
                <div className="absolute inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in slide-in-from-bottom-10">
                    <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center gap-6">
                        {capturedImage && (
                            <div className="relative w-64 h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl rotate-3">
                                <img src={capturedImage} alt="Captured Fit" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="max-w-md w-full glass p-6 rounded-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Naomi AI</h3>
                                    <p className="text-xs text-purple-300">Fashion Stylist</p>
                                </div>
                            </div>
                            <div className="text-gray-200 text-lg leading-relaxed">
                                {aiResponse ? (
                                    aiResponse
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Analyzing your fit...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/10 flex justify-center gap-4">
                        <button
                            onClick={() => {
                                setShowChat(false);
                                setHasCaptured(false);
                                setTimeout(() => fileInputRef.current?.click(), 100);
                            }}
                            className="px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition"
                        >
                            Try Another
                        </button>
                        <button
                            onClick={() => analyzeFit(capturedImage!)}
                            className="px-6 py-3 rounded-full glass hover:bg-white/10 transition flex items-center gap-2"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Ask Again
                        </button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-gray-400">Initializing Advanced Vision Engine...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
