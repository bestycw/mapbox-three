import { ExtendedObject3D, AnimationState, AnimationOptions, EasingType } from '../config';
import { EASING } from '../config/constants';

export class AnimationManager {
    private animations: Map<string, AnimationState> = new Map();
    private animationFrame: number | null = null;

    constructor() {
        this.update = this.update.bind(this);
    }

    /**
     * Starts an animation for the given object
     * @param object The object to animate
     * @param properties Properties to animate with their start and end values
     * @param options Animation options
     * @returns Animation ID
     */
    animate(
        object: ExtendedObject3D,
        properties: Record<string, { start: number; end: number; easing?: EasingType }>,
        options: AnimationOptions = {}
    ): string {
        const id = Math.random().toString(36).substr(2, 9);
        const animationState: AnimationState = {
            id,
            object,
            startTime: performance.now(),
            duration: options.duration || 1000,
            elapsed: 0,
            properties,
            options,
            isPlaying: true,
            isPaused: false
        };

        this.animations.set(id, animationState);

        if (options.onStart) {
            options.onStart();
        }

        if (!this.animationFrame) {
            this.animationFrame = requestAnimationFrame(this.update);
        }

        return id;
    }

    /**
     * Pauses an animation
     * @param id Animation ID
     */
    pause(id: string): void {
        const animation = this.animations.get(id);
        if (animation) {
            animation.isPaused = true;
        }
    }

    /**
     * Resumes a paused animation
     * @param id Animation ID
     */
    resume(id: string): void {
        const animation = this.animations.get(id);
        if (animation) {
            animation.isPaused = false;
            animation.startTime = performance.now() - animation.elapsed;
        }
    }

    /**
     * Stops an animation
     * @param id Animation ID
     */
    stop(id: string): void {
        const animation = this.animations.get(id);
        if (animation) {
            if (animation.options.onComplete) {
                animation.options.onComplete();
            }
            this.animations.delete(id);
        }
    }

    /**
     * Stops all animations
     */
    stopAll(): void {
        this.animations.forEach((animation) => {
            if (animation.options.onComplete) {
                animation.options.onComplete();
            }
        });
        this.animations.clear();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    private update(): void {
        const currentTime = performance.now();
        let hasActiveAnimations = false;

        this.animations.forEach((animation) => {
            if (!animation.isPlaying || animation.isPaused) {
                hasActiveAnimations = true;
                return;
            }

            animation.elapsed = currentTime - animation.startTime;
            const progress = Math.min(animation.elapsed / animation.duration, 1);

            Object.entries(animation.properties).forEach(([prop, { start, end, easing }]) => {
                const easingFn = easing ? EASING[easing] : EASING.Linear;
                const value = start + (end - start) * easingFn(progress);
                
                const parts = prop.split('.');
                let target: any = animation.object;
                
                for (let i = 0; i < parts.length - 1; i++) {
                    target = target[parts[i]];
                }
                
                target[parts[parts.length - 1]] = value;
            });

            if (animation.options.onUpdate) {
                animation.options.onUpdate(progress);
            }

            if (progress >= 1) {
                if (animation.options.repeat) {
                    animation.startTime = currentTime;
                    animation.elapsed = 0;
                    
                    if (animation.options.yoyo) {
                        Object.values(animation.properties).forEach(prop => {
                            const temp = prop.start;
                            prop.start = prop.end;
                            prop.end = temp;
                        });
                    }
                    
                    animation.options.repeat--;
                    hasActiveAnimations = true;
                } else {
                    if (animation.options.onComplete) {
                        animation.options.onComplete();
                    }
                    this.animations.delete(animation.id);
                }
            } else {
                hasActiveAnimations = true;
            }
        });

        if (hasActiveAnimations) {
            this.animationFrame = requestAnimationFrame(this.update);
        } else {
            this.animationFrame = null;
        }
    }
} 