#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function printHelp() {
    console.log(`
One Dice Six CLI Generator

Usage:
  npx generate-cli.js <generator-file> [options]
  node generate-cli.js <generator-file> [options]

Examples:
  node generate-cli.js generators/wb-oracle.txt --estimation likely
  node generate-cli.js generators/mine.txt
  node generate-cli.js generators/encounters.txt --count 3
  node generate-cli.js generators/death.txt --level 2 --con 1 --hp -2

Options:
  -c, --count <n>          Repeat count (default: 1)
  -e, --estimation <val>   Wight-Box Oracle estimation (impossible, very-unlikely, unlikely, middling, likely, very-likely, certain)
  -l, --level <n>          Level (for spells, death, etc.)
  --con <n>                Constitution modifier (-3 to +3)
  --hp <n>                 Current hit points (for death)
  --location <name>        Encounter location table name
  --segment-count <n>      Underdark tunnel segments
  --tunnel-type <type>     Underdark tunnel type (dry or wet)
  --max-length <n>         Underdark tunnel max length
  --adjustment <n>         Reaction adjustment (-6 to +6)
  --type <str>             Treasure type (for BFRPG treasure)
  --hd <n>                 Dragon HD (for BFRPG treasure)
  --html                   Output raw HTML instead of plain text
  -h, --help               Show this help message
`);
}

function parseArgs() {
    const args = process.argv.slice(2);
    let generatorFile = '';
    const options = {
        count: '1',
        estimation: 'likely',
        level: '1',
        con: '0',
        hp: '0',
        location: '',
        segmentCount: '1',
        tunnelType: 'dry',
        maxLength: '0',
        adjustment: '0',
        type: '',
        hd: '6',
        html: false,
        help: false,
        diseased: false,
        lowhp: false,
        crowded: false,
        filthy: false,
        old: false,
        venerable: false,
        jungle: false,
        hot: false,
        exposed: false,
        cool: false,
        cold: false,
        shipboard: false,
        meat: false,
        water: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--html') {
            options.html = true;
        } else if (arg.startsWith('--')) {
            const flagName = arg.slice(2);
            const camelKey = flagName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const next = args[i + 1];
            if (next && !next.startsWith('--')) {
                options[camelKey] = next;
                i++;
            } else {
                options[camelKey] = true;
            }
        } else if (arg.startsWith('-')) {
            const flag = arg.slice(1);
            const next = args[i + 1];
            if (flag === 'c' && next) { options.count = next; i++; }
            else if (flag === 'e' && next) { options.estimation = next; i++; }
            else if (flag === 'l' && next) { options.level = next; i++; }
            else if (flag === 'h') { options.help = true; }
        } else if (!generatorFile) {
            generatorFile = arg;
        }
    }

    return { generatorFile, options };
}

function htmlToPlainText(html) {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
}

function main() {
    const { generatorFile, options } = parseArgs();

    // Print help if --help or no generator txt file
    if (options.help || !generatorFile) {
        printHelp();
        process.exit(0);
    }

    // Script should be in bin folder. Set paraent.
    const rootPath = path.join(__dirname, '../');

    // Find the generator path by absolute or inside generators folder
    let filePath = generatorFile;
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, generatorFile);
    }
    if (!fs.existsSync(filePath)) {
        filePath = path.join(rootPath, 'generators', path.basename(generatorFile));
    }
    if (!fs.existsSync(filePath)) {
        console.error(`Error: Generator file not found: ${generatorFile}`);
        process.exit(1);
    }

    // Load in the generator.js classes as if they are node modules
    const tableID = path.basename(filePath);
    const generatorCode = fs.readFileSync(path.join(rootPath, 'generator.js'), 'utf8');
    const fullCode = generatorCode + '\nmodule.exports = { OneDiceSix_Generator, OneDiceSix_Table, OneDiceSix_Generators, OneDiceSix_UI_WbOracle, OneDiceSix_UI_Reaction, OneDiceSix_UI_Death, OneDiceSix_UI_ClericSpells, OneDiceSix_UI_MageSpellbook, OneDiceSix_UI_Encounters, OneDiceSix_UI_1eDmgDisease, OneDiceSix_UI_UnderdarkTunnels, OneDiceSix_UI_BfrpgTreasure, OneDiceSix_UI };\n';

    // Build up a mock browser DOM
    const sandbox = {
        document: {
            addEventListener: () => {},
            querySelectorAll: () => [],
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                className: '',
                name: '',
                value: '',
                appendChild(child) {
                    this.children = this.children || [];
                    this.children.push(child);
                },
                setAttribute(k, v) { this[k] = v; },
                querySelector() { return null; },
                querySelectorAll() { return []; },
                insertAdjacentHTML(pos, html) { this.innerHTML = (this.innerHTML || '') + html; },
                innerHTML: ''
            })
        },
        window: { scrollY: 0, scrollTo: () => {} },
        onedicesix: { url: path.join(__dirname, 'generators') + path.sep },
        console, Math, Array, Map, Set, parseInt, parseFloat, isNaN, Number,
        setTimeout, clearTimeout
    };
    sandbox.global = sandbox;
    sandbox.module = { exports: {} };
    sandbox.exports = sandbox.module.exports;

    vm.createContext(sandbox);
    vm.runInContext(fullCode, sandbox);

    const lib = sandbox.module.exports;
    const fileData = fs.readFileSync(filePath, 'utf8');
    const generator = lib.OneDiceSix_Generator.import(fileData);
    lib.OneDiceSix_Generators[tableID] = generator;

    class MockOutput {
        constructor() {
            this.innerHTML = '';
        }
        insertAdjacentHTML(pos, html) {
            this.innerHTML += html;
        }
    }

    class MockContainer {
        constructor(id) {
            this.id = id;
            this.attrs = { 'data-table-id': id };
            this.output = new MockOutput();
            this.children = [];
        }
        getAttribute(name) { return this.attrs[name]; }
        insertAdjacentHTML(pos, html) {}
        appendChild(child) { this.children.push(child); }
        querySelector(sel) {
            if (sel === 'div.output') {
                return this.output;
            }
            if (sel.includes('select[name="estimation"]')) {
                return { value: options.estimation };
            }
            if (sel.includes('select[name="level"]') || sel.includes('input[name="level"]')) {
                return { value: options.level };
            }
            if (sel.includes('input[name="con"]')) {
                return { value: options.con };
            }
            if (sel.includes('input[name="hp"]')) {
                return { value: options.hp };
            }
            if (sel.includes('select[name="location"]')) {
                let loc = options.location;
                if (!loc) {
                    for (let t in generator.tables) {
                        if (generator.tables[t].label) {
                            loc = generator.tables[t].name;
                            break;
                        }
                    }
                }
                return { value: loc || Object.keys(generator.tables)[0] };
            }
            if (sel.includes('input[name="count"]')) {
                return { value: options.count };
            }
            if (sel.includes('input[name="segment-count"]')) {
                return { value: options.segmentCount };
            }
            if (sel.includes('select[name="tunnel-type"]')) {
                return { value: options.tunnelType };
            }
            if (sel.includes('input[name="max-length"]')) {
                return { value: options.maxLength };
            }
            if (sel.includes('input[name="adjustment"]')) {
                return { value: options.adjustment };
            }
            if (sel.includes('input[name="type"]')) {
                return { value: options.type };
            }
            if (sel.includes('input[name="hd"]')) {
                return { value: options.hd };
            }
            const matchChk = sel.match(/input\[name="([a-z]+)"\](?::checked)?/);
            if (matchChk) {
                const chkName = matchChk[1];
                return { checked: !!options[chkName] };
            }
            return null;
        }
    }

    const container = new MockContainer(tableID);
    container.children.push(container.output);

    lib.OneDiceSix_UI_1eDmgDisease.runCount = 1;
    lib.OneDiceSix_UI_ClericSpells.runCount = 1;
    lib.OneDiceSix_UI_Death.runCount = 1;
    lib.OneDiceSix_UI_Encounters.runCount = 1;
    lib.OneDiceSix_UI_MageSpellbook.runCount = 1;
    lib.OneDiceSix_UI_UnderdarkTunnels.runCount = 1;
    lib.OneDiceSix_UI_BfrpgTreasure.runCount = 1;
    lib.OneDiceSix_UI_WbOracle.runCount = 1;

    if (options.count && options.count !== '1') {
        generator.repeat = options.count;
    }

    generator.counters = new Map();

    switch(tableID) {
        case '1e-dmg-disease.txt':
            lib.OneDiceSix_UI_1eDmgDisease.run(container);
            break;
        case 'cleric-spells.txt':
            lib.OneDiceSix_UI_ClericSpells.run(container);
            break;
        case 'death.txt':
            lib.OneDiceSix_UI_Death.run(container);
            break;
        case 'encounters.txt':
            lib.OneDiceSix_UI_Encounters.run(container);
            break;
        case 'mage-spells.txt':
            lib.OneDiceSix_UI_MageSpellbook.run(container);
            break;
        case 'underdark-tunnels.txt':
            lib.OneDiceSix_UI_UnderdarkTunnels.run(container);
            break;
        case 'reaction.txt':
            lib.OneDiceSix_UI_Reaction.run(container);
            break;
        case 'bfrpg-treasure.txt':
            lib.OneDiceSix_UI_BfrpgTreasure.run(container);
            break;
        case 'wb-oracle.txt':
            lib.OneDiceSix_UI_WbOracle.run(container);
            break;
        default:
            container.output.insertAdjacentHTML('beforeend', generator.run());
    }

    const rawOutput = container.output.innerHTML;
    if (options.html) {
        console.log(rawOutput);
    } else {
        console.log(htmlToPlainText(rawOutput));
    }
}

main();
