const canvas = document.querySelector('#c');
const gl = canvas.getContext('webgl');
document.title = 'js13kgames2024';
window.gl = gl;
Input.init(canvas);

const scene = new SceneRenderer();
const cameraOffset = [0, 20, 0];
const transform = new Transform();

scene.dirLight = [-1, -0.8, 0.29];

function randomColor(t, a, b, c, d) {
    const v = Vec3.scale(Vec3.add(Vec3.scale(c, t), d), 6.28318);
    const v1 = [cos(v[0]), cos(v[1]), cos(v[2])];
    return Vec3.add(Vec3.mul(b, v1), a)
}

let t = 0;

const particles = [];

const staticParticles = [
    new Particle([0, 0, 20], 10),
    new Particle([15, 0, 15], 10),
    new Particle([-15, 0, 13], 10),
    new Particle([0, 8, 20], 5),
    new Particle([15, 8, 15], 5),
    new Particle([-15, 8, 13], 5),
    new Particle([0, -1000, 0], 1000),
];

staticParticles[staticParticles.length - 1].visible = false;

const floorColor = randomColor(Math.random(), [0.5, 0.5, 0.5],	[0.5, 0.5, 0.5],	[1.0, 1.0, 1.0],	[0.00, 0.10, 0.20]);
const floorColor2 = randomColor(Math.random(), [0.5, 0.5, 0.5],	[0.5, 0.5, 0.5],	[1.0, 1.0, 1.0],	[0.00, 0.10, 0.20]);

const mainLoop = (time) => {

    const rot = 15000  * 0.005;
    let moveSpeed = 0.1;

    if (Input.Keyboard.click(KeyCode.KEY_SPACE)) {
        for (let i = 0; i < 3; ++i) {
            const p = new Particle([(Math.random() * 2 - 1) * 20, 10, 2], 1.5 + Math.random() * 1.5, true, 0.4 + Math.random() * 0.5);
            p.velocity[1] = 70 + Math.random() * 10;
            particles.push(p);
        }
    }



    // if (Input.Keyboard.down(KeyCode.KEY_A)) {
    //     cameraOffset[0] -= moveSpeed;        
    // } else if (Input.Keyboard.down(KeyCode.KEY_D)) {
    //     cameraOffset[0] += moveSpeed;
    // }
    // if (Input.Keyboard.down(KeyCode.KEY_W)) {
    //     cameraOffset[2] -= moveSpeed;
    // } else if (Input.Keyboard.down(KeyCode.KEY_S)) {
    //     cameraOffset[2] += moveSpeed;
    // }
    // if(Input.Keyboard.down(KeyCode.KEY_Q)) {
    //     cameraOffset[1] -= moveSpeed;
    // } else if (Input.Keyboard.down(KeyCode.KEY_E)) {
    //     cameraOffset[1] += moveSpeed;
    // }

    //scene.dirLight = [ cos(rot*0.05) * 0.5, -1, sin(rot*0.05) * 0.5 ];
    // if (Input.Mouse.down(0)) {
    //     const angle = Math.atan2((canvas.height / 2 - Input.Mouse.y), (canvas.width / 2 - Input.Mouse.x));
    //     scene.dirLight[0] = cos(angle);
    //     scene.dirLight[2] = sin(angle);
    // }
    if (Input.Mouse.down(1)) {
        scene.dirLight[1] =  -Input.Mouse.y / canvas.height;
    }
    scene.camera.position = Vec3.add([0, 30, -150.0], cameraOffset);
    scene.camera.lookAtTarget = Vec3.add([0, 0, 0], cameraOffset);


    if (Input.Mouse.down(0)) {
        let hit = Collision.shootRay(Input.Mouse.x, Input.Mouse.y, scene, particles);
        if (hit) {
            transform.reset();
            transform.position = hit.hitPoint;
            transform.scale = [3, 3, 3];
            scene.drawSphere(transform.getMatrix(), [100, 100, 100], 1, 1);
            particles.splice(particles.indexOf(hit.particle), 1);
        }
    }
    let delta = 1/45;
    if (Input.Keyboard.down(KeyCode.KEY_LSHIFT)) {
        delta = 1/240;
    }
    for (const particle of particles) {
        particle.tick(delta);
    }

    particles.sort((a, b) => b.position[1] - a.position[1]);

    for (const particle of particles) {
        for (const dynParticle of particles) {
            if (dynParticle != particle) {
                Collision.handleDynamicParticleResponse(dynParticle, particle);
            }
        }
    }

    for (const particle of particles) {
        for (const staticParticle of staticParticles) {
            Collision.handleStaticParticleResponse(particle, staticParticle);
        }
        particle.draw(scene);
    }

    for (const staticParticle of staticParticles) {
        // if (staticParticle.body.radius < 1000) {
            staticParticle.draw(scene);
        // }
    }

    // transform.reset();
    // transform.position = [0, -5, 40];
    // transform.scale = [100, 100, 0.1];
    // scene.drawCube(transform.getMatrix(), floorColor, 0.9, 0.0);

    transform.reset();
    transform.position = [0, 0, 0];
    transform.scale = [100, 0.1, 100];
    scene.drawCube(transform.getMatrix(), floorColor2, 0.9, 0.0);

    scene.render();
    requestAnimationFrame(mainLoop);
};

mainLoop(0);

