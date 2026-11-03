import * as THREE from 'three';

// All geometry below is generated at runtime. Underbody parts are educational
// illustrations, not a reconstruction of proprietary SU7 engineering geometry.
const PI = Math.PI;
const AXLES = [-1.51, 1.49];

function material(color, metalness = 0, roughness = .4, options = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...options });
}

function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function box(group, dimensions, position, mat, radius = 0) {
  let geometry;
  if (radius > 0) {
    const [w, h, d] = dimensions;
    const r = Math.min(radius, w / 2, h / 2, d / 2);
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    geometry = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(.001, d - r / 2), bevelEnabled: true,
      bevelThickness: r / 4, bevelSize: r / 4, bevelSegments: 2,
      curveSegments: 5, steps: 1,
    });
    geometry.translate(0, 0, -(d - r / 2) / 2);
  } else geometry = new THREE.BoxGeometry(...dimensions);
  const object = mesh(geometry, mat, ...position);
  group.add(object);
  return object;
}

function cylinder(group, radius, length, position, mat, radiusBottom = radius, segments = 36) {
  const object = mesh(new THREE.CylinderGeometry(radius, radiusBottom, length, segments), mat, ...position);
  object.rotation.x = PI / 2;
  group.add(object);
  return object;
}

function torus(group, radius, tube, position, mat, segments = 56) {
  const object = mesh(new THREE.TorusGeometry(radius, tube, 8, segments), mat, ...position);
  group.add(object);
  return object;
}

function tube(group, points, radius, mat, tubularSegments = 20) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const object = mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, 6, false), mat);
  group.add(object);
  return object;
}

function definition(id, group, anchor, explode) {
  group.name = id;
  return { id, group, anchor: new THREE.Vector3(...anchor), explode: new THREE.Vector3(...explode) };
}

function makeWheels() {
  const wheels = new THREE.Group();
  const brakes = new THREE.Group();
  const rubber = material('#111719', .03, .76);
  const rubberEdge = material('#263034', .04, .68);
  const gunmetal = material('#19262c', .8, .25);
  const silver = material('#cbd7d7', .92, .2);
  const hubMetal = material('#71848c', .85, .28);
  const brakeMetal = material('#939da0', .82, .38);
  const yellow = material('#d5ba3a', .48, .27);
  const dark = material('#152126', .45, .5);

  // A lathed, nearly square tire profile gives genuine sidewalls rather than
  // the inflated circular profile of a simple torus.
  const profile = [
    [.265, -.113], [.294, -.12], [.326, -.108], [.347, -.076],
    [.355, -.037], [.355, .037], [.347, .076], [.326, .108],
    [.294, .12], [.265, .113], [.265, -.113],
  ].map(p => new THREE.Vector2(...p));
  const tireGeometry = new THREE.LatheGeometry(profile, 64);
  tireGeometry.rotateX(PI / 2);

  const spokeShapes = [];
  for (let i = 0; i < 5; i++) {
    const angle = i * PI * 2 / 5 + PI / 2;
    for (const sign of [-1, 1]) {
      const shape = new THREE.Shape();
      const to = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
      const a = angle + sign * .10;
      const corners = [to(.055, a - .15), to(.12, a - .085), to(.252, a + sign * .105 - .045), to(.252, a + sign * .105 + .045), to(.12, a + .085), to(.055, a + .15)];
      shape.moveTo(...corners[0]);
      corners.slice(1).forEach(p => shape.lineTo(...p));
      shape.closePath();
      spokeShapes.push(shape);
    }
  }
  const spokesGeometry = new THREE.ExtrudeGeometry(spokeShapes, {
    depth: .013, bevelEnabled: true, bevelThickness: .002,
    bevelSize: .002, bevelSegments: 1, steps: 1,
  });

  // Reuse the same geometry between all four rims, preserving draw and memory
  // budgets on mobile devices.
  const linePoints = [];
  for (let i = 0; i < 56; i++) {
    const angle = i * PI * 2 / 56;
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const z1 = side * (.019 + j * .023);
        const z2 = side * (.019 + (j + 1) * .023);
        const a1 = angle + j * .018;
        const a2 = angle + (j + 1) * .018;
        const r1 = .355 - Math.max(0, Math.abs(z1) - .035) * .2;
        const r2 = .355 - Math.max(0, Math.abs(z2) - .035) * .2;
        linePoints.push(new THREE.Vector3(Math.cos(a1) * r1, Math.sin(a1) * r1, z1));
        linePoints.push(new THREE.Vector3(Math.cos(a2) * r2, Math.sin(a2) * r2, z2));
      }
    }
  }
  const treadGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const treadMaterial = new THREE.LineBasicMaterial({ color: '#364044', transparent: true, opacity: .62 });

  for (const x of AXLES) for (const side of [-1, 1]) {
    const y = .365, z = side * .91;
    const tire = mesh(tireGeometry, rubber, x, y, z);
    wheels.add(tire);
    const tread = new THREE.LineSegments(treadGeometry, treadMaterial);
    tread.position.copy(tire.position);
    wheels.add(tread);
    cylinder(wheels, .266, .195, [x, y, z], gunmetal, .266, 48);
    torus(wheels, .255, .006, [x, y, z + side * .117], silver);
    torus(wheels, .284, .0025, [x, y, z + side * .12], rubberEdge);
    const spokes = mesh(spokesGeometry, silver, x, y, z + side * .107);
    if (side < 0) spokes.rotation.y = PI;
    wheels.add(spokes);
    cylinder(wheels, .057, .026, [x, y, z + side * .12], gunmetal, .057, 32);
    cylinder(wheels, .027, .029, [x, y, z + side * .124], hubMetal, .027, 32);
    const bolts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.006, .006, .006, 8), silver, 5);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2, 0, 0));
    for (let i = 0; i < 5; i++) {
      const a = i * PI * 2 / 5;
      matrix.compose(new THREE.Vector3(x + Math.cos(a) * .043, y + Math.sin(a) * .043, z + side * .137), quat, new THREE.Vector3(1, 1, 1));
      bolts.setMatrixAt(i, matrix);
    }
    wheels.add(bolts);

    cylinder(brakes, .224, .018, [x, y, z + side * .071], brakeMetal, .224, 48);
    cylinder(brakes, .085, .024, [x, y, z + side * .073], dark, .085, 24);
    torus(brakes, .19, .0015, [x, y, z + side * .082], hubMetal);
    const caliperX = x + (x < 0 ? .157 : -.157);
    const caliper = box(brakes, [.082, .215, .06], [caliperX, y + .013, z + side * .093], yellow, .018);
    caliper.rotation.z = x < 0 ? -.22 : .22;
    box(brakes, [.047, .012, .062], [caliperX, y + .018, z + side * .095], dark, .002);
  }
  return [
    definition('wheels', wheels, [-1.51, .365, 1.04], [0, 0, .66]),
    definition('brakes', brakes, [-1.36, .38, .99], [0, .16, .35]),
  ];
}

function makeBattery() {
  const group = new THREE.Group();
  const housing = material('#29383d', .72, .37);
  const edge = material('#6c8188', .8, .32);
  const moduleMaterial = material('#386970', .56, .35);
  const moduleStripe = material('#78a5a8', .6, .33);
  const orange = material('#ed803a', .25, .42);
  box(group, [2.55, .11, 1.40], [0, .224, 0], housing, .035);
  for (const z of [-.69, .69]) box(group, [2.51, .045, .035], [0, .298, z], edge, .009);
  for (const x of [-1.25, 1.25]) box(group, [.035, .045, 1.39], [x, .298, 0], edge, .009);
  for (let i = 0; i < 8; i++) {
    const x = -1.09 + i * .312;
    box(group, [.284, .055, 1.28], [x, .302, 0], moduleMaterial, .01);
    box(group, [.015, .003, 1.25], [x - .07, .332, 0], moduleStripe);
  }
  box(group, [.21, .045, .15], [1.15, .33, .48], orange, .01);
  tube(group, [[1.18, .34, .48], [1.38, .34, .48], [1.49, .4, .26]], .014, orange);
  return definition('battery', group, [.1, .33, .63], [0, -.12, 0]);
}

function makeDrive(id, x, front) {
  const group = new THREE.Group();
  const casing = material('#9faeb0', .77, .32);
  const dark = material('#30434a', .72, .36);
  const steel = material('#b4c2c3', .9, .23);
  const orange = material('#ef8744', .27, .36);
  cylinder(group, .15, .53, [x, .428, 0], casing, .15, 40);
  cylinder(group, .16, .05, [x, .428, .26], dark, .16, 36);
  cylinder(group, .16, .05, [x, .428, -.26], dark, .16, 36);
  for (const z of [-.15, -.10, -.05, 0, .05, .10, .15]) {
    torus(group, .15, .004, [x, .428, z], steel, 32);
  }
  for (const side of [-1, 1]) cylinder(group, .022, .43, [x, .405, side * .48], steel, .022, 16);
  box(group, [.27, .115, .35], [x - .015, .596, 0], dark, .025);
  tube(group, [[x - .09, .61, .11], [x - .30, .60, .14], [front ? -1.16 : 1.16, .35, .45]], .016, orange, 18);
  return definition(id, group, [x, .59, .13], [front ? -.46 : .46, .20, 0]);
}

function makeSuspension() {
  const group = new THREE.Group();
  const steel = material('#8c9ca0', .82, .3);
  const black = material('#263139', .42, .45);
  const coilMaterial = material('#c2a045', .66, .32);
  for (const x of AXLES) for (const sign of [-1, 1]) {
    const z = sign * .69;
    tube(group, [[x, .31, sign * .89], [x - .12, .29, sign * .56], [x - .23, .29, sign * .40]], .025, black);
    tube(group, [[x, .31, sign * .89], [x + .16, .29, sign * .56], [x + .23, .29, sign * .40]], .025, black);
    tube(group, [[x, .36, sign * .78], [x + .04, .70, z]], .023, steel);
    const points = [];
    for (let i = 0; i <= 72; i++) {
      const t = i / 72, a = t * PI * 2 * 6;
      points.push([x + .015 + Math.cos(a) * .045, .46 + t * .20, z + Math.sin(a) * .045]);
    }
    tube(group, points, .0065, coilMaterial, 72);
  }
  return definition('suspension', group, [-1.51, .65, .70], [0, .12, .32]);
}

function makeSeats() {
  const group = new THREE.Group();
  const leather = material('#c8c3b2', .03, .65);
  const inset = material('#a9ad9e', .02, .7);
  const black = material('#202b2f', .15, .67);
  for (const z of [-.41, .41]) {
    box(group, [.48, .105, .405], [-.22, .555, z], leather, .044);
    const back = box(group, [.135, .39, .38], [.018, .805, z], leather, .045);
    back.rotation.z = -.15;
    box(group, [.09, .285, .255], [-.064, .80, z], inset, .025).rotation.z = -.15;
    box(group, [.125, .145, .235], [.064, 1.073, z], leather, .035);
    box(group, [.36, .055, .33], [-.20, .48, z], black, .015);
    for (const side of [-1, 1]) box(group, [.39, .07, .043], [-.20, .59, z + side * .174], leather, .025);
  }
  // The rear bench is deliberately generic: it illustrates cabin layout only.
  box(group, [.43, .11, 1.35], [.84, .56, 0], leather, .04);
  box(group, [.135, .34, 1.33], [1.055, .78, 0], leather, .035).rotation.z = -.14;
  for (const z of [-.45, 0, .45]) box(group, [.105, .12, .20], [1.085, 1.005, z], leather, .028);
  box(group, [.61, .13, .16], [-.05, .62, 0], black, .022);
  return definition('seats', group, [-.12, .92, .39], [0, .48, 0]);
}

function makeDashboard() {
  const group = new THREE.Group();
  const trim = material('#1d2b30', .22, .48);
  const top = material('#485454', .08, .7);
  const leather = material('#b4b4a2', .02, .7);
  const screen = material('#0d2630', .3, .23, { emissive: '#1e8499', emissiveIntensity: .22 });
  const screenLine = material('#80d7d6', .22, .3, { emissive: '#4bc6cb', emissiveIntensity: .7 });
  box(group, [.26, .11, 1.43], [-.76, .93, 0], trim, .034);
  box(group, [.25, .044, 1.42], [-.77, 1.008, 0], top, .018);
  box(group, [.03, .065, 1.29], [-.618, .934, 0], leather, .014);
  box(group, [.014, .012, 1.25], [-.598, .966, 0], screenLine, .003);
  box(group, [.026, .218, .34], [-.64, 1.065, -.045], trim, .015);
  box(group, [.004, .184, .308], [-.624, 1.069, -.045], screen, .008);
  box(group, [.006, .008, .23], [-.621, 1.105, -.045], screenLine, .001);
  box(group, [.006, .008, .13], [-.621, 1.065, -.087], screenLine, .001);
  box(group, [.025, .066, .21], [-.69, .997, .43], trim, .009);
  box(group, [.005, .042, .182], [-.674, .998, .43], screen, .003);

  const steering = new THREE.Group();
  const rim = torus(steering, .105, .013, [0, 0, 0], trim, 40);
  rim.rotation.y = PI / 2;
  const hub = cylinder(steering, .039, .035, [0, 0, 0], trim, .039, 24);
  hub.rotation.set(0, 0, PI / 2);
  box(steering, [.023, .02, .18], [0, 0, 0], top, .004);
  box(steering, [.024, .09, .019], [0, -.04, 0], top, .004);
  steering.position.set(-.515, .95, .43);
  steering.rotation.z = .24;
  group.add(steering);
  return definition('dashboard', group, [-.65, 1.08, -.03], [-.12, .38, 0]);
}

export function buildMechanicalParts() {
  return [
    ...makeWheels(), makeBattery(),
    makeDrive('front-drive', -1.51, true), makeDrive('rear-drive', 1.49, false),
    makeSuspension(), makeSeats(), makeDashboard(),
  ];
}
