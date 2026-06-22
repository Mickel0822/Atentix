import React, { useRef, useEffect, useState } from 'react';


interface VideoCanvasBlinkProps {
    width?: number;
    height?: number;
    onBlink?: (data: any) => void;
    isActive: boolean;
}

const VideoCanvasBlink: React.FC<VideoCanvasBlinkProps> = ({
    width = 320,
    height = 240,
    onBlink,
    isActive
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Usar el hook WebSocket personalizado (deberás crearlo o asegurarte que existe)
    // Si no existe el hook, implementaremos la lógica básica aquí.
    // Por ahora asumo que necesitamos enviar frames.

    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        if (isActive) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isActive]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width, height }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            // Conectar WS
            const socket = new WebSocket('ws://127.0.0.1:8000/ws/detect/blink');
            socket.onopen = () => console.log('WS Camera Connected');
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (onBlink) onBlink(data);
            };
            setWs(socket);

        } catch (err) {
            console.error("Error accessing camera:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (ws) {
            ws.close();
            setWs(null);
        }
    };

    // Enviar frames periódicamente
    useEffect(() => {
        if (!isActive || !ws || ws.readyState !== WebSocket.OPEN) return;

        const interval = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                const context = canvasRef.current.getContext('2d');
                if (context) {
                    context.drawImage(videoRef.current, 0, 0, width, height);
                    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5);
                    // Remover header "data:image/jpeg;base64,"
                    const data = base64.split(',')[1];
                    ws.send(JSON.stringify({ image: data }));
                }
            }
        }, 200); // 5 FPS aprox para no saturar

        return () => clearInterval(interval);
    }, [isActive, ws]);

    return (
        <div className="relative overflow-hidden rounded-lg bg-black">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                width={width}
                height={height}
                className="transform scale-x-[-1]" // Espejo
            />
            <canvas ref={canvasRef} width={width} height={height} className="hidden" />
        </div>
    );
};

export default VideoCanvasBlink;
