class BoundingBody {
    getType() { return -1; }
    draw(scene, transform, color) {}
}

class BoundingSphere extends BoundingBody{
    constructor(center = [0, 0, 0], radius = 1) {
        super();
        this.center = center;
        this.radius = radius;
    }

    getType() { return 1; }

    draw(scene, transform, color) {
        transform.position = this.center;
        transform.scale = [this.radius, this.radius, this.radius];
        scene.drawSphere(transform.getMatrix(), color, 0.3, 0.0);
    }

    overlaps(other) {
        const sqDist = (this.center[0] - other.center[0]) ** 2 + (this.center[1] - other.center[1]) ** 2 + (this.center[2] - other.center[2]) ** 2;
        const radiiSum = this.radius + other.radius;
        return sqDist <= radiiSum ** 2;
    }

    intersectionPoint(otherSphere) {
        const dx = otherSphere.center[0] - this.center[0];
        const dy = otherSphere.center[1] - this.center[1];
        const dz = otherSphere.center[2] - this.center[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > this.radius + otherSphere.radius || distance < Math.abs(this.radius - otherSphere.radius)) {
            return null;
        }
        const a = (this.radius ** 2 - otherSphere.radius ** 2 + distance ** 2) / (2 * distance);
        const intersectionX = this.center[0] + (a / distance) * dx;
        const intersectionY = this.center[1] + (a / distance) * dy;
        const intersectionZ = this.center[2] + (a / distance) * dz;
        return [intersectionX, intersectionY, intersectionZ];
    }

    intersectionNormal(otherSphere) {
        const intersectionPoint = this.intersectionPoint(otherSphere);
        if (!intersectionPoint) {
            return null; 
        }
        const normalX = intersectionPoint[0] - this.center[0];
        const normalY = intersectionPoint[1] - this.center[1];
        const normalZ = intersectionPoint[2] - this.center[2];
        const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
        if (length === 0) {
            return null; 
        }
        return [normalX / length, normalY / length, normalZ / length];
    }

    intersectionDepth(otherSphere) {
        const dx = otherSphere.center[0] - this.center[0];
        const dy = otherSphere.center[1] - this.center[1];
        const dz = otherSphere.center[2] - this.center[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const radiiSum = this.radius + otherSphere.radius;
        if (distance >= radiiSum) {
            return null; 
        }
        const interDepth = radiiSum - distance;
        const normalX = dx / distance;
        const normalY = dy / distance;
        const normalZ = dz / distance;
        return [
            normalX * interDepth,
            normalY * interDepth,
            normalZ * interDepth
        ];
    }

    intersectsLineTrace(start, direction) {
        const dirLength = Math.sqrt(direction[0]**2 + direction[1]**2 + direction[2]**2);
        const normalizedDirection = direction.map(d => d / dirLength);
        const L = [ this.center[0] - start[0], this.center[1] - start[1], this.center[2] - start[2] ];
        const tca = L[0] * normalizedDirection[0] + L[1] * normalizedDirection[1] + L[2] * normalizedDirection[2];
        const d2 = (L[0] ** 2 + L[1] ** 2 + L[2] ** 2) - tca ** 2;
        const radius2 = this.radius ** 2;
        if (d2 > radius2) {
            return null;
        }
        const thc = Math.sqrt(radius2 - d2);
        const t0 = tca - thc;
        const t1 = tca + thc;
        if (t0 < 0 && t1 < 0) {
            return null;
        }
        const t = t0 >= 0 ? t0 : t1; 
        const intersectionPoint = [ start[0] + t * normalizedDirection[0], start[1] + t * normalizedDirection[1], start[2] + t * normalizedDirection[2] ];
        return intersectionPoint;
    }
}

class Particle {
    constructor(position = [0, 0, 0], radius = 1, isDynamic = false, elasticity = 1) {
        this.position = position;
        this.velocity = [0, 0, 0];
        this.acceleration = [0, -98.0, 0];
        this.transform = new Transform();
        this.body = new BoundingSphere(this.position, radius);
        this.color = randomColor(Math.random(), [0.5, 0.5, 0.5],	[0.5, 0.5, 0.5],	[1.0, 1.0, 1.0],	[0.00, 0.10, 0.20]);
        this.isDynamic = isDynamic;
        this.elasticity = elasticity;
        this.visible = true;
    }

    tick(dt) {
        this.velocity = Vec3.add(this.velocity, Vec3.scale(this.acceleration, dt));
        this.position = Vec3.add(this.position, Vec3.scale(this.velocity, dt));
        this.body.center = this.position;
    }

    draw(scene) {
        if (this.visible) {
            this.transform.reset();
            this.body.draw(scene, this.transform, this.color);
        }
    }
}

class Collision {
    static handleStaticParticleResponse(dynamicParticle, staticParticle) {
        const depthVector = dynamicParticle.body.intersectionDepth(staticParticle.body);
        if (depthVector) {
            const normal = Vec3.norm(depthVector);
            const velocityDotNormal = Vec3.dot(dynamicParticle.velocity, normal);
            const reflection = Vec3.scale(normal, 2 * velocityDotNormal);
            const newVelocity = Vec3.sub(dynamicParticle.velocity, reflection);
            dynamicParticle.velocity = Vec3.scale(newVelocity, dynamicParticle.elasticity);
            const depthDepth = Vec3.dot(depthVector, normal);
            const correction = Vec3.scale(normal, depthDepth + 0.05); // Little bias to avoid sticking to surface.
            dynamicParticle.position = Vec3.sub(dynamicParticle.position, correction);
            dynamicParticle.body.center = dynamicParticle.position;
        }
    }
    
    static handleDynamicParticleResponse(dynamicParticle1, dynamicParticle2) {
        const delta = Vec3.sub(dynamicParticle2.position, dynamicParticle1.position);
        const distance = Math.sqrt(Vec3.dot(delta, delta));
        const radiiSum = dynamicParticle1.body.radius + dynamicParticle2.body.radius;
        if (distance < radiiSum) {
            const normal = Vec3.norm(delta);
            const interDepth = radiiSum - distance;
            const relativeVelocity = Vec3.sub(dynamicParticle1.velocity, dynamicParticle2.velocity);
            const velocityAlongNormal = Vec3.dot(relativeVelocity, normal);
            const restitution = Math.min(dynamicParticle1.elasticity, dynamicParticle2.elasticity);
            const impulseScalar = -(1 + restitution) * velocityAlongNormal / 2;
            const impulse = Vec3.scale(normal, impulseScalar);
            dynamicParticle1.velocity = Vec3.add(dynamicParticle1.velocity, impulse);
            dynamicParticle2.velocity = Vec3.sub(dynamicParticle2.velocity, impulse);
            const correction = Vec3.scale(normal, interDepth / (dynamicParticle1.body.radius + dynamicParticle2.body.radius));
            dynamicParticle1.position = Vec3.sub(dynamicParticle1.position, Vec3.scale(correction, dynamicParticle2.body.radius));
            dynamicParticle2.position = Vec3.add(dynamicParticle2.position, Vec3.scale(correction, dynamicParticle1.body.radius));
            dynamicParticle1.body.center = dynamicParticle1.position;
            dynamicParticle2.body.center = dynamicParticle2.position;
        }
    }

    static shootRay(screenX, screenY, scene, particles) {
        const ndcX = (2 * screenX) / canvas.width - 1;
        const ndcY = 1 - (2 * screenY) / canvas.height;
        const nearPointNDC = [ndcX, ndcY, -1, 1];
        const invProjectionMatrix = Mat4.inv(scene.camera.projectionMatrix);
        const nearPointViewSpace = Vec3.transform(invProjectionMatrix, nearPointNDC);
        nearPointViewSpace[0] /= nearPointViewSpace[3];
        nearPointViewSpace[1] /= nearPointViewSpace[3];
        nearPointViewSpace[2] /= nearPointViewSpace[3];
        nearPointViewSpace[3] = 1;
        let viewMatrix = null;
        if (scene.camera.lookAtTarget) {
            viewMatrix = Mat4.lookAt(scene.camera.position, scene.camera.lookAtTarget, [0, 1, 0]);
        } else {
            viewMatrix = Mat4.lookAt(scene.camera.position, Vec3.add(scene.camera.position, scene.camera.front), [0, 1, 0]);
        }
        const invViewMatrix = Mat4.inv(viewMatrix);
        const nearPointWorldSpace = Vec3.transform(invViewMatrix, nearPointViewSpace);
        const rayDirection = [ nearPointWorldSpace[0] - scene.camera.position[0], nearPointWorldSpace[1] - scene.camera.position[1], nearPointWorldSpace[2] - scene.camera.position[2] ];
        const length = Math.sqrt(rayDirection[0]**2 + rayDirection[1]**2 + rayDirection[2]**2);
        const normalizedRayDirection = [ rayDirection[0] / length, rayDirection[1] / length, rayDirection[2] / length ];
        for (const particle of particles) {
            const hitPoint = particle.body.intersectsLineTrace(scene.camera.position, normalizedRayDirection);
            if (hitPoint) {
                return { particle, hitPoint };
            }
        }
        return null;
    }
}

