import { useEffect, useRef, useState } from "react";
import { Render, IdleAnimation, WalkingAnimation } from "skin3d";
import { Button } from "@/components/ui/button";
import { Footprints, Pause, RotateCw } from "lucide-react";

interface SkinViewer3DProps {
  skinUrl: string | null;
  model: "classic" | "slim";
  width?: number;
  height?: number;
}

/**
 * Creates a simple 64x64 fallback Steve-colored PNG data URL when no custom skin is set,
 * so the 3D viewer always shows a clean interactive player model.
 */
function createDefaultSkinDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Base transparent
  ctx.clearRect(0, 0, 64, 64);

  // Head (skin tone + hair + simple eyes)
  ctx.fillStyle = "#c6906b";
  ctx.fillRect(0, 0, 32, 16);
  ctx.fillStyle = "#3b2719"; // hair top/back/sides
  ctx.fillRect(8, 0, 8, 8);
  ctx.fillRect(0, 8, 8, 3);
  ctx.fillRect(16, 8, 16, 3);
  ctx.fillRect(8, 8, 8, 2);
  // Eyes
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(9, 11, 2, 1);
  ctx.fillRect(13, 11, 2, 1);
  ctx.fillStyle = "#3b5998";
  ctx.fillRect(10, 11, 1, 1);
  ctx.fillRect(13, 11, 1, 1);

  // Torso (red/orange REDSOUTH shirt)
  ctx.fillStyle = "#d9381e";
  ctx.fillRect(16, 16, 24, 16);

  // Right Arm & Left Arm (shirt sleeves + skin hands)
  ctx.fillStyle = "#d9381e";
  ctx.fillRect(40, 16, 16, 8);
  ctx.fillRect(32, 48, 16, 8);
  ctx.fillStyle = "#c6906b";
  ctx.fillRect(40, 24, 16, 8);
  ctx.fillRect(32, 56, 16, 8);

  // Right Leg & Left Leg (dark jeans + shoes)
  ctx.fillStyle = "#2b303a";
  ctx.fillRect(0, 16, 16, 12);
  ctx.fillRect(16, 48, 16, 12);
  ctx.fillStyle = "#1a1c22";
  ctx.fillRect(0, 28, 16, 4);
  ctx.fillRect(16, 60, 16, 4);

  return canvas.toDataURL("image/png");
}

export function SkinViewer3D({
  skinUrl,
  model,
  width = 240,
  height = 320,
}: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<Render | null>(null);
  const [animMode, setAnimMode] = useState<"idle" | "walk" | "paused">("idle");
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewer = new Render({
      canvas,
      width,
      height,
      pixelRatio: "match-device",
    });

    viewer.fov = 45;
    viewer.zoom = 0.9;
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.6;
    viewer.animation = new IdleAnimation();
    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const textureSource = skinUrl || createDefaultSkinDataUrl();
    if (!textureSource) return;

    viewer
      .loadSkin(textureSource, {
        model: model === "slim" ? "slim" : "default",
      })
      .catch((err) => {
        console.warn("Failed to load 3D skin texture:", err);
      });
  }, [skinUrl, model]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (animMode === "idle") {
      viewer.animation = new IdleAnimation();
    } else if (animMode === "walk") {
      viewer.animation = new WalkingAnimation();
    } else {
      viewer.animation = null;
    }
  }, [animMode]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.autoRotate = autoRotate;
  }, [autoRotate]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-muted/60 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          className="cursor-grab active:cursor-grabbing block"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant={animMode === "idle" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAnimMode("idle")}
          className="h-7 px-2.5 text-xs"
        >
          Idle
        </Button>
        <Button
          type="button"
          variant={animMode === "walk" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAnimMode("walk")}
          className="h-7 px-2.5 text-xs gap-1"
        >
          <Footprints className="h-3 w-3" />
          Walk
        </Button>
        <Button
          type="button"
          variant={animMode === "paused" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAnimMode("paused")}
          className="h-7 px-2.5 text-xs gap-1"
        >
          <Pause className="h-3 w-3" />
          Pause
        </Button>
        <Button
          type="button"
          variant={autoRotate ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAutoRotate((v) => !v)}
          className="h-7 px-2.5 text-xs gap-1"
          title="Toggle auto-rotate"
        >
          <RotateCw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
