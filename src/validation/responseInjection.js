// Response-injection dispatcher: simulates a Zoom Room driver receiving data
// on a port and running it through the port's response_filter chain.
//
// What's confirmed by reading ZRCS::OnDriverReceiveData in zChatUI.dll
// plus empirical testing on a real Zoom Room:
//   - Zoom uses MSVC `std::regex` with the default ECMAScript flavor.
//     JavaScript's RegExp implements the same dialect.
//   - **`std::regex_match` semantics, not `regex_search`.** The whole
//     input buffer must match the pattern; partial matches don't fire.
//     Test case that proved it: `a[\s\S]*b` does NOT fire on input
//     `12ab` even though `regex_search` would (and our earlier guess of
//     "regex_search" was wrong). To match a substring inside a larger
//     reply, wrap the pattern with `[\s\S]*` on both sides.
//   - Dispatch is **all-match, not first-match**. The function has nested
//     loops over (port filter names) × (global filters) and dispatches the
//     trigger_event of every matching filter; there is no break after a
//     successful match.
//   - **No capture-group passthrough.** The match call passes nullptr as
//     the match_results argument (the bool-only overload), so captured
//     substrings are discarded — only "matched yes/no" is used. Rules
//     fire by name; the matched text is not forwarded anywhere.
//   - **Incoming data is UTF-8-encoded before regex evaluation**
//     (cmm_str_convert with CP_UTF8). This matters for binary protocols:
//     a literal 0xAA byte on the wire becomes the two-byte UTF-8 sequence
//     0xC2 0xAA before regex sees it. ASCII-only protocols aren't affected.
//   - USB2Serial ports don't support filters at all (the binary explicitly
//     rejects them — caught by `runResponseFilterValidation` in the
//     validator).
//   - **No visible buffer accumulation** in either the per-protocol receive
//     hook (`ZRCSGenericNetworkAdapterDriver::OnReceiveData`) or the
//     dispatch loop. Regex evaluation appears to happen per-chunk: each
//     receive callback runs the filters over whatever bytes were delivered.
//     If a device fragments a reply across packets, each fragment is
//     regexed independently — a pattern that depends on seeing the whole
//     reply at once will be unreliable on slow / chatty connections.
//     The simulator mirrors this: the user types one buffer, we regex it
//     once.

// User-typed strings carry literal backslash escapes — turn `\r\n`, `\xAA`,
// `ª`, `\t`, etc. into the bytes a device would actually have sent.
// `\` followed by anything else passes through unchanged (so a literal `\d`
// stays `\d` and means the regex digit-class downstream, not a digit byte).
export function unescapeWireBytes(input) {
    if (typeof input !== 'string') return '';
    let out = '';
    let i = 0;
    while (i < input.length) {
        const ch = input[i];
        if (ch !== '\\' || i + 1 >= input.length) {
            out += ch;
            i++;
            continue;
        }
        const next = input[i + 1];
        if (next === 'r') { out += '\r'; i += 2; continue; }
        if (next === 'n') { out += '\n'; i += 2; continue; }
        if (next === 't') { out += '\t'; i += 2; continue; }
        if (next === '0') { out += '\0'; i += 2; continue; }
        if (next === '\\') { out += '\\'; i += 2; continue; }
        if (next === 'x' && i + 3 < input.length) {
            const hex = input.slice(i + 2, i + 4);
            if (/^[0-9a-fA-F]{2}$/.test(hex)) {
                out += String.fromCharCode(parseInt(hex, 16));
                i += 4;
                continue;
            }
        }
        if (next === 'u' && i + 5 < input.length) {
            const hex = input.slice(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                out += String.fromCharCode(parseInt(hex, 16));
                i += 6;
                continue;
            }
        }
        // Unknown escape — leave the backslash sequence alone for the regex.
        out += ch;
        i++;
    }
    return out;
}

// Render bytes back into a printable form for log entries. Mirrors
// unescapeWireBytes but in reverse, so a `\r\n` round-trips through both.
export function escapeWireBytes(bytes) {
    if (typeof bytes !== 'string') return '';
    let out = '';
    for (const ch of bytes) {
        const code = ch.charCodeAt(0);
        if (ch === '\r') out += '\\r';
        else if (ch === '\n') out += '\\n';
        else if (ch === '\t') out += '\\t';
        else if (ch === '\0') out += '\\0';
        else if (ch === '\\') out += '\\\\';
        else if (code < 0x20 || code === 0x7f) {
            out += '\\x' + code.toString(16).padStart(2, '0');
        } else if (code > 0x7e) {
            // Anything past plain ASCII — render as \uXXXX so the log line
            // doesn't smuggle in characters that confuse the user about what
            // bytes actually went into the regex.
            out += '\\u' + code.toString(16).padStart(4, '0').toUpperCase();
        } else {
            out += ch;
        }
    }
    return out;
}

// Compile a filter_regex. Returns { regex, error } — if the regex doesn't
// parse, regex is null and error is the message; the dispatcher records
// that as a warn-level log entry and skips that filter.
export function compileFilterRegex(pattern) {
    if (typeof pattern !== 'string' || pattern === '') {
        return { regex: null, error: 'empty pattern' };
    }
    try {
        // No flags: Zoom's std::regex defaults to ECMAScript with no
        // multiline / no caseInsensitive / no dotAll. Match that.
        return { regex: new RegExp(pattern), error: null };
    } catch (e) {
        return { regex: null, error: e.message };
    }
}

// Dispatch simulated data through every filter defined in the profile.
//
// NOTE on the simplification vs Zoom's actual behavior: at runtime Zoom
// only evaluates filters that have been opted into by the port that
// received the data (`port.response_filter` is a list of filter names).
// The simulator deliberately doesn't model that — it runs the input
// through ALL defined filters regardless of port wiring, because the
// development question is almost always "does my regex match this
// string?" not "is my port wired up correctly?". Port wiring problems
// are caught by the schema / runtime warnings instead.
//
//   {
//     bytes:   <decoded string actually fed to the regex>,
//     results: [
//       { name, matched: bool, match: RegExpMatchArray | null, error?: string },
//       ...
//     ],
//     firedEvents: [<trigger_event name>, ...]   // in iteration order
//   }
export function dispatchResponse(json, rawInput) {
    const bytes = unescapeWireBytes(rawInput);
    const filters = Array.isArray(json && json.response_filters)
        ? json.response_filters
        : [];
    const results = [];
    const firedEvents = [];
    for (const f of filters) {
        if (!f || typeof f !== 'object') continue;
        const name = typeof f.name === 'string' ? f.name : '(unnamed)';
        const { regex, error } = compileFilterRegex(f.filter_regex);
        if (error) {
            results.push({ name, matched: false, error: `regex compile failed: ${error}` });
            continue;
        }
        // regex_match semantics: pattern must cover the ENTIRE input.
        // JS's exec() gives us search semantics; we tighten it to match
        // semantics by requiring index 0 and full-length consumption.
        const m = regex.exec(bytes);
        const matched = !!(m && m.index === 0 && m[0].length === bytes.length);
        results.push({ name, matched, match: matched ? m : null });
        if (matched && f.trigger_event) {
            firedEvents.push(f.trigger_event);
        }
    }
    return { bytes, results, firedEvents };
}
