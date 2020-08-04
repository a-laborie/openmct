define([], function () {

    /**
     * Responsible for maintaining the possible operations for conditions
     * in this widget, and evaluating the boolean value of conditions passed as
     * input.
     * @constructor
     * @param {Object} subscriptionCache A cache consisting of the latest available
     *                                   data for any telemetry sources in the widget's
     *                                   composition.
     * @param {Object} compositionObjs The current set of composition objects to
     *                                 evaluate for 'any' and 'all' conditions
     */
    function ConditionEvaluator(subscriptionCache, compositionObjs) {
        this.subscriptionCache = subscriptionCache;
        this.compositionObjs = compositionObjs;

        this.testCache = {};
        this.useTestCache = false;

        /**
         * Maps value types to HTML input field types. These
         * type of inputs will be generated by conditions expecting this data type
         */
        this.inputTypes = {
            number: 'number',
            string: 'text',
            enum: 'select'
        };

        /**
         * Functions to validate that the input to an operation is of the type
         * that it expects, in order to prevent unexpected behavior. Will be
         * invoked before the corresponding operation is executed
         */
        this.inputValidators = {
            number: this.validateNumberInput,
            string: this.validateStringInput,
            enum: this.validateNumberInput
        };

        /**
         * A library of operations supported by this rule evaluator. Each operation
         * consists of the following fields:
         * operation: a function with boolean return type to be invoked when this
         *            operation is used. Will be called with an array of inputs
         *            where input [0] is the telemetry value and input [1..n] are
         *            any comparison values
         * text: a human-readable description of this operation to populate selects
         * appliesTo: an array of identifiers for types that operation may be used on
         * inputCount: the number of inputs required to get any necessary comparison
         *             values for the operation
         * getDescription: A function returning a human-readable shorthand description of
         *                this operation to populate the 'description' field in the rule header.
         *                Will be invoked with an array of a condition's comparison values.
         */
        this.operations = {
            equalTo: {
                operation: function (input) {
                    return input[0] === input[1];
                },
                text: 'is equal to',
                appliesTo: ['number'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' == ' + values[0];
                }
            },
            notEqualTo: {
                operation: function (input) {
                    return input[0] !== input[1];
                },
                text: 'is not equal to',
                appliesTo: ['number'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' != ' + values[0];
                }
            },
            greaterThan: {
                operation: function (input) {
                    return input[0] > input[1];
                },
                text: 'is greater than',
                appliesTo: ['number'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' > ' + values[0];
                }
            },
            lessThan: {
                operation: function (input) {
                    return input[0] < input[1];
                },
                text: 'is less than',
                appliesTo: ['number'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' < ' + values[0];
                }
            },
            greaterThanOrEq: {
                operation: function (input) {
                    return input[0] >= input[1];
                },
                text: 'is greater than or equal to',
                appliesTo: ['number'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' >= ' + values[0];
                }
            },
            lessThanOrEq: {
                operation: function (input) {
                    return input[0] <= input[1];
                },
                text: 'is less than or equal to',
                appliesTo: ['number'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' <= ' + values[0];
                }
            },
            between: {
                operation: function (input) {
                    return input[0] > input[1] && input[0] < input[2];
                },
                text: 'is between',
                appliesTo: ['number'],
                inputCount: 2,
                getDescription: function (values) {
                    return ' between ' + values[0] + ' and ' + values[1];
                }
            },
            notBetween: {
                operation: function (input) {
                    return input[0] < input[1] || input[0] > input[2];
                },
                text: 'is not between',
                appliesTo: ['number'],
                inputCount: 2,
                getDescription: function (values) {
                    return ' not between ' + values[0] + ' and ' + values[1];
                }
            },
            textContains: {
                operation: function (input) {
                    return input[0] && input[1] && input[0].includes(input[1]);
                },
                text: 'text contains',
                appliesTo: ['string'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' contains ' + values[0];
                }
            },
            textDoesNotContain: {
                operation: function (input) {
                    return input[0] && input[1] && !input[0].includes(input[1]);
                },
                text: 'text does not contain',
                appliesTo: ['string'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' does not contain ' + values[0];
                }
            },
            textStartsWith: {
                operation: function (input) {
                    return input[0].startsWith(input[1]);
                },
                text: 'text starts with',
                appliesTo: ['string'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' starts with ' + values[0];
                }
            },
            textEndsWith: {
                operation: function (input) {
                    return input[0].endsWith(input[1]);
                },
                text: 'text ends with',
                appliesTo: ['string'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' ends with ' + values[0];
                }
            },
            textIsExactly: {
                operation: function (input) {
                    return input[0] === input[1];
                },
                text: 'text is exactly',
                appliesTo: ['string'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' is exactly ' + values[0];
                }
            },
            isUndefined: {
                operation: function (input) {
                    return typeof input[0] === 'undefined';
                },
                text: 'is undefined',
                appliesTo: ['string', 'number', 'enum'],
                inputCount: 0,
                getDescription: function () {
                    return ' is undefined';
                }
            },
            isDefined: {
                operation: function (input) {
                    return typeof input[0] !== 'undefined';
                },
                text: 'is defined',
                appliesTo: ['string', 'number', 'enum'],
                inputCount: 0,
                getDescription: function () {
                    return ' is defined';
                }
            },
            enumValueIs: {
                operation: function (input) {
                    return input[0] === input[1];
                },
                text: 'is',
                appliesTo: ['enum'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' == ' + values[0];
                }
            },
            enumValueIsNot: {
                operation: function (input) {
                    return input[0] !== input[1];
                },
                text: 'is not',
                appliesTo: ['enum'],
                inputCount: 1,
                getDescription: function (values) {
                    return ' != ' + values[0];
                }
            }
        };
    }

    /**
     * Evaluate the conditions passed in as an argument, and return the boolean
     * value of these conditions. Available evaluation modes are 'any', which will
     * return true if any of the conditions evaluates to true (i.e. logical OR); 'all',
     * which returns true only if all conditions evalute to true (i.e. logical AND);
     * or 'js', which returns the boolean value of a custom JavaScript conditional.
     * @param {} conditions Either an array of objects with object, key, operation,
     *                      and value fields, or a string representing a JavaScript
     *                      condition.
     * @param {string} mode The key of the mode to use when evaluating the conditions.
     * @return {boolean} The boolean value of the conditions
     */
    ConditionEvaluator.prototype.execute = function (conditions, mode) {
        var active = false,
            conditionValue,
            conditionDefined = false,
            self = this,
            firstRuleEvaluated = false,
            compositionObjs = this.compositionObjs;

        if (mode === 'js') {
            active = this.executeJavaScriptCondition(conditions);
        } else {
            (conditions || []).forEach(function (condition) {
                conditionDefined = false;
                if (condition.object === 'any') {
                    conditionValue = false;
                    Object.keys(compositionObjs).forEach(function (objId) {
                        try {
                            conditionValue = conditionValue
                                || self.executeCondition(objId, condition.key,
                                    condition.operation, condition.values);
                            conditionDefined = true;
                        } catch (e) {
                            //ignore a malformed condition
                        }
                    });
                } else if (condition.object === 'all') {
                    conditionValue = true;
                    Object.keys(compositionObjs).forEach(function (objId) {
                        try {
                            conditionValue = conditionValue
                                && self.executeCondition(objId, condition.key,
                                    condition.operation, condition.values);
                            conditionDefined = true;
                        } catch (e) {
                            //ignore a malformed condition
                        }
                    });
                } else {
                    try {
                        conditionValue = self.executeCondition(condition.object, condition.key,
                            condition.operation, condition.values);
                        conditionDefined = true;
                    } catch (e) {
                        //ignore malformed condition
                    }
                }

                if (conditionDefined) {
                    active = (mode === 'all' && !firstRuleEvaluated ? true : active);
                    firstRuleEvaluated = true;
                    if (mode === 'any') {
                        active = active || conditionValue;
                    } else if (mode === 'all') {
                        active = active && conditionValue;
                    }
                }
            });
        }

        return active;
    };

    /**
     * Execute a condition defined as an object.
     * @param {string} object The identifier of the telemetry object to retrieve data from
     * @param {string} key The property of the telemetry object
     * @param {string} operation The key of the operation in this ConditionEvaluator to executeCondition
     * @param {string} values An array of comparison values to invoke the operation with
     * @return {boolean} The value of this condition
     */
    ConditionEvaluator.prototype.executeCondition = function (object, key, operation, values) {
        var cache = (this.useTestCache ? this.testCache : this.subscriptionCache),
            telemetryValue,
            op,
            input,
            validator;

        if (cache[object] && typeof cache[object][key] !== 'undefined') {
            let value = cache[object][key];
            telemetryValue = [isNaN(Number(value)) ? value : Number(value)];
        }

        op = this.operations[operation] && this.operations[operation].operation;
        input = telemetryValue && telemetryValue.concat(values);
        validator = op && this.inputValidators[this.operations[operation].appliesTo[0]];

        if (op && input && validator) {
            if (this.operations[operation].appliesTo.length > 1) {
                return (this.validateNumberInput(input) || this.validateStringInput(input)) && op(input);
            } else {
                return validator(input) && op(input);
            }
        } else {
            throw new Error('Malformed condition');
        }
    };

    /**
     * A function that returns true only if each value in its input argument is
     * of a numerical type
     * @param {[]} input An array of values
     * @returns {boolean}
     */
    ConditionEvaluator.prototype.validateNumberInput = function (input) {
        var valid = true;
        input.forEach(function (value) {
            valid = valid && (typeof value === 'number');
        });

        return valid;
    };

    /**
     * A function that returns true only if each value in its input argument is
     * a string
     * @param {[]} input An array of values
     * @returns {boolean}
     */
    ConditionEvaluator.prototype.validateStringInput = function (input) {
        var valid = true;
        input.forEach(function (value) {
            valid = valid && (typeof value === 'string');
        });

        return valid;
    };

    /**
     * Get the keys of operations supported by this evaluator
     * @return {string[]} An array of the keys of supported operations
     */
    ConditionEvaluator.prototype.getOperationKeys = function () {
        return Object.keys(this.operations);
    };

    /**
     * Get the human-readable text corresponding to a given operation
     * @param {string} key The key of the operation
     * @return {string} The text description of the operation
     */
    ConditionEvaluator.prototype.getOperationText = function (key) {
        return this.operations[key].text;
    };

    /**
     * Returns true only if the given operation applies to a given type
     * @param {string} key The key of the operation
     * @param {string} type The value type to query
     * @returns {boolean} True if the condition applies, false otherwise
     */
    ConditionEvaluator.prototype.operationAppliesTo = function (key, type) {
        return (this.operations[key].appliesTo.includes(type));
    };

    /**
     * Return the number of value inputs required by an operation
     * @param {string} key The key of the operation to query
     * @return {number}
     */
    ConditionEvaluator.prototype.getInputCount = function (key) {
        if (this.operations[key]) {
            return this.operations[key].inputCount;
        }
    };

    /**
     * Return the human-readable shorthand description of the operation for a rule header
     * @param {string} key The key of the operation to query
     * @param {} values An array of values with which to invoke the getDescription function
     *                  of the operation
     * @return {string} A text description of this operation
     */
    ConditionEvaluator.prototype.getOperationDescription = function (key, values) {
        if (this.operations[key]) {
            return this.operations[key].getDescription(values);
        }
    };

    /**
     * Return the HTML input type associated with a given operation
     * @param {string} key The key of the operation to query
     * @return {string} The key for an HTML5 input type
     */
    ConditionEvaluator.prototype.getInputType = function (key) {
        var type;
        if (this.operations[key]) {
            type = this.operations[key].appliesTo[0];
        }

        if (this.inputTypes[type]) {
            return this.inputTypes[type];
        }
    };

    /**
     * Returns the HTML input type associated with a value type
     * @param {string} dataType The JavaScript value type
     * @return {string} The key for an HTML5 input type
     */
    ConditionEvaluator.prototype.getInputTypeById = function (dataType) {
        return this.inputTypes[dataType];
    };

    /**
     * Set the test data cache used by this rule evaluator
     * @param {object} testCache A mock cache following the format of the real
     *                           subscription cache
     */
    ConditionEvaluator.prototype.setTestDataCache = function (testCache) {
        this.testCache = testCache;
    };

    /**
     * Have this RuleEvaluator pull data values from the provided test cache
     * instead of its actual subscription cache when evaluating. If invoked with true,
     * will use the test cache; otherwise, will use the subscription cache
     * @param {boolean} useTestData Boolean flag
     */
    ConditionEvaluator.prototype.useTestData = function (useTestCache) {
        this.useTestCache = useTestCache;
    };

    return ConditionEvaluator;
});
