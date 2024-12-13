export class Validator {
    validateLatLng(coords: [number, number] | [number, number, number]): boolean {
        if (!Array.isArray(coords)) return false;
        if (coords.length < 2 || coords.length > 3) return false;
        
        const [lng, lat] = coords;
        if (typeof lng !== 'number' || typeof lat !== 'number') return false;
        if (lng < -180 || lng > 180) return false;
        if (lat < -90 || lat > 90) return false;

        if (coords.length === 3 && typeof coords[2] !== 'number') return false;

        return true;
    }

    validateColor(color: string | number): boolean {
        if (typeof color === 'number') {
            return color >= 0 && color <= 0xffffff;
        }
        
        if (typeof color === 'string') {
            const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
            return hexRegex.test(color) || rgbRegex.test(color);
        }

        return false;
    }

    validateOpacity(opacity: number): boolean {
        return typeof opacity === 'number' && opacity >= 0 && opacity <= 1;
    }

    validateScale(scale: number | [number, number, number]): boolean {
        if (typeof scale === 'number') {
            return scale > 0;
        }
        
        if (Array.isArray(scale)) {
            return scale.length === 3 && scale.every(s => typeof s === 'number' && s > 0);
        }

        return false;
    }

    validateRotation(rotation: [number, number, number]): boolean {
        if (!Array.isArray(rotation) || rotation.length !== 3) return false;
        return rotation.every(r => typeof r === 'number');
    }

    validateUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
} 