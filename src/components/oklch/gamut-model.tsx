/* oxlint-disable unicorn/require-post-message-target-origin */
import { useEffect, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  ColorManagement,
  DoubleSide,
  Float32BufferAttribute,
  LinearSRGBColorSpace,
  Mesh as ThreeMesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { translate } from "../../i18n/messages";
import type { Mesh } from "../../utils/gamut";
import { chromaMax, lightnessMax, toColor } from "../../utils/oklch";
import type { PickerColor } from "../../utils/oklch";
import type { Language } from "../../utils/preferences";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  value: PickerColor;
  p3: boolean;
  rec2020: boolean;
  language: Language;
}
ColorManagement.enabled = false;

const ModelCanvas = ({
  value,
  meshes,
  language,
  large = false,
}: {
  value: PickerColor;
  meshes: Mesh[];
  language: Language;
  large?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const source = meshes.at(-1);
    if (!canvas || !source) {
      return;
    }
    const scene = new Scene();
    const camera = new PerspectiveCamera(48, 1, 0.01, 20);
    camera.position.set(0.72, 0.18, 0.78);
    camera.lookAt(0, 0, 0);
    const renderer = new WebGLRenderer({ alpha: true, antialias: true, canvas });
    renderer.outputColorSpace = LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.minDistance = 0.65;
    controls.maxDistance = 4;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(source.positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(source.colors, 3));
    geometry.setIndex(new BufferAttribute(source.indices, 1));
    geometry.computeVertexNormals();
    const material = new MeshBasicMaterial({ side: DoubleSide, vertexColors: true });
    scene.add(new ThreeMesh(geometry, material));
    const markerGeometry = new SphereGeometry(0.018, 24, 16);
    const markerMaterial = new MeshBasicMaterial({ color: 0xff_ff_ff });
    const marker = new ThreeMesh(markerGeometry, markerMaterial);
    scene.add(marker);
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    let frame = 0;
    const render = () => {
      const { current } = valueRef;
      marker.position.set(
        current.l / lightnessMax(current.mode) - 0.5,
        current.c / (chromaMax(current.mode, true) * 2) - 0.25,
        current.h / 360 - 0.5,
      );
      const rgb = toColor(current).to("srgb").toGamut({ method: "clip" });
      markerMaterial.color.setRGB(rgb.coords[0] ?? 0, rgb.coords[1] ?? 0, rgb.coords[2] ?? 0);
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      renderer.dispose();
    };
  }, [meshes]);
  return (
    <div className="ok-model-content">
      <canvas
        className={large ? "ok-model-canvas is-large" : "ok-model-canvas"}
        ref={canvasRef}
        // A canvas is the accessible image produced by the WebGL renderer.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label={`${value.mode.toUpperCase()} ${translate(language, "modelAria")}`}
      />
      <p className="ok-muted">{translate(language, "modelHelp")}</p>
    </div>
  );
};

const GamutModel = ({ value, p3, rec2020, language }: Props) => {
  const [meshes, setMeshes] = useState<Mesh[]>([]);
  const [error, setError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const worker = new Worker(new URL("gamut.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event) => setMeshes(event.data.meshes));
    worker.addEventListener("error", () => setError(true));
    worker.postMessage({
      gamuts: ["srgb", ...(p3 ? ["p3"] : []), ...(rec2020 ? ["rec2020"] : [])],
      id: 0,
      mode: value.mode,
      type: "mesh",
    });
    return () => worker.terminate();
  }, [value.mode, p3, rec2020]);
  return (
    <Card className="ok-card ok-model">
      <div className="ok-card-heading">
        <h2>3D {translate(language, "model")}</h2>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => dialogRef.current?.showModal()}
        >
          {translate(language, "enlarge")}
        </Button>
      </div>
      {meshes.length === 0 ? (
        <output>
          {error ? translate(language, "modelError") : translate(language, "modelLoading")}
        </output>
      ) : (
        <ModelCanvas value={value} meshes={meshes} language={language} />
      )}
      <dialog ref={dialogRef} className="ok-model-dialog" aria-labelledby="model-title">
        <div className="ok-card-heading">
          <h2 id="model-title">
            {value.mode.toUpperCase()} 3D {translate(language, "model")}
          </h2>
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            {translate(language, "close")}
          </Button>
        </div>
        <ModelCanvas value={value} meshes={meshes} language={language} large />
      </dialog>
    </Card>
  );
};

export default GamutModel;
