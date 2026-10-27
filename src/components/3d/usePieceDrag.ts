import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Plane, Vector2, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { gsap } from "gsap";
import type { Square } from "chess.js";
import {
  BOARD_SURFACE_Y,
  coordToSquare,
  squareToCoord,
} from "@/engine/boardMath";
import { useGameInteraction } from "@/engine/useGameInteraction";
import type { PieceColor, PieceType } from "./ChessPiece";

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 6;
/** How far the piece floats above its tile while held. */
const DRAG_LIFT = 0.3;
const RETURN_DURATION = 0.16;

export type DragVisual = {
  from: string;
  color: PieceColor;
  type: PieceType;
  /** Mutated every frame by the drag hook; read by the overlay in PieceManager. */
  positionRef: MutableRefObject<{ x: number; z: number; lift: number }>;
};

type UsePieceDragOptions = {
  /** Analysis mode turns the board read-only. */
  enabled: boolean;
  boardFlipped: boolean;
  /** Orbit is paused as soon as a piece is pressed, so the camera cannot drift. */
  orbitRef: RefObject<OrbitControlsImpl | null>;
};

type DragPosition = { x: number; z: number };

export function usePieceDrag({
  enabled,
  boardFlipped,
  orbitRef,
}: UsePieceDragOptions) {
  const { camera, gl, raycaster } = useThree();
  const {
    chess,
    metrics,
    selectedSquare,
    selectSquare,
    setDragging,
    setHovered,
    dropOnSquare,
  } = useGameInteraction();

  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [suppressMoveAnimation, setSuppress] = useState(false);

  const positionRef = useRef({ x: 0, z: 0, lift: 0 });
  const gestureRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const plane = useMemo(
    () => new Plane(new Vector3(0, 1, 0), -BOARD_SURFACE_Y),
    [],
  );
  const ndc = useMemo(() => new Vector2(), []);
  const hit = useMemo(() => new Vector3(), []);

  const setControlsEnabled = useCallback(
    (value: boolean) => {
      if (orbitRef.current) orbitRef.current.enabled = value;
    },
    [orbitRef],
  );

  // Raycast the pointer onto the board plane. The result is converted back into
  // the board group's local space so the overlay renders correctly when the
  // whole board is rotated for the flipped view.
  const pointerToBoard = useCallback(
    (clientX: number, clientY: number): DragPosition | null => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return {
        x: boardFlipped ? -hit.x : hit.x,
        z: boardFlipped ? -hit.z : hit.z,
      };
    },
    [gl, camera, raycaster, plane, ndc, hit, boardFlipped],
  );

  // A drop already happened, so the normal move arc would replay the journey
  // from the origin. Keep that one FEN update snapped instead.
  useEffect(() => {
    if (!suppressMoveAnimation) return;
    const id = requestAnimationFrame(() => setSuppress(false));
    return () => cancelAnimationFrame(id);
  }, [suppressMoveAnimation]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      gsap.killTweensOf(positionRef.current);
    };
  }, []);

  const onPiecePointerDown = useCallback(
    (square: string, event: ThreeEvent<PointerEvent>) => {
      if (!enabled || gestureRef.current || event.button !== 0) return;

      const piece = chess.get(square as Square);
      if (!piece || piece.color !== metrics.turn) {
        // Keep the existing "click elsewhere clears the selection" behaviour.
        selectSquare(square);
        return;
      }

      const startX = event.nativeEvent.clientX;
      const startY = event.nativeEvent.clientY;
      const pointerId = event.nativeEvent.pointerId;
      const wasSelected = selectedSquare === square;
      if (!wasSelected) selectSquare(square);

      gestureRef.current = true;
      setControlsEnabled(false);

      let started = false;
      let returning = false;
      let target: string | null = square;

      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("blur", onBlur);
        cleanupRef.current = null;
      };

      const setCursor = (value: string) => {
        if (gl.domElement) gl.domElement.style.cursor = value;
      };

      const begin = (x: number, y: number) => {
        const origin = squareToCoord(square as Square);
        const point = pointerToBoard(x, y) ?? { x: origin.x, z: origin.z };
        positionRef.current = {
          x: point.x,
          z: point.z,
          lift: DRAG_LIFT,
        };
        started = true;
        setHovered(null);
        setDragging(true);
        setSuppress(false);
        setDragVisual({
          from: square,
          color: piece.color as PieceColor,
          type: piece.type as PieceType,
          positionRef,
        });
        target = coordToSquare(point.x, point.z);
        setDragTarget(target);
        setCursor("grabbing");
      };

      const moveTo = (x: number, y: number) => {
        const point = pointerToBoard(x, y);
        if (!point) {
          target = null;
          setDragTarget(null);
          return;
        }
        positionRef.current.x = point.x;
        positionRef.current.z = point.z;
        positionRef.current.lift = DRAG_LIFT;
        const next = coordToSquare(point.x, point.z);
        if (next !== target) {
          target = next;
          setDragTarget(next);
        }
      };

      const finish = (dropSquare: string | null, cancelled = false) => {
        cleanup();

        if (!started) {
          // A simple click: restore the old toggle-selection behaviour.
          if (!cancelled && wasSelected) selectSquare(square);
          gestureRef.current = false;
          setCursor("");
          setControlsEnabled(true);
          return;
        }

        const result = dropOnSquare(square, cancelled ? null : dropSquare);

        if (result === "moved" || result === "promotion") {
          if (result === "moved") setSuppress(true);
          setDragVisual(null);
          setDragTarget(null);
          setCursor("");
          setControlsEnabled(true);
          gestureRef.current = false;
          return;
        }

        // Illegal or off-board drop: glide the overlay back to its origin, then
        // reveal the real piece again. The board position never changed.
        returning = true;
        setDragTarget(null);
        const origin = squareToCoord(square as Square);
        gsap.to(positionRef.current, {
          x: origin.x,
          z: origin.z,
          lift: 0,
          duration: RETURN_DURATION,
          ease: "power2.out",
          onComplete: () => {
            returning = false;
            setDragVisual(null);
            setCursor("");
            setControlsEnabled(true);
            gestureRef.current = false;
          },
        });
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId || returning) return;

        if (!started) {
          if (
            Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD
          ) {
            return;
          }
          begin(e.clientX, e.clientY);
          return;
        }

        e.preventDefault();
        moveTo(e.clientX, e.clientY);
      };

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId || returning) return;
        if (!started) {
          finish(null);
          return;
        }
        const point = pointerToBoard(e.clientX, e.clientY);
        finish(point ? coordToSquare(point.x, point.z) : target);
      };

      const onCancel = (e: PointerEvent) => {
        if (e.pointerId === pointerId) finish(null, true);
      };

      const onBlur = () => finish(null, true);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          finish(null, true);
        }
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
      window.addEventListener("blur", onBlur);
      cleanupRef.current = cleanup;
    },
    [
      enabled,
      chess,
      metrics.turn,
      selectedSquare,
      selectSquare,
      setDragging,
      setHovered,
      dropOnSquare,
      pointerToBoard,
      setControlsEnabled,
      gl,
    ],
  );

  return {
    dragVisual,
    dragTarget,
    suppressMoveAnimation,
    onPiecePointerDown,
  };
}
