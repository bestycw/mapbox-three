export class Validator {
    constructor() {
        this.types = {
            number: function(v) { return typeof v === 'number'},
            array: function(v) { return Array.isArray(v) },
            string: function(v) { return typeof v === 'string'},
            object: function(v) { return typeof v === 'object'},
            boolean: function(v) { return typeof v === 'boolean'},
            coordinates: function(v) { return Array.isArray(v) && v.length === 2 && v.every(function(item) { return typeof item === 'number'})},
            coordinatesArray: function(v) { return Array.isArray(v) && v.every(function(item) { return this.types.coordinates(item)})},
            rotation: function(v) { return this.types.number(v) || this.types.array(v) || this.types.object(v)},
            scale: function(v) { return this.types.number(v) || this.types.array(v) || this.types.object(v)}
        }
    }

    validate(options, schema) {
        var errors = [];
        var self = this;

        Object.keys(schema).forEach(function(key) {
            var type = schema[key];

            if (!self.types[type](options[key])) {
                errors.push(key + ' must be of type ' + type);
            }
        });

        return errors;
    }
} 