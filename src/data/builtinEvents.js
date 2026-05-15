// Built-in Zoom Room events that fire rules. Synced from doc/zoom_events.csv
// (regenerate with the snippet at the bottom of this file when the CSV
// changes) and verified against UTF-16LE strings in zChatUI.dll.
//
// Two uses:
//   - The Rules section's event-name dropdown shows the friendly label
//     and category alongside the raw `zr_*` identifier.
//   - Validator: a `response_filter.trigger_event` that shadows one of
//     these is rejected by Zoom at profile-load time
//     (ZRCSParser::ParseResponseFilters: "trigger_event is same as
//     built-in rule"). Custom event names must be unique to the profile.
export const BUILTIN_EVENTS = [
    { id: "zr_meeting_started", label: "Meeting Started", category: "Meeting" },
    { id: "zr_meeting_ended", label: "Meeting Ended", category: "Meeting" },
    { id: "zr_zoom_meeting_started", label: "Meeting Started", category: "Meeting", note: "This command was added to differentiate between regular meetings and interop meetings, however, the meeting_started and meeting_ended commands are still supported." },
    { id: "zr_zoom_meeting_ended", label: "Meeting Ended", category: "Meeting", note: "This command was added to differentiate between regular meetings and interop meetings, however, the meeting_started and meeting_ended commands are still supported." },
    { id: "zr_interop_meeting_started", label: "Meeting Started", category: "Meeting" },
    { id: "zr_interop_meeting_ended", label: "Meeting Ended", category: "Meeting" },
    { id: "zr_meeting_ring_started", label: "Incoming Meeting Invite Start", category: "Meeting" },
    { id: "zr_meeting_ring_ended", label: "Incoming Meeting Invite End", category: "Meeting" },
    { id: "zr_meeting_item_about_to_start", label: "Next Meeting Alert Triggered", category: "Meeting" },
    { id: "zr_meeting_item_start", label: "Meeting List Item Start", category: "Meeting" },
    { id: "zr_meeting_item_stop", label: "Meeting List Item Stop", category: "Meeting" },
    { id: "zr_phone_ring_started", label: "Incoming Phone Call Start", category: "Phone", note: "Any type of phone interaction (Zoom Phone, Audio Plan, 3rd Party PBX) will trigger this command" },
    { id: "zr_phone_ring_ended", label: "Incoming Phone Call End", category: "Phone", note: "All phone ring types must be inactive to trigger this event" },
    { id: "zr_phone_call_started", label: "Phone Call Started", category: "Phone", note: "PSTN Invites within an active meeting will not trigger this event" },
    { id: "zr_phone_call_ended", label: "Phone Call Ended", category: "Phone" },
    { id: "zr_video_started", label: "Video On (Camera Mute Off)", category: "In-Meeting - Video" },
    { id: "zr_video_stopped", label: "Video Off (Camera Mute On)", category: "In-Meeting - Video" },
    { id: "zr_video_device_changed", label: "Selected Video Device Changed", category: "In-Meeting - Video", note: "Video device change event is only triggered when the main selected device changes. Multi-camera changes will not trigger this event." },
    { id: "zr_microphone_unmuted", label: "Mic On", category: "In-Meeting - Audio" },
    { id: "zr_microphone_muted", label: "Mic Off", category: "In-Meeting - Audio" },
    { id: "zr_audio_device_changed", label: "Selected Audio Device Changed", category: "In-Meeting - Audio", note: "Audio device change event is only triggered when the main selected device changes. Dante mic channel change will not trigger this event." },
    { id: "zr_share_started", label: "Wireless Sharing Started", category: "In-Meeting - Content", note: "Applies to direct share, whiteboard camera share, camera share, zoom apps sharing, and Apple Airplay (for multiple simultaneous shares, only the first command is sent). Digital Signage will not trigger these events." },
    { id: "zr_share_ended", label: "Wireless Sharing Ended", category: "In-Meeting - Content", note: "This command is sent when the last of multiple shares ends.\u00a0 Digital Signage will not trigger these events." },
    { id: "zr_hdmi_share_started", label: "HDMI Sharing Started", category: "In-Meeting - Content", note: "Digital Signage will not trigger these events." },
    { id: "zr_hdmi_share_ended", label: "HDMI Sharing Stopped", category: "In-Meeting - Content", note: "Digital Signage will not trigger these events." },
    { id: "zr_recording_started", label: "Recording Started", category: "In-Meeting - Recording" },
    { id: "zr_recording_ended", label: "Recording Stopped", category: "In-Meeting - Recording" },
    { id: "zr_elevate_to_meeting", label: "Meeting elevation", category: "Elevation", note: "This event triggers when a Zoom Room engaged in a telephony or screen-sharing session elevates the session to a video meeting." },
    { id: "zr_user_paired", label: "User Paired to ZR", category: "Pairing", note: "Each user will trigger a generalized pairing event." },
    { id: "zr_user_unpaired", label: "User Unpaired from ZR", category: "Pairing", note: "All users unpaired will trigger a generalized unpairing event." },
    { id: "zr_digital_signage_started", label: "Digital Signage Begins", category: "Digital Signage" },
    { id: "zr_digital_signage_ended", label: "Digital Signage is dismissed", category: "Digital Signage" },
    { id: "zr_whiteboard_started", label: "Whiteboarding opened", category: "Whiteboard", note: "Applies to Classic Whiteboard, New Whiteboard, and in-meeting whiteboards" },
    { id: "zr_whiteboard_ended", label: "Whiteboarding closed", category: "Whiteboard", note: "Applies to Classic Whiteboard, New Whiteboard, and in-meeting whiteboards" },
    { id: "zr_companion_whiteboard_connected", label: "Companion Whiteboard is added to the Zoom Room", category: "Whiteboard" },
    { id: "zr_companion_whiteboard_disconnected", label: "Companion Whiteboard is removed from the Zoom Room", category: "Whiteboard" },
    { id: "zr_operation_time_started", label: "Operation Time Begins", category: "Operation Time" },
    { id: "zr_operation_time_ended", label: "Operation Time Ends", category: "Operation Time" },
    { id: "zr_people_detected", label: "People Detected", category: "People Detection", note: "Only applicable to hardware layer people detection" },
    { id: "zr_people_not_detected", label: "No People Detected", category: "People Detection", note: "Only applicable to hardware layer people detection" },
    { id: "zr_voice_command_on", label: "Voice Commands are enabled", category: "Voice Commands" },
    { id: "zr_voice_command_off", label: "Voice Commands are disabled", category: "Voice Commands" },
    { id: "zr_zoom_app_opened", label: "Zoom App is opened", category: "Zoom Apps", note: "Opening any app will trigger this event, even if an app is already open in the meeting." },
    { id: "zr_zoom_app_closed", label: "Zoom App is closed", category: "Zoom Apps", note: "Closing any app will trigger this event, even if another app is still active in the meeting." },
    { id: "zr_room_controls_opened", label: "Room Controls is Opened", category: "Admin" },
    { id: "zr_room_controls_closed", label: "Room Controls is Closed", category: "Admin" },
    { id: "zr_room_startup_completed", label: "Zoom Rooms Startup Completed", category: "Admin", note: "Zoom Room startup, login, and Room Controls loading completed" },
];

export const BUILTIN_EVENT_SET = new Set(BUILTIN_EVENTS.map((e) => e.id));

// Lookup by id → entry; used by the rules dropdown to show the label /
// category / note in tooltips.
export const BUILTIN_EVENT_BY_ID = new Map(BUILTIN_EVENTS.map((e) => [e.id, e]));

// Built-in events grouped by category, in original CSV order. Used by the
// dropdown to render <optgroup> sections.
export const BUILTIN_EVENTS_BY_CATEGORY = (() => {
    const out = [];
    const seen = new Map();
    for (const e of BUILTIN_EVENTS) {
        if (!seen.has(e.category)) {
            const bucket = { category: e.category, events: [] };
            seen.set(e.category, bucket);
            out.push(bucket);
        }
        seen.get(e.category).events.push(e);
    }
    return out;
})();

// To regenerate this file from doc/zoom_events.csv, run the Python script
// in scripts/regen-builtin-events.py (or copy the equivalent from the
// commit that originally wrote this).
