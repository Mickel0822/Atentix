/**
 * Dibuja ejes 3D (RGB) sobre la nariz del usuario para visualizar
 * la orientación de la cabeza.
 * 
 * - Eje X (Rojo): Roll
 * - Eje Y (Verde): Pitch
 * - Eje Z (Azul): Yaw
 */

import React, { useEffect, useRef } from "react";
import type { PoseData } from "@/types/detection";

interface PoseAxis3DProps {
    canvas: HTMLCanvasElement | null;
    pose: PoseData | null;
    nosePosition?: { x: number; y: number };
    axisLength?: number;
}

/**
 * Función utilitaria para dibujar ejes 3D en un canvas.
 * Se puede usar desde fuera del componente React.
 */
export function drawPoseAxis(
    ctx: CanvasRenderingContext2D,
    noseX: number,
    noseY: number,
    pose: PoseData,
    length: number = 60
) {
    // Convertir ángulos de grados a radianes
    const yaw = (pose.yaw * Math.PI) / 180;
    const pitch = (pose.pitch * Math.PI) / 180;
    const roll = (pose.roll * Math.PI) / 180;

    // Calcular direcciones de los ejes basándose en los ángulos
    // Eje X (Roll) - Rojo
    const xEndX = noseX + length * Math.cos(roll) * Math.cos(yaw);
    const xEndY = noseY + length * Math.sin(roll);

    // Eje Y (Pitch) - Verde
    const yEndX = noseX - length * Math.sin(roll) * 0.5;
    const yEndY = noseY - length * Math.cos(pitch);

    // Eje Z (Yaw) - Azul (apunta hacia/desde la cámara)
    const zLength = length * Math.cos(pitch) * 0.7; // Escalar para efecto de profundidad
    const zEndX = noseX + zLength * Math.sin(yaw);
    const zEndY = noseY + zLength * Math.sin(pitch) * 0.5;

    // Estilo común
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    // Eje X - Rojo
    ctx.beginPath();
    ctx.strokeStyle = "#ef4444"; // red-500
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(xEndX, xEndY);
    ctx.stroke();
    drawArrowhead(ctx, noseX, noseY, xEndX, xEndY, "#ef4444");

    // Eje Y - Verde
    ctx.beginPath();
    ctx.strokeStyle = "#22c55e"; // green-500
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(yEndX, yEndY);
    ctx.stroke();
    drawArrowhead(ctx, noseX, noseY, yEndX, yEndY, "#22c55e");

    // Eje Z - Azul
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6"; // blue-500
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(zEndX, zEndY);
    ctx.stroke();
    drawArrowhead(ctx, noseX, noseY, zEndX, zEndY, "#3b82f6");

    // Punto central
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(noseX, noseY, 4, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Dibuja una punta de flecha al final de una línea.
 */
function drawArrowhead(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string
) {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

/**
 * Componente React que renderiza la visualización de pose.
 * Se puede usar como overlay sobre el video.
 */
export function PoseAxis3D({
    canvas,
    pose,
    nosePosition,
    axisLength = 60
}: PoseAxis3DProps) {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const targetCanvas = canvas || internalCanvasRef.current;
        if (!targetCanvas || !pose) return;

        const ctx = targetCanvas.getContext("2d");
        if (!ctx) return;

        // Usar posición proporcionada o centro del canvas
        const noseX = nosePosition?.x ?? targetCanvas.width / 2;
        const noseY = nosePosition?.y ?? targetCanvas.height / 2;

        // Dibujar ejes
        drawPoseAxis(ctx, noseX, noseY, pose, axisLength);
    }, [canvas, pose, nosePosition, axisLength]);

    // Si no se proporciona canvas externo, renderizar uno interno
    if (!canvas) {
        return (
            <canvas
                ref={internalCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
        );
    }

    return null;
}

/**
 * Leyenda de los ejes.
 */
export function PoseAxisLegend() {
    return (
        <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-gray-400">Roll (X)</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-400">Pitch (Y)</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-gray-400">Yaw (Z)</span>
            </div>
        </div>
    );
}
