class EmptyZ_Generator
{
    constructor(){
        /** Unique name */
        this.name = '';

        /** One or more paragraphs */
        this.description = '';

        /** Starting recipe with at least one curly brace replace */
        this.recipe = '';

        /** Rules for repeats */
        this.repeat = '';

        /** List of supporting tables */
        this.tables = new Map();

        /** List of counters */
        this.counters = new Map();
    }

    // Expecting patterns like "3", "3d6", or "3d6+4"
    static DICE_ROLL_REGEX() { return /(\d+)d?(\d+)?([\+\-]\d+)?/; }

    // Expecting patterns like "3d6+4 gems" or "3d6 level <br>"
    static REPEATER_REGEX() { return /(\S+)\s(\S+)\s?(\S+)?/; }

    static COUNTER_REGEX() { return /\#\s?(\S+)/; }

    static BREAK_REGEX() { return /break\d*/; }

    static BLANK_REGEX() { return /blank/; }

    /**
     * Create an instance of Generator from import data
     */
    static import(data) {
        let g = new this;
        let chunk = '';
        let mode = false;
        let chunkRegex = new RegExp('^([a-z]+):(.*)');
        let m = false;

        data.split(/[\r\n]+/).forEach(function(line) {
            // Look for "{type}: {data}"
            if (m = line.match(chunkRegex)) {
                // New chunk, so finish existing chunk
                if (mode) {
                    g.doChunk(mode, chunk);
                }
                // Setup for new chunk
                chunk = m[2] + "\n";
                mode = m[1];
            } else {
                chunk = chunk + line + "\n";
            }

        });

        // Finish last chunk
        g.doChunk(mode, chunk);

        return g;
    }

    /**
     * Process a chunk
     * @param string type
     * @param string data
     */
    doChunk(type, data) {
        switch(type) {
            case 'name':
                this.name = EmptyZ_Generator.cleanWhitespace(data);
                break;
            case 'description':
                this.description = EmptyZ_Generator.cleanWhitespace(data);
                break;
            case 'recipe':
                this.recipe = EmptyZ_Generator.cleanWhitespace(data);
                break;
            case 'repeat':
                this.repeat = EmptyZ_Generator.cleanWhitespace(data);
                break;
            case 'table':
                let t = EmptyZ_Table.import('table: ' + data);
                this.tables[t.name] = t;
                break;
            default:
                // Unrecognized type. Throw it away.
        }
    }


    /**
     * Turn linebreaks into spaces. Collapse multiple spaces into one. Trim
     * whitespace from ends.
     */
    static cleanWhitespace(data) {
        data = data.replace(/[\r\n]+/g, ' ');
        data = data.replace(/\s+/g, ' ');
        return data.trim();
    }


    /**
     *  Accepts 1, 2d4, 2d4+5, 3d6-1
     */
    static computeRoll(spec) {
        let match = spec.match(this.DICE_ROLL_REGEX());
        if (!match) {
            console.log(spec + " doesn't match");
            return false;
        }
        let rolls = parseInt(match[1]);
        let sides = (typeof match[2] !== 'undefined') ? parseInt(match[2]) : 1;
        let bonus = (typeof match[3] !== 'undefined') ? parseInt(match[3]) : 0;
        let t = bonus;
        for(var r = 0; r < rolls; r++) {
            t = t + 1 + Math.floor(Math.random() * Math.floor(sides));
        }
        return t;
    }

    /**
     * Execute the recipe
     * @param int count
     */
    run(count = 1) {
        // Repeat rules: single value, dice roll spec, "choose"
        // e.g. 1, 2d6, choose
        if (this.repeat != 'choose') {
            count = EmptyZ_Generator.computeRoll(this.repeat);
        }

        // Recipe should be plain text with embedded curly braces that match table
        // names. e.g. "See {animal}". Loop over recipe, grab the first table name,
        // replace it with a lookup. Loop again until no curly braces remain.
        let result = '';
        for (var i = 1; i <= count; i++) {
            let recipe = this.recipe;
            while (recipe.indexOf('{') > -1) {
                // Get the first curly brace expression
                let m = recipe.match(/{([^}]+)}/);

                // Check of m matches a break or blank pattern first, since those aren't looked up
                if (m[1].match(EmptyZ_Generator.BREAK_REGEX())) {
                    // Replace all {break} with <br>
                    recipe = recipe.replace(/{break}/g, "<br>\n");
                    recipe = recipe.replace(/{break2}/g, "<br>\n<br>\n");
                    continue;
                }
                if (m[1].match(EmptyZ_Generator.BLANK_REGEX())) {
                    // Replace {blank} with empty string
                    recipe = recipe.replace(/{blank}/g, '');
                    continue;
                }

                // Is it a counter?
                let counter = m[1];
                if (counter.match(EmptyZ_Generator.COUNTER_REGEX())) {
                    let counterName = counter.match(EmptyZ_Generator.COUNTER_REGEX())[1] || 'default';
                    // If the map doesn't have this counter, initialize it
                    if (typeof this.counters[counterName] === 'undefined') {
                        this.counters[counterName] = 0;
                    }
                    // Increment the counter
                    this.counters[counterName]++;

                    // Replace the first counter reference
                    recipe = recipe.replace('{' + counter + '}', this.counters[counterName]);
                    continue;
                }

                // Is it a repeater
                let repeater = m[1];
                if (repeater.match(EmptyZ_Generator.REPEATER_REGEX())) {
                    let spec = repeater.match(EmptyZ_Generator.REPEATER_REGEX())[1];
                    let table = repeater.match(EmptyZ_Generator.REPEATER_REGEX())[2];
                    let separator = repeater.match(EmptyZ_Generator.REPEATER_REGEX())[3] || ', ';

                    // Are the two parts a dice roll and a table name?
                    if (
                        spec.match(EmptyZ_Generator.DICE_ROLL_REGEX())
                        && (
                            typeof this.tables[table] !== 'undefined'
                            || table.match(EmptyZ_Generator.DICE_ROLL_REGEX())
                        )
                    ) {
                        // Get the number of repetitions
                        let roll = parseInt(EmptyZ_Generator.computeRoll(spec));
                        // Replace the repeater with that many table/roll references
                        recipe = recipe.replace(
                            '{' + repeater + '}',
                            Array(roll).fill('{' + table + '}').join(separator)
                            );
                    } else {
                        recipe = recipe.replace('{' + repeater + '}', '[' + repeater + ' broken repeater]');
                    }
                    continue;
                }

                // Does it match a table name?
                let tableName = m[1];
                if (typeof this.tables[tableName] !== 'undefined') {
                    let table = this.tables[tableName];
                    // Replace the first table reference
                    recipe = recipe.replace('{' + tableName + '}', table.run());
                    continue;
                }

                // Is it a dice roll?
                let spec = m[1];
                if (spec.match(EmptyZ_Generator.DICE_ROLL_REGEX())) {
                    let roll = EmptyZ_Generator.computeRoll(spec);
                    if (roll !== false) {
                        // Replace the first dice spec
                        recipe = recipe.replace('{' + spec + '}', roll);
                        continue;
                    }
                }

                // Unknown pattern. Replace with debug string.
                recipe = recipe.replace('{' + tableName + '}', '[' + tableName + ' not found]');
            }
            result = result + recipe + "\n";
        }
        return result;
    }

    /**
     * Set the recipe and run the generator
     * @param string recipe
     */
    runRecipe(recipe) {
        this.recipe = recipe;
        return this.run();
    }
}

class EmptyZ_Table
{
    constructor() {
        /** Unique name */
        this.name = '';

        /** Roll 1d{range} */
        this.roll = '';

        /** Name shown in list */
        this.label = '';

        /** Array of choices like choice['3-6'] = 'result'; */
        this.choices = new Array();
    }

    /**
     * Create instance from a given multi-line string
     * @param string data
     * @returns Table
     */
    static import(data) {
        let t = new this;
        let chunk = '';
        data.split(/[\r\n]+/).forEach(function(line) {
            let m = false;
            // Look for "table: <name> <roll> <label>"
            if (t.name == '' && (m = line.match(/^table:\s+(\S+)(\s\S+)?(\s.+)?/))) {
                t.name = m[1].trim();
                if (m[2]) {
                    t.roll = m[2].trim();
                }
                if (m[3]) {
                    t.label = m[3].trim();
                }
            } else if (m = line.match(/^(\S+)(.*)/)) {
                // Process the current chunk
                if (chunk) {
                    t.addChoice(chunk);
                }
                // Start a new chunk
                chunk = line;
            } else {
                // Add line to existing chunk
                chunk = chunk + ' ' + line.trim();
            }
        });
        // Complete the last chunk
        t.addChoice(chunk);

        // Figure out the range of random values
        if (t.roll.length == 0) {
            let maxValue = 0;
            let len = t.choices.length;

            for (var i = 0; i < len; i++) {
                let c = t.choices[i];
                if (c.high > maxValue) {
                    maxValue = c.high;
                }
            }
            t.roll = '1d' + maxValue;
        }

        return t;
    }

    /**
     * Process a chunk
     * @param string data
     */
    addChoice(data) {
        let m = data.match(/^(\S+)\s+(.+)/);
        if (!m) {
            return;
        }
        let low = m[1];
        let high = low;
        let result = m[2].trim();
        if (m = low.match(/(\d+)-(\d+)/)) {
            low = m[1];
            high = m[2];
        }
        let tc = new EmptyZ_TableChoice(low, high, result);
        this.choices.push(tc);
    }

    /**
     * Generate a value from the table
     */
    run(forceRoll = false) {
        let roll = 0;
        if (forceRoll === false) {
            roll = EmptyZ_Generator.computeRoll(this.roll);
        } else {
            roll = forceRoll;
        }
        let len = this.choices.length;
        for (var i = 0; i < len; i++) {
            let c = this.choices[i];
            if (roll >= c.low && roll <= c.high) {
                return c.result;
            }
        }
        // Default catch-all in case a table has gaps
        return '[Rolled ' + roll + ' on ' + this.name + ']';
    }
}


class EmptyZ_TableChoice
{
    constructor(low, high, result) {
        this.low = low;
        this.high = high;
        this.result = result;
    }
}

class EmptyZ_UI_MageSpellbook
{
    static setup(el) {
        let container = el;
        let params = document.createElement('div');
        params.className = 'params';
        let selectLevel = document.createElement('select');
        selectLevel.name = 'level';
        for (var i=1; i <=20 ; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            selectLevel.appendChild(option);
        }
        const label = document.createElement('label');
        label.setAttribute('for', 'level');
        label.textContent = 'Mage Level';
        params.appendChild(label);
        params.appendChild(selectLevel);
        container.appendChild(params);
    }

    static run(el) {
        // How many spells a mage gets per level
        let spellsPerLevel = [
            [ 1, 0, 0, 0, 0, 0, ],
            [ 2, 0, 0, 0, 0, 0, ],
            [ 2, 1, 0, 0, 0, 0, ],
            [ 2, 2, 0, 0, 0, 0, ],
            [ 2, 2, 1, 0, 0, 0, ],
            [ 3, 2, 2, 0, 0, 0, ],
            [ 3, 2, 2, 1, 0, 0, ],
            [ 3, 3, 2, 2, 0, 0, ],
            [ 3, 3, 2, 2, 1, 0, ],
            [ 4, 3, 3, 2, 2, 0, ],
            [ 4, 4, 3, 2, 2, 1, ],
            [ 4, 4, 3, 3, 2, 2, ],
            [ 4, 4, 4, 3, 2, 2, ],
            [ 4, 4, 4, 3, 3, 2, ],
            [ 5, 4, 4, 3, 3, 2, ],
            [ 5, 5, 4, 3, 3, 2, ],
            [ 5, 5, 4, 4, 3, 3, ],
            [ 6, 5, 4, 4, 3, 3, ],
            [ 6, 5, 5, 4, 3, 3, ],
            [ 6, 5, 5, 4, 4, 3, ],
            ];
        // By count of spells, 1 stdev of adjustment
        let adjustmentToCount = [ 0, 1, 1, 1, 2, 2 ];

        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];
        let output = container.querySelector('div.output');
        let level = parseInt(container.querySelector('select[name="level"]').value);

        let book = {};
        for (var sl in spellsPerLevel[level - 1]) {
            let spellLevel = parseInt(sl);
            let spells = spellsPerLevel[level - 1][spellLevel];
            if (spells > 0) {
                // Adjust count up or down roughly like a bell curve
                let roll = EmptyZ_Generator.computeRoll('1d100');
                let direction = 1;
                if (EmptyZ_Generator.computeRoll('1d2') == 2) {
                    direction = -1;
                }
                if (roll >= 95) {
                    spells = spells + (direction * 3 * adjustmentToCount[spells - 1]);
                } else if (roll >= 68) {
                    spells = spells + (direction * 2 * adjustmentToCount[spells - 1]);
                }
                if (spells < 0) {
                    spells = 0;
                }
                for (var s = 0; s < spells; s++) {
                    generator.recipe = '{mage-spells-' + (spellLevel + 1) + '}';
                    let spell = generator.run().trim();
                    if (typeof book[spellLevel] == 'undefined') {
                        book[spellLevel] = {};
                    }
                    book[spellLevel][spell] = spell;
                }
            }
        }

        for (var sl in book) {
            let spellLevel = parseInt(sl);
            output.insertAdjacentHTML(
                'beforeend',
                '<p><strong>Level ' + (spellLevel + 1) + ':</strong> '
                + Object.values(book[spellLevel]).join(', ') + '</p>'
            );
        }
    }
}

class EmptyZ_UI_ClericSpells
{
    static setup(el) {
        let container = el;
        let params = document.createElement('div');
        params.className = 'params';
        let selectLevel = document.createElement('select');
        selectLevel.name = 'level';
        for (var i=2; i <=20 ; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            selectLevel.appendChild(option);
        }
        const label = document.createElement('label');
        label.setAttribute('for', 'level');
        label.textContent = 'Cleric Level';
        params.appendChild(label);
        params.appendChild(selectLevel);
        container.appendChild(params);
    }

    static run(el) {
        // How many spells a cleric gets per level
        let spellsPerLevel = [
            [0, 0, 0, 0, 0, 0],
            [1, 0, 0, 0, 0, 0],
            [2, 0, 0, 0, 0, 0],
            [2, 1, 0, 0, 0, 0],
            [2, 2, 0, 0, 0, 0],
            [2, 2, 1, 0, 0, 0],
            [3, 2, 2, 0, 0, 0],
            [3, 2, 2, 1, 0, 0],
            [3, 3, 2, 2, 0, 0],
            [3, 3, 2, 2, 1, 0],
            [4, 3, 3, 2, 2, 0],
            [4, 4, 3, 2, 2, 1],
            [4, 4, 3, 3, 2, 2],
            [4, 4, 4, 3, 2, 2],
            [4, 4, 4, 3, 3, 2],
            [5, 4, 4, 3, 3, 2],
            [5, 5, 4, 3, 3, 2],
            [5, 5, 4, 4, 3, 3],
            [6, 5, 4, 4, 3, 3],
            [6, 5, 5, 4, 3, 3]
        ];

        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];
        let output = container.querySelector('div.output');
        let level = parseInt(container.querySelector('select[name="level"]').value);

        let memorized = {};
        for (var sl in spellsPerLevel[level - 1]) {
            let spellLevel = parseInt(sl);
            let spells = spellsPerLevel[level - 1][spellLevel];
            if (spells > 0) {
                for (var s = 0; s < spells; s++) {
                    generator.recipe = '{cleric-spells-' + (spellLevel + 1) + '}';
                    let spell = generator.run().trim();
                    if (typeof memorized[spellLevel] == 'undefined') {
                        memorized[spellLevel] = {};
                    }
                    if (typeof memorized[spellLevel][spell] == 'undefined') {
                        memorized[spellLevel][spell] = 0;
                    }
                    memorized[spellLevel][spell]++;
                }
            }
        }

        for (var sl in memorized) {
            let spellLevel = parseInt(sl);
            let spellList = [];
            for (var s in memorized[spellLevel]) {
                spellList.push(s + ' (' + memorized[spellLevel][s] + ')');
            }
            output.insertAdjacentHTML(
                'beforeend',
                '<p><strong>Level ' + (spellLevel + 1) + ':</strong> '
                + spellList.join(', ') + '</p>'
            );
        }
    }
}

class EmptyZ_UI_Death
{
    static setup(el) {
        let container = el;
        container.insertAdjacentHTML('beforeend', '<div class="params">'
            + '<label for="level">Class Level (1 to 20)</label>'
            + '<input type="number" name="level" min="1" max="20" value="1">'
            + '<label for="con">CON Bonus (-3 to +3)</label> '
            + '<input type="number" name="con" min="-3" max="3" value="0">'
            + '<label for="hp">Current HP (0 or less)</label>'
            + '<input type="number" name="hp" min="-100" max="0" value="0">'
            + '</div>'
        );
    }

    static run(el) {
        // compute roll and just do a straight lookup
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let output = container.querySelector('div.output');
        let level = parseInt(container.querySelector('input[name="level"]').value);
        let con = parseInt(container.querySelector('input[name="con"]').value);
        let hp = parseInt(container.querySelector('input[name="hp"]').value);
        if (Number.isNaN(level) || Number.isNaN(con) || Number.isNaN(hp)) {
            output.insertAdjacentHTML('beforeend', 'INVALID INPUT');
            return;
        }
        let generator = EmptyZ_Generators[tableID];
        let adjustment = con + Math.round(hp/level);
        let rollSpec = '2d6' + (adjustment >= 0 ? '+' : '') + adjustment
        let result = EmptyZ_Generator.computeRoll(rollSpec);
        let roll = Math.min(Math.max(result, 2), 12);
        generator.recipe = generator.tables['deadly_blow'].run(roll);
        output.insertAdjacentHTML(
            'beforeend',
            '<h2>Your Spectacular Demise</h2>'
            + '<p>'
            + '<strong>Rolling ' + rollSpec + ', results in a ' + result + '!</strong> '
            + generator.run()
            + '</p>'
        );
    }
}

class EmptyZ_UI_Encounters
{
    static setup(el) {
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];
        let params = document.createElement('div');
        params.className = 'params';
        let selectLocation = document.createElement('select');
        selectLocation.name = 'location';
        for (var t in generator.tables) {
            let table = generator.tables[t];
            if (table.label) {
                const option = document.createElement('option');
                option.value = table.name;
                option.textContent = table.label;
                selectLocation.appendChild(option);
            }
        }
        params.insertAdjacentHTML('beforeend', '<label for="location">Location</label>');
        params.appendChild(selectLocation);
        params.insertAdjacentHTML('beforeend', '<label for="count">Count</label>');
        params.insertAdjacentHTML('beforeend', '<input type="number" name="count" min="1" max="100" value="1">');
        container.appendChild(params);
    }

    static run(el) {
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let location = container.querySelector('select[name="location"]').value;
        let count = container.querySelector('input[name="count"]').value;
        let generator = EmptyZ_Generators[tableID];
        generator.recipe = '{' + location + '}';
        generator.repeat = count;
        let output = container.querySelector('div.output');
        if (count == 1) {
            output.insertAdjacentHTML('beforeend', '<p>' + generator.run() + '</p>');
        } else {
            let i=1;
            let rows = '';
            generator.run().trim().split(/[\r\n]+/).forEach(function(line) {
                rows += '<tr><td>'+i+'</td><td>' + line + '</tr>';
                i++;
            });
            output.insertAdjacentHTML('beforeend', '<table>' + rows + '</table>');
        }
    }
}

class EmptyZ_UI_1eDmgDisease
{
    static setup(el) {
        let container = el;
        container.insertAdjacentHTML('beforeend', '<div class="params">'
            + '<label for="con-count">CON Bonus (-3 to +3)</label> '
            + '<input type="number" name="con" min="-3" max="3" value="0"><br>'
            + '<div style="column-count: 2;">'
            + '<label><input type="checkbox" name="diseased" value="1"> Already Diseased</label><br>'
            + '<label><input type="checkbox" name="lowhp" value="1"> Low Hit Points</label><br>'
            + '<label><input type="checkbox" name="crowded" value="1"> Crowded Conditions</label><br>'
            + '<label><input type="checkbox" name="filthy" value="1"> Filthy Conditions</label><br>'
            + '<label><input type="checkbox" name="old" value="1"> Old Age</label> or <br>'
            + '<label><input type="checkbox" name="venerable" value="1"> Venerable Age</label><br>'
            + '<label><input type="checkbox" name="jungle" value="1"> Jungle, Marsh, Swamp</label><br>'
            + '<label><input type="checkbox" name="hot" value="1"> Hot, Humid Climate</label><br>'
            + '<label><input type="checkbox" name="exposed" value="1"> Exposed to Infected</label><br>'
            + '<label><input type="checkbox" name="cool" value="1"> Cool Weather</label> or <br>'
            + '<label><input type="checkbox" name="cold" value="1"> Cold Weather</label><br>'
            + '<label><input type="checkbox" name="shipboard" value="1"> Shipboard for 2+ Weeks</label><br>'
            + '<label><input type="checkbox" name="meat" value="1"> Ate Bad Meat</label><br>'
            + '<label><input type="checkbox" name="water" value="1"> Drank Polluted Water</label><br>'
            + '</div>'
            + '</div>'
        );
    }

    static run(el) {
        let container = el;
        let output = container.querySelector('div.output');
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];
        let con = parseInt(container.querySelector('input[name="con"]').value);
        if (isNaN(con)) {
            con = 0;
        }
        let chanceDisease = 2 - con;
        let chanceParasite = 3 - con;
        let checkboxes = {
            diseased: [1, 0],
            lowhp: [2, 0],
            crowded: [1, 0],
            filthy: [1, 1],
            old: [2, 0],
            venerable: [5, 0],
            jungle: [2, 5],
            hot: [2, 0],
            exposed: [10, 0],
            cool: [-1, -1],
            cold: [-2, -1],
            shipboard: [-2, 0],
            meat: [0, 2],
            water: [0, 5]
            };
        for (var adj in checkboxes) {
            if (container.querySelector('input[name="'+adj+'"]:checked')) {
                chanceDisease += checkboxes[adj][0];
                chanceParasite += checkboxes[adj][1];
            }
        }

        let result = '<p>Chance of disease: ' + chanceDisease + '%; ';
        let roll = EmptyZ_Generator.computeRoll('1d100');
        result += 'Rolled a ' + roll + '! ';
        if (roll <= chanceDisease) {
            generator.recipe = '{disease-type}';
            result += generator.run();
        } else {
            result += 'Not Diseased';
        }
        output.insertAdjacentHTML('beforeend', result + '</p>');

        result = '<p>Chance of parasite: ' + chanceParasite + '%; ';
        roll = EmptyZ_Generator.computeRoll('1d100');
        result += 'Rolled a ' + roll + '! ';
        if (roll <= chanceParasite) {
            generator.recipe = '{parasite-type}';
            result += generator.run();
        } else {
            result += 'No Parasite';
        }
        output.insertAdjacentHTML('beforeend', result + '</p>');
    }
}

class EmptyZ_UI_UnderdarkTunnels
{
    static setup(el) {
        let container = el;
        container.insertAdjacentHTML('beforeend', '<div class="params">'
            + '<label for="segment-count">Number of Segments</label> '
            + '<input type="number" name="segment-count" min="1" max="100" value="1" style="width: 4em;"><br>'
            + '<label for="tunnel-type">Dry / Wet</label> '
            + '<select name="tunnel-type">'
            + '<option value="dry">Dry Tunnel</option>'
            + '<option value="wet">Waterway</option>'
            + '</select><br>'
            + '<label for="segment-count">Max Length (in feet, 0=none)</label> '
            + '<input type="number" name="max-length" min="0" max="100000" value="0" style="width: 8em;"><br>'
            + '</div>'
        );
    }

    static run(el) {
        let container = el;
        let output = container.querySelector('div.output');
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];
        let segmentCount = parseInt(container.querySelector('input[name="segment-count"]').value);
        if (isNaN(segmentCount)) {
            segmentCount = 0;
        }
        let tunnelType = container.querySelector('select[name="tunnel-type"]').value;
        let maxLength = parseInt(container.querySelector('input[name="max-length"]').value);
        if (isNaN(maxLength)) {
            maxLength = 0;
        }
        let totalLength = 0;

        for(let i = 1; i <= segmentCount; i++) {
            if (maxLength > 0 && totalLength > maxLength) {
                break;
            }

            output.insertAdjacentHTML('beforeend', '<h3>Segment ' + i + '</h3>');
            let result = '<p>';
            if (tunnelType == 'dry') {
                if (i == 1) {
                    // First segment, generate everything
                    generator.recipe = '{underdark_1a}';
                    let length = generator.run();
                    totalLength += parseInt(length);
                    generator.recipe = 'Length: ' + length + '<br>'
                        + 'Height/Width: {underdark_1b}<br>'
                        + 'Slope: {underdark_1c}<br>'
                        + 'Direction: {underdark_1d}<br>'
                        + 'Floor Texture: {underdark_1e}<br>'
                        + 'Floor Condition: {underdark_1f}<br>'
                        + 'Air Supply: {underdark_1g}<br>'
                        + 'Illumination: {underdark_1h}<br>';
                    result += generator.run();
                } else {
                    // Length changes every segment
                    generator.recipe = '{underdark_1a}';
                    let length = generator.run();
                    totalLength += parseInt(length);
                    result += 'Length: ' + length + '<br>';
                    // subsequent segments, figure out what changes
                    let changes = parseInt(generator.runRecipe('{underdark_1j}'));
                    generator.recipe = '{underdark_1k}';
                    for(let j = 1; j <= changes; j++) {
                        result += generator.run() + '<br>';
                    }
                }
            } else {
                if (i == 1) {
                    // First segment, generate everything
                    generator.recipe = '{underdark_3a}';
                    let length = generator.run();
                    totalLength += parseInt(length);
                    generator.recipe = 'Length: ' + length + '<br>'
                    + 'Width: {underdark_3b}<br>'
                    + 'Water Depth: {underdark_3c}<br>'
                    + 'Ceiling Height: {underdark_3d}<br>'
                    + 'Rate of Flow: {underdark_3e}<br>'
                    + 'Direction: {underdark_3f}<br>'
                    + 'Water Temperature: {underdark_3g}<br>'
                    + 'Air Supply: {underdark_3h}<br>'
                    + 'Illumination: {underdark_3i}<br>';
                    result += generator.run();
                } else {
                    // Length changes every segment
                    generator.recipe = '{underdark_3a}';
                    let length = generator.run();
                    totalLength += parseInt(length);
                    result += 'Length: ' + length + '<br>';
                    // subsequent segments, figure out what changes
                    let changes = parseInt(generator.runRecipe('{underdark_3k}'));
                    generator.recipe = '{underdark_3l}';
                    for(let j = 1; j <= changes; j++) {
                        result += generator.run() + '<br>';
                    }
                }
            }

            result += '</p>';
            output.insertAdjacentHTML('beforeend', result);
        }

        output.insertAdjacentHTML('beforeend', '<p>Total Length: '+totalLength+'\'</p>');
    }
}

class EmptyZ_UI_Reaction
{
    static setup(el) {
        let container = el;
        container.insertAdjacentHTML('beforeend', '<div class="params">'
             + '<label for="adjustment">Adjustement</label>'
            + '<input type="number" name="adjustment" value="0" min="-6" max="6" placeholder="Adjustment -6 to +6">'
            + '</div>'
        );
    }

    static run(el) {
        // compute roll and just do a straight lookup
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let adjustment = parseInt(container.querySelector('input[name="adjustment"]').value);
        if (Number.isNaN(adjustment)) {
            return;
        }
        let generator = EmptyZ_Generators[tableID];
        let rollSpec = '2d6' + (adjustment >= 0 ? '+' : '') + adjustment
        let result = EmptyZ_Generator.computeRoll(rollSpec);
        let roll = Math.min(Math.max(result, 2), 12);
        generator.recipe = generator.tables['reaction'].run(roll);
        container.querySelector('div.output').insertAdjacentHTML(
            'beforeend',
            '<p>'
            + generator.run()
            + '</p>'
        );
    }
}

class EmptyZ_UI_BfrpgTreasure
{
    static setup(el) {
        let container = el;
        container.insertAdjacentHTML('beforeend', '<div class="params">'
            + '<label for="type">Treasure Type</label>'
            + '<input type="text" name="type" placeholder="Treasure types separated by spaces" style="width:75%"><br>'
            + '<label for="hd">Dragon HD</label>'
            + '<input type="text" name="hd" placeholder="Dragon HD" style="width:3em" value="6"><br>'
            + '</div>'
        );
    }

    static run(el) {
        // compute roll and just do a straight lookup
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];

        // Get the input for treasure types, dropping to lowercase and stripping
        // anything but letters, numbers and spaces. Good to avoid spurious commas.
        let treasureType = container
            .querySelector('input[name="type"]')
            .value
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ');

        // Start the output
        let treasure = '';

        // List of table names to generate from instead of a treasure type letter
        let specialCases = ['gem', 'jewelry', 'magic', 'weapon', 'armor',
            'potion', 'scroll', 'wand', 'misc', 'rare'];

        // Loop over each type
        treasureType.split(' ').forEach((t) => {
            // Special cases for types:
            if (specialCases.indexOf(t) >= 0) {
                let originalRecipe = generator.recipe;
                generator.recipe = '{' + t + '}';
                treasure += generator.run(1);
                generator.recipe = originalRecipe;
                return;
            }

            // Make sure we have a type-<t>-cp table
            if (typeof generator.tables['type-' + t + '-cp'] === 'undefined') {
                return;
            }

            // The recipe has many table names like "type-a-something", and
            // we'll replace the treasure type with the selected one.
            generator.recipe = generator.recipe.replace(
                /type-[a-z0-9]+-/g,
                'type-' + t.toLowerCase() + '-'
                );
            // Save the output into the running tally of treasure
            treasure += generator.run(1);

            // Handle type H gems, jewelry, and magic
            if (t.startsWith('h') && !t.startsWith('h1')) {
                let dragonHd = parseInt(container.querySelector('input[name="hd"]').value);
                let chance = dragonHd * 5;
                // Loop over the three types
                ['gems', 'jewelry', 'magic'].forEach(function(tablePostfix) {
                    if (EmptyZ_Generator.computeRoll('1d100') <= chance) {
                        // Temporarily replace the recipe
                        let originalRecipe = generator.recipe;
                        generator.recipe = '{dragon-' + tablePostfix + '}';
                        treasure += generator.run(1);
                        generator.recipe = originalRecipe;
                    }
                });
            }

        });

        // Remove "None"
        treasure = treasure.replace(/None( cp| sp| ep| gp| pp)?,?/g, '');

        // Remove trailing whitespace
        treasure = treasure.replace(/\s*$/gm,"");

        // Remove trailing comma
        treasure = treasure.replace(/(^,)|(,$)/g, '');

        if (treasure.length < 1) {
            treasure = 'no treasure';
        }

        container.querySelector('div.output').insertAdjacentHTML(
            'beforeend',
            '<p>' + treasure + '</p>'
        );
    }
}

class EmptyZ_UI_WbOracle
{
    static setup(el) {
        let container = el;
        let params = document.createElement('div');
        params.className = 'params';
        let selectEstimation = document.createElement('select');
        selectEstimation.name = 'estimation';
        [
            ['impossible', 'Practically Impossible'],
            ['very-unlikely', 'Very Unlikely'],
            ['unlikely', 'Unlikely'],
            ['middling', 'Middling'],
            ['likely', 'Likely'],
            ['very-likely', 'Very Likely'],
            ['certain', 'Practically Certain']
        ].forEach(function(item) {
            const option = document.createElement('option');
            option.value = item[0];
            option.textContent = item[1];
            selectEstimation.appendChild(option);
        });
        const label = document.createElement('label');
        label.setAttribute('for', 'estimation');
        label.textContent = 'Probablity Estimation';
        params.appendChild(label);
        params.appendChild(selectEstimation);
        container.appendChild(params);
    }

    static run(el) {
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];
        let estimation = container.querySelector('select[name="estimation"]').value;

        generator.recipe = '{' + estimation + '}';
        container.querySelector('div.output').insertAdjacentHTML(
            'beforeend',
            '<p>' + generator.run() + '</p>'
        );
    }
}

class EmptyZ_UI
{
    static setup(el) {
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        // Load generator definition
        fetch(onedicesix.url + tableID)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to load generator data: HTTP ' + response.status);
            }
            return response.text();
        })
        .then(function(data) {
            // Create generator
            let generator = EmptyZ_Generator.import(data);
            EmptyZ_Generators[tableID] = generator;
            // Add output
            container.innerHTML = '<div class="output"></div>';
            let output = container.querySelector('div.output');
            // Optionally, add more controls
            switch(tableID) {
                case '1e-dmg-disease.txt':
                    EmptyZ_UI_1eDmgDisease.setup(el);
                    break;
                case 'cleric-spells.txt':
                    EmptyZ_UI_ClericSpells.setup(el);
                    break;
                case 'death.txt':
                    EmptyZ_UI_Death.setup(el);
                    break;
                case 'encounters.txt':
                    EmptyZ_UI_Encounters.setup(el);
                    break;
                case 'mage-spells.txt':
                    EmptyZ_UI_MageSpellbook.setup(el);
                    break;
                case 'underdark-tunnels.txt':
                    EmptyZ_UI_UnderdarkTunnels.setup(el);
                    break;
                case 'reaction.txt':
                    EmptyZ_UI_Reaction.setup(el);
                    break;
                case 'bfrpg-treasure.txt':
                    EmptyZ_UI_BfrpgTreasure.setup(el);
                    break;
                case 'wb-oracle.txt':
                    EmptyZ_UI_WbOracle.setup(el);
                    break;
            }
            // Add generate button
            container.insertAdjacentHTML('beforeend', '<button class="emptyz-regenerate wp-element-button" title="Regenerate">Generate '+generator.name+'</button>');
            // Add button to copy results to clipboard
            container.insertAdjacentHTML('beforeend', '<button class="emptyz-copy wp-element-button" style="margin-left: 10px;" title="Copy to clipboard">📋</button>');
            // Add button to save to a file
            container.insertAdjacentHTML('beforeend', '<button class="emptyz-save wp-element-button" style="margin-left: 10px;" title="Save to file">💾</button>');
            // Run it
            EmptyZ_UI.run(el);
            // Activate regenerate button
            container.querySelector('button.emptyz-regenerate').addEventListener('click', function(event) {
                EmptyZ_UI.rerun(event.currentTarget.parentElement);
            });
            // Activate copy button
            container.querySelector('button.emptyz-copy').addEventListener('click', function() {
                const htmlContent = output.innerHTML;

                // Plain text fallback
                const plainText = htmlContent
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/h[1-6]>/gi, '\n')
                    .replace(/<\/?[^>]+(>|$)/g, '')
                    .split('\n').map(line => line.trim())
                    .join('\n').trim();

                const clipboardItem = new ClipboardItem({
                    'text/html': new Blob([htmlContent], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' })
                });

                navigator.clipboard.write([clipboardItem]).then(function() {
                    // Success
                    //alert('Copied to clipboard!');
                }, function(err) {
                    // Error
                    alert('Failed to copy to clipboard: ' + err);
                });
            });
            // Activate save button
            container.querySelector('button.emptyz-save').addEventListener('click', function() {
                const htmlContent = output.innerHTML;
                const fullHtml = `<!DOCTYPE html>` +
                    `<html lang="en">` +
                    `<head>` +
                        `<meta charset="UTF-8">` +
                        `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
                        `<title>${generator.name}</title>` +
                    `</head>` +
                    `<body>` +
                    `${htmlContent}` +
                    `</body>` +
                    `</html>`;
                const blob = new Blob([fullHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = generator.name.replace(/\s+/g, '_').toLowerCase() + '.html';
                document.body.appendChild(a);
                a.click();

                // Clean up
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        })
        .catch(function(err) {
            container.innerHTML = '<div class="output"><p>Failed to load generator data.</p></div>';
            console.error(err);
        });
    }

    static run(el) {
        let container = el;
        let tableID = container.getAttribute('data-table-id');
        let generator = EmptyZ_Generators[tableID];
        generator.counters = new Map();
        let output = container.querySelector('div.output');
        output.innerHTML = '';
        switch(tableID) {
            case '1e-dmg-disease.txt':
                if (typeof EmptyZ_UI_1eDmgDisease.runCount == 'undefined') {
                    EmptyZ_UI_1eDmgDisease.runCount = 0;
                } else {
                    EmptyZ_UI_1eDmgDisease.run(el);
                    EmptyZ_UI_1eDmgDisease.runCount++;
                }
                break;
            case 'cleric-spells.txt':
                if (typeof EmptyZ_UI_ClericSpells.runCount == 'undefined') {
                    EmptyZ_UI_ClericSpells.runCount = 0;
                } else {
                    EmptyZ_UI_ClericSpells.run(el);
                    EmptyZ_UI_ClericSpells.runCount++;
                }
                break;
            case 'death.txt':
                if (typeof EmptyZ_UI_Death.runCount == 'undefined') {
                    EmptyZ_UI_Death.runCount = 0;
                } else {
                    EmptyZ_UI_Death.run(el);
                    EmptyZ_UI_Death.runCount++;
                }
                break;
            case 'encounters.txt':
                if (typeof EmptyZ_UI_Encounters.runCount == 'undefined') {
                    EmptyZ_UI_Encounters.runCount = 0;
                } else {
                    EmptyZ_UI_Encounters.run(el);
                    EmptyZ_UI_Encounters.runCount++;
                }
                break;
            case 'mage-spells.txt':
                if (typeof EmptyZ_UI_MageSpellbook.runCount == 'undefined') {
                    EmptyZ_UI_MageSpellbook.runCount = 0;
                } else {
                    EmptyZ_UI_MageSpellbook.run(el);
                    EmptyZ_UI_MageSpellbook.runCount++;
                }
                break;
            case 'underdark-tunnels.txt':
                if (typeof EmptyZ_UI_UnderdarkTunnels.runCount == 'undefined') {
                    EmptyZ_UI_UnderdarkTunnels.runCount = 0;
                } else {
                    EmptyZ_UI_UnderdarkTunnels.run(el);
                    EmptyZ_UI_UnderdarkTunnels.runCount++;
                }
                break;
            case 'reaction.txt':
                EmptyZ_UI_Reaction.run(el);
                break;
            case 'bfrpg-treasure.txt':
                if (typeof EmptyZ_UI_BfrpgTreasure.runCount == 'undefined') {
                    EmptyZ_UI_BfrpgTreasure.runCount = 0;
                } else {
                    EmptyZ_UI_BfrpgTreasure.run(el);
                    EmptyZ_UI_BfrpgTreasure.runCount++;
                }
                break;
            case 'wb-oracle.txt':
                if (typeof EmptyZ_UI_WbOracle.runCount == 'undefined') {
                    EmptyZ_UI_WbOracle.runCount = 0;
                } else {
                    EmptyZ_UI_WbOracle.run(el);
                    EmptyZ_UI_WbOracle.runCount++;
                }
                break;
            default:
                // Simple generator with fixed recipe. Line breaks are turned
                // into paragraphs. Semicolons turn into BRs. Finally, lines
                // starting with a label and colon get STRONG treatment.
                output.insertAdjacentHTML('beforeend', generator.run());
        }
    }

    static rerun(el) {
        let container = el;
        // Scroll up to the top
        const top = container.getBoundingClientRect().top + window.scrollY - 200;
        window.scrollTo({ top: top, behavior: 'smooth' });
        let output = container.querySelector('div.output');
        output.innerHTML = 'Regenerating...';
        setTimeout(() => {
            // Run it
            EmptyZ_UI.run(el);
        }, 300);
    }
}


/**
 * Boot up
 */
// List of generators, in case we have many on one page
var EmptyZ_Generators = {};

document.addEventListener('DOMContentLoaded', function() {
    // Loop over each container
    document.querySelectorAll('div.onedicesix-table').forEach(function(container) {
        EmptyZ_UI.setup(container);
    });
});
