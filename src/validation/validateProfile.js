import Ajv from 'ajv';
import { schemaState } from './schemaLoader';

let cachedSchema = null;
let cachedValidator = null;

function getValidator() {
    if (cachedSchema === schemaState.schema && cachedValidator) {
        return cachedValidator;
    }
    const ajv = new Ajv({ allErrors: true, strict: false });
    cachedValidator = ajv.compile(schemaState.schema);
    cachedSchema = schemaState.schema;
    return cachedValidator;
}

function formatPath(instancePath) {
    return instancePath || '(root)';
}

// Translate a JSON pointer like "/adapters/0/ports/0/id" into something the
// user can locate in their profile: "GenericNetworkAdapter 192.168.1.10 /
// port 'cc_light' / id". Walks the parsed JSON in parallel so each numeric
// index can be replaced with the corresponding identifier; falls back to
// ordinal ("first port", "second port", …) when the item has no id/name yet,
// and to the raw segment when the JSON shape doesn't match what we'd expect
// (e.g. a broken profile where the path goes off the rails).
const ORDINALS = [
    'first', 'second', 'third', 'fourth', 'fifth',
    'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
];
function ordinal(n) {
    if (n < ORDINALS.length) return ORDINALS[n];
    return `#${n + 1}`;
}
function nameOrOrdinal(obj, idx, noun) {
    if (obj && typeof obj === 'object') {
        if (typeof obj.id === 'string' && obj.id) return `${noun} '${obj.id}'`;
        if (typeof obj.name === 'string' && obj.name) return `${noun} '${obj.name}'`;
    }
    return `${ordinal(idx)} ${noun}`;
}
function describeAdapter(adapter) {
    if (!adapter || typeof adapter !== 'object') return 'adapter';
    const model = adapter.model || 'adapter';
    const addr = adapter.ip || adapter.com || adapter.uuid || '';
    return addr ? `${model} ${addr}` : model;
}
function friendlyPath(instancePath, json) {
    if (!instancePath || instancePath === '(root)') return '(root)';
    const segs = instancePath.split('/').slice(1); // drop leading empty
    const out = [];
    let cur = json;
    for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        const next = segs[i + 1];
        const idx = next != null ? Number(next) : NaN;
        const numericNext = Number.isInteger(idx);

        if (seg === 'adapters' && numericNext && Array.isArray(cur && cur.adapters)) {
            const adapter = cur.adapters[idx];
            out.push(describeAdapter(adapter));
            cur = adapter;
            i++;
        } else if (seg === 'ports' && numericNext && Array.isArray(cur && cur.ports)) {
            const port = cur.ports[idx];
            out.push(nameOrOrdinal(port, idx, 'port'));
            cur = port;
            i++;
        } else if (seg === 'methods' && numericNext && Array.isArray(cur && cur.methods)) {
            const method = cur.methods[idx];
            out.push(nameOrOrdinal(method, idx, 'method'));
            cur = method;
            i++;
        } else if (seg === 'params' && numericNext && Array.isArray(cur && cur.params)) {
            const param = cur.params[idx];
            out.push(nameOrOrdinal(param, idx, 'param'));
            cur = param;
            i++;
        } else if (seg === 'scenes' && numericNext && Array.isArray(cur && cur.scenes)) {
            const scene = cur.scenes[idx];
            out.push(nameOrOrdinal(scene, idx, 'scene'));
            cur = scene;
            i++;
        } else if (seg === 'response_filters' && numericNext && Array.isArray(cur && cur.response_filters)) {
            const filter = cur.response_filters[idx];
            // response filters use `name` (not `id`) as their identifier.
            if (filter && typeof filter.name === 'string' && filter.name) {
                out.push(`response filter '${filter.name}'`);
            } else {
                out.push(`${ordinal(idx)} response filter`);
            }
            cur = filter;
            i++;
        } else if (seg === 'commands' && numericNext) {
            out.push(`command ${idx + 1}`);
            cur = Array.isArray(cur && cur.commands) ? cur.commands[idx] : undefined;
            i++;
        } else if (seg === 'rules' && next != null) {
            out.push(`rule '${next}'`);
            cur = cur && cur.rules ? cur.rules[next] : undefined;
            i++;
            // The next segment after a rule key is an index into the rule's
            // command array — translate that too.
            const cmdSeg = segs[i + 1];
            if (cmdSeg != null && Number.isInteger(Number(cmdSeg)) && Array.isArray(cur)) {
                out.push(`command ${Number(cmdSeg) + 1}`);
                cur = cur[Number(cmdSeg)];
                i++;
            }
        } else {
            // Leaf field name, or a segment we don't recognize. Keep it as-is
            // — it's still informative (e.g. 'settings', 'icon', 'id').
            out.push(seg);
            if (cur && typeof cur === 'object') cur = cur[seg];
        }
    }
    return out.join(' / ');
}

function definitionNameFromSchemaPath(schemaPath) {
    const m = /#\/definitions\/([^/]+)\//.exec(schemaPath || '');
    return m ? m[1] : null;
}

function formatSchemaError(err, json) {
    const path = friendlyPath(err.instancePath, json);
    switch (err.keyword) {
        case 'required':
            return `${path} is missing required field '${err.params.missingProperty}'`;
        case 'additionalProperties':
            return `${path} has unknown field '${err.params.additionalProperty}'`;
        case 'enum':
            return `${path} must be one of: ${err.params.allowedValues.join(', ')}`;
        case 'pattern': {
            const defName = definitionNameFromSchemaPath(err.schemaPath);
            return defName
                ? `${path} does not match the required format (${defName})`
                : `${path} does not match the required format`;
        }
        case 'type':
            return `${path} must be of type ${err.params.type}`;
        case 'minItems':
            return `${path} must have at least ${err.params.limit} item(s)`;
        case 'maxItems':
            return `${path} must have at most ${err.params.limit} item(s)`;
        case 'minimum':
            return `${path} must be >= ${err.params.limit}`;
        case 'maximum':
            return `${path} must be <= ${err.params.limit}`;
        case 'const':
            return `${path} must equal ${JSON.stringify(err.params.allowedValue)}`;
        case 'not':
            // The schema's only 'not' clause is the action+params conflict
            // (method-level allOf branch). Recognize it by the path shape.
            if (/\/methods\/\d+$/.test(err.instancePath || '')) {
                return `${path} has type 'action' but includes 'params'. Use type 'actions' when params are present, or remove 'params' for type 'action'.`;
            }
            return `${path} matched a disallowed pattern`;
        default:
            return `${path} ${err.message}`;
    }
}

function runSchemaValidation(json) {
    const validate = getValidator();
    const ok = validate(json);
    if (ok) return [];
    // Ajv emits a cascade of errors when if/then/anyOf branches fail. The first
    // concrete error is usually the most actionable; the rest are noise from
    // upstream conditional wrappers. Prefer non-'if'/'anyOf' errors when present.
    const errors = validate.errors || [];
    const informative = errors.filter(
        (e) => e.keyword !== 'if' && e.keyword !== 'anyOf' && e.keyword !== 'allOf'
    );
    const chosen = informative.length > 0 ? informative : errors;
    return chosen.map((err) => ({
        source: 'schema',
        path: friendlyPath(err.instancePath, json),
        message: formatSchemaError(err, json),
    }));
}

function findPortMethodParam(json, commandRef) {
    const [portId, methodId, paramId] = commandRef.split('.');
    let foundPort = null;
    let foundAdapter = null;
    if (json.adapters) {
        for (const adapter of json.adapters) {
            if (!adapter.ports) continue;
            const p = adapter.ports.find((pp) => pp.id === portId);
            if (p) {
                foundPort = p;
                foundAdapter = adapter;
                break;
            }
        }
    }
    if (!foundPort) return { error: `unknown port '${portId}'` };
    if (!methodId) return { port: foundPort };

    // iTachIP2CC ports get a 'power' method with on/off params auto-injected by
    // the transform pass. Cross-ref validation runs before that, so we have to
    // recognize the synthetic method here. Returns synthetic objects matching
    // what applyITachIP2CCMethods would produce, so transform's resolveScenes
    // (which also calls this) gets the same shape after methods are injected.
    if (foundAdapter.model === 'iTachIP2CC' && !foundPort.methods) {
        if (methodId !== 'power') {
            return {
                error: `unknown method '${methodId}' on port '${portId}' (iTachIP2CC ports only expose 'power')`,
            };
        }
        const syntheticMethod = { id: 'power', name: 'Power' };
        if (!paramId) return { port: foundPort, method: syntheticMethod };
        if (paramId !== 'on' && paramId !== 'off') {
            return {
                error: `unknown param '${paramId}' on method '${portId}.power' (iTachIP2CC only supports 'on'/'off')`,
            };
        }
        return {
            port: foundPort,
            method: syntheticMethod,
            param: {
                id: paramId,
                name: paramId === 'on' ? 'On' : 'Off',
                position: foundPort.position,
            },
        };
    }

    const method = (foundPort.methods || []).find((m) => m.id === methodId);
    if (!method) {
        return { error: `unknown method '${methodId}' on port '${portId}'` };
    }
    if (!paramId) return { port: foundPort, method };
    const param = (method.params || []).find((p) => p.id === paramId);
    if (!param) {
        return {
            error: `unknown param '${paramId}' on method '${portId}.${methodId}'`,
        };
    }
    return { port: foundPort, method, param };
}

function runCrossRefValidation(json) {
    const errors = [];

    if (Array.isArray(json.scenes)) {
        json.scenes.forEach((scene, i) => {
            if (!Array.isArray(scene.commands)) return;
            scene.commands.forEach((commandRef, j) => {
                const result = findPortMethodParam(json, commandRef);
                if (result.error) {
                    errors.push({
                        source: 'cross-ref',
                        path: friendlyPath(`/scenes/${i}/commands/${j}`, json),
                        message: `Scene '${scene.id}' references ${result.error} in command '${commandRef}'`,
                    });
                }
            });
        });
    }

    if (json.rules && typeof json.rules === 'object') {
        Object.entries(json.rules).forEach(([event, commands]) => {
            if (event === '$comment' || !Array.isArray(commands)) return;
            commands.forEach((commandRef, j) => {
                const result = findPortMethodParam(json, commandRef);
                if (result.error) {
                    errors.push({
                        source: 'cross-ref',
                        path: friendlyPath(`/rules/${event}/${j}`, json),
                        message: `Rule '${event}' references ${result.error} in command '${commandRef}'`,
                    });
                }
            });
        });
    }

    return errors;
}

// Walk the raw JSON text and report any object that has the same key more
// than once. `JSON.parse` collapses duplicates silently (last wins), so by
// the time we have the parsed object the duplicates are gone — the only
// place to spot them is in the source text. Returns [{ path, key }] per
// occurrence past the first.
function findDuplicateKeys(text) {
    const dups = [];
    const stack = []; // each item: { keys: Set, label: string }
    let i = 0;

    const skipWs = () => {
        while (i < text.length && /\s/.test(text[i])) i++;
    };

    const readString = () => {
        // text[i] === '"'
        const start = i;
        i++;
        while (i < text.length) {
            if (text[i] === '\\') {
                i += 2;
                continue;
            }
            if (text[i] === '"') break;
            i++;
        }
        const raw = text.slice(start, i + 1);
        i++; // past closing "
        try {
            return JSON.parse(raw);
        } catch {
            return '';
        }
    };

    const skipValue = () => {
        skipWs();
        if (i >= text.length) return;
        const ch = text[i];
        if (ch === '"') {
            readString();
            return;
        }
        if (ch === '{') {
            parseObject();
            return;
        }
        if (ch === '[') {
            parseArray();
            return;
        }
        while (i < text.length && !/[,}\]\s]/.test(text[i])) i++;
    };

    const currentPath = () =>
        stack
            .map((s) => s.label)
            .filter(Boolean)
            .join('/') || '(root)';

    const parseObject = () => {
        i++; // past {
        const ctx = {
            keys: new Set(),
            label: stack.length > 0 ? stack[stack.length - 1].lastKey : '',
        };
        stack.push(ctx);
        skipWs();
        while (i < text.length && text[i] !== '}') {
            skipWs();
            if (text[i] !== '"') break;
            const key = readString();
            if (ctx.keys.has(key)) {
                dups.push({ path: currentPath(), key });
            } else {
                ctx.keys.add(key);
            }
            ctx.lastKey = key;
            skipWs();
            if (text[i] === ':') i++;
            skipValue();
            skipWs();
            if (text[i] === ',') {
                i++;
                continue;
            }
        }
        if (text[i] === '}') i++;
        stack.pop();
    };

    const parseArray = () => {
        i++; // past [
        skipWs();
        while (i < text.length && text[i] !== ']') {
            skipValue();
            skipWs();
            if (text[i] === ',') {
                i++;
                continue;
            }
        }
        if (text[i] === ']') i++;
    };

    skipWs();
    if (text[i] === '{') parseObject();
    else if (text[i] === '[') parseArray();
    return dups;
}

// Walk the parsed profile and flag any place where an identifier is reused
// where it shouldn't be. Port ids are globally unique because the
// cross-reference resolver finds them by id across all adapters — two ports
// with the same id mean the second is unreachable. Methods are per-port,
// params are per-method, scenes share a global id space, and response filter
// names are referenced by port `response_filter` arrays.
function runUniqueIdValidation(json) {
    const errors = [];

    const flag = (path, message) =>
        errors.push({ source: 'duplicate-id', path, message });

    if (Array.isArray(json.adapters)) {
        // Port ids are global — cross-ref resolution finds the first match
        // across every adapter, so collisions anywhere strand the duplicates.
        const portSeen = new Map();
        json.adapters.forEach((adapter, ai) => {
            if (!adapter || !Array.isArray(adapter.ports)) return;
            adapter.ports.forEach((port, pi) => {
                if (!port || typeof port.id !== 'string') return;
                if (portSeen.has(port.id)) {
                    const first = portSeen.get(port.id);
                    flag(
                        friendlyPath(`/adapters/${ai}/ports/${pi}`, json),
                        `Port id "${port.id}" already defined at ${friendlyPath(`/adapters/${first.ai}/ports/${first.pi}`, json)}. Command references resolve to the first port — this one is unreachable.`
                    );
                } else {
                    portSeen.set(port.id, { ai, pi });
                }

                // Method ids per port
                if (!Array.isArray(port.methods)) return;
                const methodSeen = new Map();
                port.methods.forEach((method, mi) => {
                    if (!method || typeof method.id !== 'string') return;
                    if (methodSeen.has(method.id)) {
                        flag(
                            friendlyPath(`/adapters/${ai}/ports/${pi}/methods/${mi}`, json),
                            `Method id "${method.id}" already defined at ${friendlyPath(`/adapters/${ai}/ports/${pi}/methods/${methodSeen.get(method.id)}`, json)} on port "${port.id}".`
                        );
                    } else {
                        methodSeen.set(method.id, mi);
                    }

                    // Param ids per method
                    if (!Array.isArray(method.params)) return;
                    const paramSeen = new Map();
                    method.params.forEach((param, ppi) => {
                        if (!param || typeof param.id !== 'string') return;
                        if (paramSeen.has(param.id)) {
                            flag(
                                friendlyPath(`/adapters/${ai}/ports/${pi}/methods/${mi}/params/${ppi}`, json),
                                `Param id "${param.id}" already defined at ${friendlyPath(`/adapters/${ai}/ports/${pi}/methods/${mi}/params/${paramSeen.get(param.id)}`, json)} on method "${port.id}.${method.id}".`
                            );
                        } else {
                            paramSeen.set(param.id, ppi);
                        }
                    });
                });
            });
        });
    }

    if (Array.isArray(json.scenes)) {
        const seen = new Map();
        json.scenes.forEach((scene, si) => {
            if (!scene || typeof scene.id !== 'string') return;
            if (seen.has(scene.id)) {
                flag(
                    friendlyPath(`/scenes/${si}`, json),
                    `Scene id "${scene.id}" already defined at ${friendlyPath(`/scenes/${seen.get(scene.id)}`, json)}.`
                );
            } else {
                seen.set(scene.id, si);
            }
        });
    }

    if (Array.isArray(json.response_filters)) {
        const seen = new Map();
        json.response_filters.forEach((filter, fi) => {
            if (!filter || typeof filter.name !== 'string') return;
            if (seen.has(filter.name)) {
                flag(
                    friendlyPath(`/response_filters/${fi}`, json),
                    `Response filter name "${filter.name}" already defined at ${friendlyPath(`/response_filters/${seen.get(filter.name)}`, json)}. Port references resolve to the first one only.`
                );
            } else {
                seen.set(filter.name, fi);
            }
        });
    }

    return errors;
}

function runDuplicateKeyValidation(rawText) {
    if (typeof rawText !== 'string') return [];
    return findDuplicateKeys(rawText).map((d) => ({
        source: 'duplicate-key',
        path: '/' + d.path + (d.path === '(root)' ? d.key : '/' + d.key),
        message: `Duplicate key "${d.key}" in ${d.path}. JSON parsers collapse duplicates (later value wins) — remove one.`,
    }));
}

function runQuirkValidation(rawText, json) {
    const errors = [];

    // Zoom rejects profiles where an empty rule has any whitespace between the
    // brackets. "meeting_started": [] works; "[ ]" or "[\n]" fails to load even
    // though it's valid JSON. We can only catch this from the raw source text.
    if (json.rules && typeof json.rules === 'object') {
        Object.keys(json.rules).forEach((rule) => {
            if (rule === '$comment') return;
            if (Array.isArray(json.rules[rule]) && json.rules[rule].length === 0) {
                const re = new RegExp('"rules"(.|\\n)*"' + rule + '": \\[\\]');
                if (!re.test(rawText)) {
                    errors.push({
                        source: 'quirks',
                        path: friendlyPath(`/rules/${rule}`, json),
                        message:
                            "Empty rules must be truly empty (nothing between the square brackets [])",
                    });
                }
            }
        });
    }

    return errors;
}

export function validateProfile(rawText, json) {
    // Duplicate-key (text-scan) and duplicate-id (parsed-object scan)
    // warnings apply regardless of schema/cross-ref state — they happen at a
    // level the other validators can't see. Always include them.
    const alwaysErrors = [
        ...runDuplicateKeyValidation(rawText),
        ...runUniqueIdValidation(json),
    ];

    const schemaErrors = runSchemaValidation(json);
    if (schemaErrors.length > 0) {
        return { ok: false, errors: [...alwaysErrors, ...schemaErrors] };
    }

    const crossRefErrors = runCrossRefValidation(json);
    if (crossRefErrors.length > 0) {
        return { ok: false, errors: [...alwaysErrors, ...crossRefErrors] };
    }

    const quirkErrors = runQuirkValidation(rawText, json);
    if (quirkErrors.length > 0) {
        return { ok: false, errors: [...alwaysErrors, ...quirkErrors] };
    }

    if (alwaysErrors.length > 0) {
        return { ok: false, errors: alwaysErrors };
    }

    return { ok: true, errors: [] };
}

export { findPortMethodParam };
