import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import px from "./textures/envMaps/1/px.jpg";
import py from "./textures/envMaps/1/py.jpg";
import pz from "./textures/envMaps/1/pz.jpg";
import nx from "./textures/envMaps/1/nx.jpg";
import ny from "./textures/envMaps/1/ny.jpg";
import nz from "./textures/envMaps/1/nz.jpg";

import "./style.css";

/**
 * Materials
 */
// envMap
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([px, nx, py, ny, pz, nz]);

const colors = [0xff0000, 0xff8855, 0xffffff, 0xffff00, 0x00ff00, 0x0000ff];
const materialsProps = {
  metalness: 0.8,
  roughness: 0.1,
  transparent: true,
  opacity: 1,
  envMap,
};
const materials = [
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[0] }), // right side
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[1] }), // left
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[2] }), // top
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[3] }), // bottom
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[4] }), // front
  new THREE.MeshStandardMaterial({ ...materialsProps, color: colors[5] }), // back
];

const selectedMaterial = new THREE.MeshStandardMaterial({
  ...materialsProps,
  color: 0x000000,
});

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

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const setPerspective = () => {
  const { innerWidth, innerHeight } = window;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};
window.addEventListener("resize", setPerspective);
setPerspective();

// controller
const controller = new OrbitControls(camera, canvas);
controller.enableDamping = true;

// ray caster + mouse
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const onPointerMove = (event) => {
  // calculate pointer position in normalized device coordinates => (-1 to +1) for both components
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
};
window.addEventListener("pointermove", onPointerMove);

const cubes = new THREE.Group();
let selectedCube;
let groupX, groupY, groupZ;
const castRays = () => {
  // update the picking ray with the camera and pointer position
  raycaster.setFromCamera(pointer, camera);

  // calculate objects intersecting the picking ray and get the closest
  const intersects = raycaster.intersectObjects(scene.children);
  intersects.sort((a, b) => (a.distance < b.distance ? -1 : 1));
  const newSelectedCube = intersects[0]?.object;
  if (newSelectedCube !== selectedCube) {
    if (selectedCube) {
      selectedCube.material = materials;
    }
    selectedCube = newSelectedCube;
    if (selectedCube) {
      selectedCube.material = selectedMaterial;
    }
  }
};

const onMouseDown = () => {
  console.log("clicked");
  if (selectedCube) {
    console.log("aha!");
    controller.enabled = false;
  }
};
window.addEventListener("mousedown", onMouseDown);

const onMouseUp = () => {
  console.log("unclicked");
  controller.enabled = true;
};
window.addEventListener("mouseup", onMouseUp);

// lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1);

const pointLight1 = new THREE.PointLight(0xffffff, 0.25);
pointLight1.position.x = -100;
pointLight1.position.y = 10;

scene.add(ambientLight, pointLight1);

/**
 * Get animating
 */
const animationLoop = () => {
  controller.update();
  castRays();
  renderer.render(scene, camera);
  requestAnimationFrame(animationLoop);
};
animationLoop();

/**
 * Objects
 */
const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95, 100, 100, 100);
for (let i = 0; i < 27; i++) {
  const cube = new THREE.Mesh(geometry, materials);
  cube.position.y = (i % 3) - 1;
  cube.position.x = (Math.floor(i / 3) % 3) - 1;
  cube.position.z = Math.floor(i / 9) - 1;
  cubes.add(cube);
}

scene.add(cubes);
