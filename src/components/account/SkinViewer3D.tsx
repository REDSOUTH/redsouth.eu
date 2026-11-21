import { useEffect, useRef, useState } from "react";
import { Render, IdleAnimation, WalkingAnimation } from "skin3d";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw, Play, Pause, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEFAULT_STEVE_SKIN_URL = "/steve.png";

interface SkinViewer3DProps {
  skinUrl?: string | null;
  model?: "classic" | "slim";
  capeUrl?: string | null;
  className?: string;
}

export function SkinViewer3D({
  skinUrl,
  model = "classic",
  capeUrl,
  className,
}: SkinViewer3DProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Render | null>(null);
  const [animMode, setAnimMode] = useState<"idle" | "walk" | "none">("idle");
  const [autoRotate, setAutoRotate] = useState(false);

  // Initialize skin3d Render instance
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.max(container.clientWidth, 240);
    const height = Math.max(container.clientHeight, 320);

    const viewer = new Render({
      canvas,
      width,
      height,
      skin: skinUrl || DEFAULT_STEVE_SKIN_URL,
      model: model === "slim" ? "slim" : "default",
      cape: capeUrl || undefined,
      zoom: 0.9,
      fov: 45,
      enableRotation: true,
      allowZoom: true,
    });

    viewer.controls.enablePan = false;
    viewer.animation = new IdleAnimation();
    viewer.autoRotate = false;
    viewer.autoRotateSpeed = 0.6;
    viewerRef.current = viewer;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) {
          viewer.setSize(w, h);
        }
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update skin & model
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const src = skinUrl || DEFAULT_STEVE_SKIN_URL;
    const targetModel = model === "slim" ? "slim" : "default";
    Promise.resolve(viewer.loadSkin(src, { model: targetModel })).catch((err) => {
      console.warn("[SkinViewer3D] Failed to load skin, falling back to Steve:", err);
      if (src !== DEFAULT_STEVE_SKIN_URL) {
        Promise.resolve(
          viewer.loadSkin(DEFAULT_STEVE_SKIN_URL, { model: targetModel })
        ).catch(() => {});
      }
    });
  }, [skinUrl, model]);

  // Update cape
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (capeUrl) {
      Promise.resolve(viewer.loadCape(capeUrl)).catch((err) => {
        console.warn("[SkinViewer3D] Failed to load cape:", err);
      });
    } else {
      viewer.resetCape();
    }
  }, [capeUrl]);

  // Update animation mode
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

  // Update autoRotate
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.autoRotate = autoRotate;
  }, [autoRotate]);

  const handleResetCamera = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.zoom = 0.9;
    viewer.controls.target.set(0, 0, 0);
    viewer.resetCameraPose();
    viewer.controls.update();
  };

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          "relative w-full h-full min-h-[340px] rounded-lg border border-border bg-gradient-to-b from-card/25 via-card/10 to-background/40 overflow-hidden select-none",
          className
        )}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* Bottom viewer controls */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-md border border-border/60 bg-background/80 backdrop-blur-md shadow-sm">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-xs"
                variant={animMode === "idle" ? "secondary" : "ghost"}
                className="cursor-pointer"
                onClick={() => setAnimMode("idle")}
              >
                <Play className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("account.skin_anim_idle", "Idle animation")}</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-xs"
                variant={animMode === "walk" ? "secondary" : "ghost"}
                className="cursor-pointer"
                onClick={() => setAnimMode("walk")}
              >
                <Footprints className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("account.skin_anim_walk", "Walking animation")}</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-xs"
                variant={animMode === "none" ? "secondary" : "ghost"}
                className="cursor-pointer"
                onClick={() => setAnimMode("none")}
              >
                <Pause className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("account.skin_anim_pause", "Pause animation")}</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="xs"
                variant={autoRotate ? "secondary" : "ghost"}
                className="cursor-pointer text-[11px] px-2 h-6"
                onClick={() => setAutoRotate((v) => !v)}
              >
                360°
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("account.skin_auto_rotate", "Toggle auto-rotate")}</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="cursor-pointer"
                onClick={handleResetCamera}
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("account.skin_reset_camera", "Reset camera")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
