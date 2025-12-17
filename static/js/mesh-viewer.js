document.addEventListener("DOMContentLoaded", function () {
  const viewers = [];
  const sceneGroups = [[], [], []];
  window.renderers = [];
  let isUpdating = false;

  function getModelPaths(framework) {
    if (framework === 'NICE-SLAM') {
      return [
        './static/mesh/NICE-SLAM/0080_Kinect.ply',
        './static/mesh/NICE-SLAM/0080_PDNet.ply',
        './static/mesh/NICE-SLAM/0080_Ours.ply',
        './static/mesh/ESLAM/0080_GT.ply',
        './static/mesh/NICE-SLAM/0112_Kinect.ply',
        './static/mesh/NICE-SLAM/0112_PDNet.ply',
        './static/mesh/NICE-SLAM/0112_Ours.ply',
        './static/mesh/ESLAM/0112_GT.ply',
        './static/mesh/NICE-SLAM/0146_Kinect.ply',
        './static/mesh/NICE-SLAM/0146_PDNet.ply',
        './static/mesh/NICE-SLAM/0146_Ours.ply',
        './static/mesh/ESLAM/0146_GT.ply',
      ];
    } else {
      return [
        './static/mesh/ESLAM/0080_Kinect.ply',
        './static/mesh/ESLAM/0080_PDNet.ply',
        './static/mesh/ESLAM/0080_Ours.ply',
        './static/mesh/ESLAM/0080_GT.ply',
        './static/mesh/ESLAM/0112_Kinect.ply',
        './static/mesh/ESLAM/0112_PDNet.ply',
        './static/mesh/ESLAM/0112_Ours.ply',
        './static/mesh/ESLAM/0112_GT.ply',
        './static/mesh/ESLAM/0146_Kinect.ply',
        './static/mesh/ESLAM/0146_PDNet.ply',
        './static/mesh/ESLAM/0146_Ours.ply',
        './static/mesh/ESLAM/0146_GT.ply',
      ];
    }
  }

  function clearScenes() {
    viewers.forEach(viewer => {
      const keep = viewer.scene.children.filter(obj => obj instanceof THREE.Light);
      viewer.scene.clear();
      keep.forEach(light => viewer.scene.add(light));
    });
  }

  function setupCameraSync() {
    viewers.forEach((viewer, index) => {
      viewer.controls.addEventListener('change', () => {
        if (!isUpdating) {
          syncCamerasInScene(viewer.sceneIndex, viewer.viewerIndex);
        }
      });
    });
  }

  function syncCamerasInScene(sceneIndex, sourceViewerIndex) {
    if (isUpdating) return;
    isUpdating = true;

    const sceneViewers = sceneGroups[sceneIndex];
    const source = sceneViewers[sourceViewerIndex];
    if (!source) {
      isUpdating = false;
      return;
    }

    sceneViewers.forEach((viewer, index) => {
      if (index !== sourceViewerIndex) {
        viewer.camera.position.copy(source.camera.position);
        viewer.camera.rotation.copy(source.camera.rotation);
        viewer.controls.target.copy(source.controls.target);
        viewer.controls.update();
      }
    });

    isUpdating = false;
  }

  function animate() {
    requestAnimationFrame(animate);
    viewers.forEach(viewer => {
      if (viewer.container.offsetParent !== null) {
        viewer.controls.update();
        viewer.renderer.render(viewer.scene, viewer.camera);
      }
    });
  }

  function initViewersOnce() {
    const containers = [];
    for (let i = 1; i <= 12; i++) {
      containers.push(document.getElementById(`mesh-container-${i}`));
    }

    containers.forEach((container, i) => {
      if (!container) return;

      const sceneIndex = Math.floor(i / 4);
      const viewerIndex = i % 4;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);

      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.01,
        100
      );
      camera.position.set(0, 0, 2);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      scene.add(new THREE.DirectionalLight(0xffffff, 0.4).position.set(5, 5, 5));
      scene.add(new THREE.DirectionalLight(0xffffff, 0.4).position.set(-5, 5, -5));

      const viewer = { scene, camera, renderer, controls, container, sceneIndex, viewerIndex };
      viewers.push(viewer);
      sceneGroups[sceneIndex].push(viewer);
      window.renderers.push(renderer);
    });

    setupCameraSync();
    animate();
  }

  function loadMeshes(framework) {
    const modelPaths = getModelPaths(framework);
    clearScenes();

    // update the visible column labels to reflect selected framework
    updateLabels(framework);

    viewers.forEach((viewer, i) => {
      const path = modelPaths[i];
      if (!path) {
        // add fallback placeholder if path missing
        const fallback = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshLambertMaterial({ color: 0xff6b6b })
        );
        viewer.scene.add(fallback);
        return;
      }

      const loader = new THREE.PLYLoader();
      loader.load(
        path,
        geometry => {
          try {
            geometry.computeVertexNormals();
          } catch (e) { /* ignore if not available */ }
          try {
            geometry.computeBoundingBox();
          } catch (e) { /* ignore if not available */ }

          const center = (geometry.boundingBox && geometry.boundingBox.getCenter(new THREE.Vector3())) || new THREE.Vector3();
          if (geometry.boundingBox) geometry.translate(-center.x, -center.y, -center.z);

          const size = (geometry.boundingBox && geometry.boundingBox.getSize(new THREE.Vector3())) || new THREE.Vector3(1,1,1);
          const maxDim = Math.max(size.x || 1, size.y || 1, size.z || 1);
          const targetSize = 1.5;
          const scale = maxDim > 0 ? targetSize / maxDim : 1.0;

          const material = geometry.attributes && geometry.attributes.color
            ? new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }) 
            : new THREE.MeshBasicMaterial({ color: 0x8888aa, side: THREE.DoubleSide });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.scale.setScalar(scale);
          viewer.scene.add(mesh);

          const radius = 2.5;
          viewer.camera.position.set(radius, radius * 0.5, radius);
          viewer.camera.lookAt(0, 0, 0);
          viewer.controls.target.set(0, 0, 0);
          viewer.controls.update();
        },
        undefined,
        error => {
          console.error(`Failed to load mesh ${path}`, error);
          const fallback = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshLambertMaterial({ color: 0xff6b6b })
          );
          viewer.scene.add(fallback);
        }
      );
    });
  }

  // Update the small captions under each mesh container when the framework changes
  function updateLabels(framework) {
    // per-scene labels (4 columns): [main, PDNet, Ours, GT]
    const labelSets = {
      'ESLAM': ['ESLAM', 'ESLAM (w/ PDNet)', 'ESLAM (w/ Ours)', 'Ground Truth'],
      'NICE-SLAM': ['NICE-SLAM', 'NICE-SLAM (w/ PDNet)', 'NICE-SLAM (w/ Ours)', 'Ground Truth']
    };

    const labels = labelSets[framework] || labelSets['ESLAM'];

    for (let i = 1; i <= 12; i++) {
      const container = document.getElementById(`mesh-container-${i}`);
      if (!container) continue;
      const labelEl = container.nextElementSibling;
      if (labelEl && labelEl.tagName === 'P') {
        const colIndex = (i - 1) % 4;
        labelEl.textContent = labels[colIndex];
      }
    }
  }

  window.addEventListener('resize', () => {
    viewers.forEach((viewer, i) => {
      const container = document.getElementById(`mesh-container-${i + 1}`);
      if (container && container.offsetParent !== null) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        viewer.camera.aspect = width / height;
        viewer.camera.updateProjectionMatrix();
        viewer.renderer.setSize(width, height);
      }
    });
  });

  // Initialize once
  initViewersOnce();
  updateLabels('ESLAM');
  loadMeshes('ESLAM');


  // --- Handle Framework Tabs ---
  const tabItems = document.querySelectorAll('#framework-tabs li');

  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      // 1. Remove 'is-active' from all tabs
      tabItems.forEach(t => t.classList.remove('is-active'));

      // 2. Add 'is-active' to the clicked tab
      tab.classList.add('is-active');

      // 3. Get the value (ESLAM or NICE-SLAM)
      const selectedFramework = tab.getAttribute('data-value');

      // 4. Update meshes
      loadMeshes(selectedFramework);
    });
  });

});