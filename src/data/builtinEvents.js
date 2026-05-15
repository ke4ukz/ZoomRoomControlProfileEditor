// Built-in Zoom Room events that fire rules. Synced from doc/zoom_events.csv
// and verified against UTF-16LE strings in the Zoom Rooms binary (zChatUI.dll
// and friends — every entry below shows up as an actual wide-char identifier
// inside the installer's DLLs).
//
// Two uses:
//   - Auto-complete / friendly labels in the events palette UI
//   - Validator: a `response_filter.trigger_event` that shadows one of these
//     is rejected by Zoom at profile-load time
//     (ZRCSParser::ParseResponseFilters: "trigger_event is same as built-in
//     rule"). The custom event must be a NEW name, not a Zoom-reserved one.
export const BUILTIN_EVENTS = [
    'zr_audio_device_changed',
    'zr_companion_whiteboard_connected',
    'zr_companion_whiteboard_disconnected',
    'zr_digital_signage_ended',
    'zr_digital_signage_started',
    'zr_elevate_to_meeting',
    'zr_hdmi_share_ended',
    'zr_hdmi_share_started',
    'zr_interop_meeting_ended',
    'zr_interop_meeting_started',
    'zr_meeting_ended',
    'zr_meeting_item_about_to_start',
    'zr_meeting_item_start',
    'zr_meeting_item_stop',
    'zr_meeting_ring_ended',
    'zr_meeting_ring_started',
    'zr_meeting_started',
    'zr_microphone_muted',
    'zr_microphone_unmuted',
    'zr_operation_time_ended',
    'zr_operation_time_started',
    'zr_people_detected',
    'zr_people_not_detected',
    'zr_phone_call_ended',
    'zr_phone_call_started',
    'zr_phone_ring_ended',
    'zr_phone_ring_started',
    'zr_recording_ended',
    'zr_recording_started',
    'zr_room_controls_closed',
    'zr_room_controls_opened',
    'zr_room_startup_completed',
    'zr_share_ended',
    'zr_share_started',
    'zr_user_paired',
    'zr_user_unpaired',
    'zr_video_device_changed',
    'zr_video_started',
    'zr_video_stopped',
    'zr_voice_command_off',
    'zr_voice_command_on',
    'zr_whiteboard_ended',
    'zr_whiteboard_started',
    'zr_zoom_app_closed',
    'zr_zoom_app_opened',
    'zr_zoom_meeting_ended',
    'zr_zoom_meeting_started',
];

export const BUILTIN_EVENT_SET = new Set(BUILTIN_EVENTS);
