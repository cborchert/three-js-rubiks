import * as THREE from "three";
import gsap from "gsap";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import px from "./textures/envMaps/2/px.png";
import py from "./textures/envMaps/2/py.png";
import pz from "./textures/envMaps/2/pz.png";
import nx from "./textures/envMaps/2/nx.png";
import ny from "./textures/envMaps/2/ny.png";
import nz from "./textures/envMaps/2/nz.png";

import "./style.css";

const DRAG_THESHOLD = 0.03;
const ANIMATION_DURATION_IN_SECONDS = 0.25;

/**
 * Materials
 */
// envMap
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([px, nx, py, ny, pz, nz]);

const colors = [
  0xdd0000, 0xff8855, 0xffffff, 0xdddd00, 0x00dd00, 0x0000dd, 0x333333,
];
const materialsProps = {
  metalness: 0.6,
  roughness: 0.5,
  flatShading: true,
  envMap,
};
const blackMaterial = new THREE.MeshStandardMaterial({
  ...materialsProps,
  color: colors[6],
});
const cubeMaterials = [
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[0] }), // right side
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[1] }), // left
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[2] }), // top
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[3] }), // bottom
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[4] }), // front
  new THREE.MeshStandardMaterial({
    ...materialsProps,
    color: colors[5],
  }), // back
];

/**
 * setup
 */
// renderer
const canvas = document.querySelector("#canvas");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// scene + camera
const scene = new THREE.Scene();
scene.background = envMap;
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 8;
camera.position.x = 4;
camera.position.y = 4;
scene.add(camera);

const setPerspective = () => {
  const { innerWidth, innerHeight } = window;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};
window.addEventListener("resize", setPerspective);
setPerspective();

// lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

const pointLight1 = new THREE.PointLight(0xdddddd, 0.4);
pointLight1.position.x = 0;
pointLight1.position.y = 0;
pointLight1.position.z = 100;

scene.add(ambientLight, pointLight1);

/**
 * Objects
 */
const cubes = new THREE.Group();
const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
for (let i = 0; i < 27; i++) {
  const x = (Math.floor(i / 3) % 3) - 1;
  const y = (i % 3) - 1;
  const z = Math.floor(i / 9) - 1;

  // paint certain sides black
  let currentCubeMaterials = [...cubeMaterials];
  if (x < 1) {
    currentCubeMaterials[0] = blackMaterial;
  }
  if (x > -1) {
    currentCubeMaterials[1] = blackMaterial;
  }
  if (y < 1) {
    currentCubeMaterials[2] = blackMaterial;
  }
  if (y > -1) {
    currentCubeMaterials[3] = blackMaterial;
  }
  if (z < 1) {
    currentCubeMaterials[4] = blackMaterial;
  }
  if (z > -1) {
    currentCubeMaterials[5] = blackMaterial;
  }
  const cube = new THREE.Mesh(geometry, currentCubeMaterials);
  cube.position.x = x;
  cube.position.y = y;
  cube.position.z = z;
  cubes.add(cube);
}

scene.add(cubes);

/**
 * Controls
 */

// controller
const controller = new OrbitControls(camera, canvas);
controller.enableDamping = true;

// ray caster + mouse
let isDragging = false;
let selectedObject;
let selectedNormal;
const raycaster = new THREE.Raycaster();
const mousePosition = new THREE.Vector2();
const initialMousePosition = new THREE.Vector2();

const getSlice = (coordinate, value) => {
  const slice = cubes.children.filter(
    (child) => Math.round(child.position[coordinate]) === value
  );
  return slice;
};

const rotate = (sliceAxis, sliceNumber, direction, distance = Math.PI / 2) => {
  const items = getSlice(sliceAxis, sliceNumber);

  if (!items || items.length === 0) return;
  const rotateGroup = new THREE.Group();
  rotateGroup.add(...items);
  scene.add(rotateGroup);
  // animate the rotation
  gsap.to(rotateGroup.rotation, {
    [sliceAxis]: distance * direction,
    duration: ANIMATION_DURATION_IN_SECONDS,
    onComplete: () => {
      // after the rotation is complete, add each cube back into the parent and allow for new drag actions
      rotateGroup.updateMatrixWorld();
      rotateGroup.children.slice().forEach((child) => {
        rotateGroup.remove(child);
        cubes.add(child);
        child.applyMatrix4(rotateGroup.matrixWorld);
      });
      isDragging = false;
    },
  });
};

const getPointedObject = () => {
  // update the picking ray with the camera and pointer position
  raycaster.setFromCamera(mousePosition, camera);

  // calculate objects intersecting the picking ray and get the closest
  const intersects = raycaster.intersectObjects(scene.children);
  intersects.sort((a, b) => (a.distance < b.distance ? -1 : 1));
  return intersects[0];
};

const getMousePosition = (event) => {
  return {
    // calculate pointer position in normalized device coordinates => (-1 to +1) for both components
    x: (event.clientX / window.innerWidth) * 2 - 1,
    y: -(event.clientY / window.innerHeight) * 2 + 1,
  };
};

const getLongestComponent = (vector) => {
  const x = Math.abs(vector.x);
  const y = Math.abs(vector.y);
  const z = Math.abs(vector.z);
  return x > y && x > z ? "x" : y > z ? "y" : "z";
};

const onMouseMove = (event) => {
  // calculate pointer position in normalized device coordinates => (-1 to +1) for both components
  const { x, y } = getMousePosition(event);
  mousePosition.x = x;
  mousePosition.y = y;

  if (selectedObject && !isDragging) {
    // transform the distance that the pointer moved into a 3d vector in the same space as the camera
    const dX = mousePosition.x - initialMousePosition.x;
    const dY = mousePosition.y - initialMousePosition.y;
    const mouseMove = new THREE.Vector3(dX, dY, 0);
    mouseMove.applyEuler(camera.rotation);

    // if we've moved enough, rotate the face
    if (mouseMove.length() > DRAG_THESHOLD) {
      if (!selectedNormal || !selectedObject?.object) return;
      isDragging = true;

      // determine the face that was clicked and remove its component from the mouseMove vector
      const face = getLongestComponent(selectedNormal);
      const limitingVector = new THREE.Vector3(1, 1, 1);
      limitingVector[face] = 0;
      const limitedMovement = mouseMove.clone();
      limitedMovement.multiply(limitingVector);

      // determine the axis of rotation
      const draggedDirection = getLongestComponent(limitedMovement);
      const draggedDistance = limitedMovement[draggedDirection];
      // todo there has to be a "right" way to figure this out
      let rotationAxis;
      let rotationDirection =
        -1 * Math.sign(draggedDistance) * Math.sign(selectedNormal[face]);
      // NOTE sometimes we have to invert the direction of rotation
      // I honestly don't know why. I suck at spacial reasoning, and this is just empirically determined
      if (face === "x") {
        if (draggedDirection === "y") {
          rotationAxis = "z";
          // see note above
          rotationDirection *= -1;
        } else {
          rotationAxis = "y";
        }
      } else if (face === "y") {
        if (draggedDirection === "x") {
          rotationAxis = "z";
        } else {
          rotationAxis = "x";
          // see note above
          rotationDirection *= -1;
        }
      } else if (face === "z") {
        if (draggedDirection === "x") {
          rotationAxis = "y";
          // see note above
          rotationDirection *= -1;
        } else {
          rotationAxis = "x";
        }
      }

      if (!rotationAxis) return;
      rotate(
        rotationAxis,
        Math.round(selectedObject.object.position[rotationAxis]),
        rotationDirection
      );
    }
  }
};
window.addEventListener("pointermove", onMouseMove);

const onMouseDown = (event) => {
  const { x, y } = getMousePosition(event);
  initialMousePosition.x = x;
  initialMousePosition.y = y;
  mousePosition.x = x;
  mousePosition.y = y;

  selectedObject = getPointedObject();
  if (selectedObject) {
    // get the clicked face
    const roundedNormal = selectedObject?.face?.normal?.clone?.()?.round?.();
    roundedNormal.applyEuler(selectedObject.object.rotation);
    selectedNormal = roundedNormal;
    controller.enabled = false;
  }
};
window.addEventListener("pointerdown", onMouseDown);

const onMouseUp = () => {
  controller.enabled = true;
  selectedObject = undefined;
};
window.addEventListener("pointerup", onMouseUp);

/**
 * Get animating
 */
const animationLoop = () => {
  controller.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animationLoop);
};
animationLoop();
