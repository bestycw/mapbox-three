import { utils } from '../utils/utils';

export class AnimationManager {
    constructor() {
        this.enrolledObjects = [];
        this.previousTime = 0;
    }

    enroll(obj) {
        this.enrolledObjects.push(obj);

        obj.set = function(options) {
            var p = options.position;
            var r = options.rotation;
            var s = options.scale;

            if (p) {
                if (p.length) {
                    var pos = utils.projectToWorld(p);
                    obj.position.copy(pos);
                }
                else {
                    obj.position.copy(p);
                }
            }

            if (r) {
                if (r.length) {
                    obj.rotation.set(r[0], r[1], r[2]);
                }
                else {
                    obj.rotation.copy(r);
                }
            }

            if (s) {
                if (s.length) {
                    obj.scale.set(s[0], s[1], s[2]);
                }
                else {
                    obj.scale.copy(s);
                }
            }

            return obj;
        };

        obj._setObject = function(options) {
            var p = options.position;
            var r = options.rotation;
            var s = options.scale;

            if (p) obj.position.set(p[0], p[1], p[2]);
            if (r) obj.rotation.set(r[0], r[1], r[2]);
            if (s) obj.scale.set(s[0], s[1], s[2]);

            return obj;
        };

        return obj;
    }

    update(timestamp) {
        if (!this.previousTime) this.previousTime = timestamp;
        var delta = timestamp - this.previousTime;

        for (var obj of this.enrolledObjects) {
            if (obj.update) obj.update(timestamp, delta);
        }

        this.previousTime = timestamp;
    }
} 