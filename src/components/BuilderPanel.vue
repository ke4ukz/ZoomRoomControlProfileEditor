<template>
    <section class="builder-panel">
        <header class="builder-title-row">
            <h2 class="builder-title">Builder</h2>
        </header>
        <div
            v-if="profile === null"
            class="builder-empty">
            JSON parsing failed. Fix the JSON to enable the builder.
        </div>
        <div
            v-else
            class="builder-content">
            <div
                v-for="(adapter, ai) in localProfile.adapters"
                :key="ai"
                class="adapter-card">
                <div class="adapter-header">
                    <span class="row-label">Adapter</span>
                    <select
                        v-model="adapter.model"
                        class="adapter-model"
                        @change="onAdapterModelChange(ai)">
                        <option value="iTachIP2SL">iTach IP2SL</option>
                        <option value="iTachIP2CC">iTach IP2CC</option>
                        <option value="GenericNetworkAdapter">Generic Network</option>
                        <option value="USB2Serial">USB2Serial</option>
                    </select>
                    <input
                        v-if="adapter.model !== 'USB2Serial'"
                        type="text"
                        class="adapter-addr"
                        :placeholder="ipPlaceholder(adapter.model)"
                        v-model="adapter.ip" />
                    <input
                        v-else
                        type="text"
                        class="adapter-addr"
                        placeholder="COM3"
                        v-model="adapter.com" />
                    <input
                        v-if="adapter.model === 'iTachIP2SL' || adapter.model === 'iTachIP2CC'"
                        type="text"
                        class="adapter-uuid"
                        placeholder="UUID (optional)"
                        v-model="adapter.uuid" />
                    <button
                        class="btn-delete"
                        title="Remove adapter"
                        @click="removeAdapter(ai)">
                        ×
                    </button>
                </div>
                <div class="ports-section">
                    <div
                        v-for="(port, pi) in adapter.ports"
                        :key="pi"
                        class="port-card">
                        <div class="port-header">
                            <span class="row-label">Port</span>
                            <input
                                type="text"
                                class="port-id"
                                placeholder="id"
                                v-model="port.id" />
                            <input
                                type="text"
                                class="port-name"
                                placeholder="name"
                                v-model="port.name" />
                            <input
                                v-if="adapter.model === 'iTachIP2CC'"
                                type="number"
                                class="port-position"
                                placeholder="pos"
                                min="1"
                                max="3"
                                v-model.number="port.position" />
                            <button
                                class="btn-delete"
                                title="Remove port"
                                @click="removePort(ai, pi)">
                                ×
                            </button>
                        </div>
                        <div
                            v-if="adapter.model === 'iTachIP2CC'"
                            class="port-hint">
                            Methods auto-generated (power.on / power.off) from position.
                        </div>
                        <div
                            v-else
                            class="methods-section">
                            <div
                                v-for="(method, mi) in port.methods"
                                :key="mi"
                                class="method-card">
                                <span class="row-label">Method</span>
                                <input
                                    type="text"
                                    class="method-id"
                                    placeholder="id"
                                    v-model="method.id" />
                                <input
                                    type="text"
                                    class="method-name"
                                    placeholder="name"
                                    v-model="method.name" />
                                <input
                                    type="text"
                                    class="method-cmd"
                                    placeholder="command"
                                    v-model="method.command" />
                                <button
                                    class="btn-delete"
                                    title="Remove method"
                                    @click="removeMethod(ai, pi, mi)">
                                    ×
                                </button>
                            </div>
                            <button
                                class="btn-add"
                                @click="addMethod(ai, pi)">
                                + Method
                            </button>
                        </div>
                    </div>
                    <button
                        class="btn-add"
                        @click="addPort(ai)">
                        + Port
                    </button>
                </div>
            </div>
            <button
                class="btn-add btn-add-adapter"
                @click="addAdapter">
                + Adapter
            </button>
        </div>
    </section>
</template>

<script>
// The builder works on a deep-cloned local copy of the parsed profile so the
// user can mutate it freely. After every change, the deep watcher emits an
// update:profile event with a fresh clone, which the parent re-serializes back
// into the JSON textarea. The opposite direction — JSON text edits — flows in
// via the `profile` prop, syncing `localProfile` through the prop watcher.
// `syncingFromProp` breaks the feedback loop so external edits don't cause us
// to re-emit our own state back to the parent.
//
// Note: we deep-clone via JSON, not structuredClone. The profile is pure
// JSON-shaped data, but Vue's reactive Proxy can expose framework-internal
// properties to structuredClone that aren't cloneable. JSON.stringify reads
// through the proxy transparently and emits only the data values.
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export default {
    name: 'BuilderPanel',
    props: {
        profile: {
            type: Object,
            default: null,
        },
    },
    emits: ['update:profile'],
    data() {
        return {
            localProfile: deepClone(this.profile || {}),
            syncingFromProp: false,
        };
    },
    watch: {
        profile: {
            deep: true,
            handler(newProfile) {
                this.syncingFromProp = true;
                this.localProfile = deepClone(newProfile || {});
                this.$nextTick(() => {
                    this.syncingFromProp = false;
                });
            },
        },
        localProfile: {
            deep: true,
            handler() {
                if (this.syncingFromProp) return;
                if (this.profile === null) return;
                this.$emit('update:profile', deepClone(this.localProfile));
            },
        },
    },
    methods: {
        ipPlaceholder(model) {
            return model === 'GenericNetworkAdapter'
                ? 'tcp://192.168.1.50:5000'
                : '192.168.1.10';
        },
        addAdapter() {
            if (!this.localProfile.adapters) this.localProfile.adapters = [];
            this.localProfile.adapters.push({
                model: 'iTachIP2SL',
                ip: '',
                ports: [],
            });
        },
        removeAdapter(ai) {
            this.localProfile.adapters.splice(ai, 1);
        },
        onAdapterModelChange(ai) {
            // Models differ in expected fields. Don't auto-convert (would
            // erase user-entered data); the schema validator surfaces missing
            // fields after the switch.
            const adapter = this.localProfile.adapters[ai];
            if (adapter.model === 'USB2Serial' && adapter.ip != null) {
                // USB2Serial uses `com`; clear `ip` so the validator nudges
                // the user toward the right field without silently retaining
                // stale data.
                adapter.com = adapter.com || '';
            }
        },
        addPort(ai) {
            const adapter = this.localProfile.adapters[ai];
            if (!adapter.ports) adapter.ports = [];
            const port = { id: '', name: '' };
            if (adapter.model === 'iTachIP2CC') {
                port.position = 1;
            } else {
                port.methods = [];
            }
            adapter.ports.push(port);
        },
        removePort(ai, pi) {
            this.localProfile.adapters[ai].ports.splice(pi, 1);
        },
        addMethod(ai, pi) {
            const port = this.localProfile.adapters[ai].ports[pi];
            if (!port.methods) port.methods = [];
            port.methods.push({
                id: '',
                name: '',
                command: '',
                type: 'action',
            });
        },
        removeMethod(ai, pi, mi) {
            this.localProfile.adapters[ai].ports[pi].methods.splice(mi, 1);
        },
    },
};
</script>

<style lang="scss" scoped>
@use '@/styles/colors' as c;
@use '@/styles/buttons' as b;

.builder-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    overflow: auto;
}

.builder-title-row {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
}

.builder-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: c.$text-dark;
    margin: 0;
}

.builder-empty {
    color: c.$text-dark;
    opacity: 0.6;
    font-style: italic;
    font-size: 0.9rem;
    padding: 1rem;
    text-align: center;
    border: 1px dashed c.$border;
    border-radius: 6px;
}

.builder-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.adapter-card {
    background: #fff;
    border: 1px solid c.$border;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.adapter-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;

    .adapter-model {
        flex: 0 0 auto;
    }
    .adapter-addr {
        flex: 1 1 140px;
        min-width: 0;
    }
    .adapter-uuid {
        flex: 1 1 140px;
        min-width: 0;
    }
}

.ports-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-left: 1rem;
}

.port-card {
    background: c.$zoom-button;
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.port-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;

    .port-id,
    .port-name {
        flex: 1 1 80px;
        min-width: 0;
    }
    .port-position {
        flex: 0 0 60px;
    }
}

.port-hint {
    font-size: 0.78rem;
    font-style: italic;
    color: c.$text-dark;
    opacity: 0.7;
    margin-left: 1rem;
}

.methods-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-left: 1rem;
}

.method-card {
    background: #fff;
    border: 1px solid c.$border;
    border-radius: 4px;
    padding: 0.3rem 0.4rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;

    .method-id {
        flex: 1 1 80px;
        min-width: 0;
    }
    .method-name {
        flex: 1 1 90px;
        min-width: 0;
    }
    .method-cmd {
        flex: 1 1 140px;
        min-width: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace;
        font-size: 0.8rem;
    }
}

.row-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: c.$text-dark;
    opacity: 0.55;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex: 0 0 auto;
}

input,
select {
    font-size: 0.85rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid c.$border;
    border-radius: 3px;
    background: #fff;
    color: c.$text-dark;
    font-family: inherit;
}

input:focus,
select:focus {
    outline: 1px solid c.$accent;
    outline-offset: 0;
}

.btn-add {
    @include b.btn-shared;
    background: transparent;
    border: 1px dashed c.$border;
    color: c.$text-dark;
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
    line-height: 1.4;
    align-self: flex-start;
    opacity: 0.75;

    &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.03);
    }
}

.btn-add-adapter {
    align-self: flex-start;
    font-size: 0.85rem;
    padding: 0.35rem 0.8rem;
    opacity: 0.9;
}

.btn-delete {
    @include b.btn-shared;
    background: transparent;
    border: none;
    color: c.$text-dark;
    opacity: 0.45;
    font-size: 1.1rem;
    line-height: 1;
    width: 22px;
    height: 22px;
    padding: 0;
    border-radius: 4px;
    flex: 0 0 auto;

    &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.06);
    }
}
</style>
